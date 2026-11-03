import { NextResponse } from "next/server";
import {
  requireProjectPermission,
  membershipHasPermission,
} from "@/lib/authorization";
import {
  createMembership,
  updateMembership,
  findMembership,
  newId,
  appendAuditEntry,
  listMembershipsForProject,
  type ProjectMembership,
  type ProjectRole,
  type MembershipStatus,
} from "@/lib/projects/store";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { PROJECT_ROLES } from "@/lib/projects/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  await requireProjectPermission(projectId, "manage_members");

  const memberships = await listMembershipsForProject(projectId);
  return NextResponse.json({ memberships });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const actingUser = await requireAuthenticatedUser();
  const membership = await requireProjectPermission(projectId, "manage_members");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  const { userId, role } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof userId !== "string" || userId.length === 0) {
    errors.userId = "A user id is required.";
  }

  if (typeof role !== "string" || !PROJECT_ROLES.includes(role as ProjectRole)) {
    errors.role = "A valid role is required.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const targetRole = role as ProjectRole;
  if (targetRole === "OWNER") {
    return NextResponse.json(
      { error: "You cannot assign the owner role through this endpoint." },
      { status: 422 },
    );
  }

  const existing = await findMembership(userId as string, projectId);
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json(
      { error: "That user is already an active member of this project." },
      { status: 409 },
    );
  }

  let createdMembership: ProjectMembership;
  if (existing && existing.status !== "ACTIVE") {
    const updated: ProjectMembership = {
      ...existing,
      role: targetRole,
      status: "ACTIVE" as MembershipStatus,
      updatedAt: new Date().toISOString(),
    };
    await updateMembership(updated);
    createdMembership = updated;
    await appendAuditEntry({
      id: newId(),
      projectId,
      userId: actingUser.id,
      action: "membership_restored",
      details: `Membership restored for user ${userId} as ${targetRole}`,
      createdAt: new Date().toISOString(),
    });
  } else {
    createdMembership = {
      id: newId(),
      userId: userId as string,
      projectId,
      role: targetRole,
      status: "ACTIVE" as MembershipStatus,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createMembership(createdMembership);
    await appendAuditEntry({
      id: newId(),
      projectId,
      userId: actingUser.id,
      action: "membership_created",
      details: `Added user ${userId} as ${targetRole}`,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ membership: createdMembership }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const actingUser = await requireAuthenticatedUser();
  const membership = await requireProjectPermission(projectId, "manage_members");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  const { targetUserId, newRole } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    errors.targetUserId = "The target user id is required.";
  }

  if (typeof newRole !== "string" || !PROJECT_ROLES.includes(newRole as ProjectRole)) {
    errors.newRole = "A valid role is required.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const targetRole = newRole as ProjectRole;
  if (targetRole === "OWNER") {
    return NextResponse.json(
      { error: "You cannot assign the owner role through this endpoint." },
      { status: 422 },
    );
  }

  const targetMembership = await findMembership(targetUserId as string, projectId);
  if (!targetMembership) {
    return NextResponse.json(
      { error: "That user is not a member of this project." },
      { status: 404 },
    );
  }

  if (targetMembership.userId === actingUser.id) {
    return NextResponse.json(
      { error: "You cannot change your own role through this endpoint." },
      { status: 422 },
    );
  }

  const updated: ProjectMembership = {
    ...targetMembership,
    role: targetRole,
    updatedAt: new Date().toISOString(),
  };
  await updateMembership(updated);
  await appendAuditEntry({
    id: newId(),
    projectId,
    userId: actingUser.id,
    action: "role_changed",
    details: `Changed role for user ${targetUserId} from ${targetMembership.role} to ${targetRole}`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ membership: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const actingUser = await requireAuthenticatedUser();
  const membership = await requireProjectPermission(projectId, "manage_members");

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json(
      { error: "A target user id is required." },
      { status: 400 },
    );
  }

  if (targetUserId === actingUser.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself through this endpoint." },
      { status: 422 },
    );
  }

  const targetMembership = await findMembership(targetUserId, projectId);
  if (!targetMembership) {
    return NextResponse.json(
      { error: "That user is not an active member of this project." },
      { status: 404 },
    );
  }

  const removed: ProjectMembership = {
    ...targetMembership,
    status: "REMOVED" as MembershipStatus,
    updatedAt: new Date().toISOString(),
  };
  await updateMembership(removed);
  await appendAuditEntry({
    id: newId(),
    projectId,
    userId: actingUser.id,
    action: "member_removed",
    details: `Removed user ${targetUserId} from the project`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ membership: removed });
}
