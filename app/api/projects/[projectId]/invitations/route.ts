import { NextResponse } from "next/server";
import { requireProjectPermission } from "@/lib/authorization";
import {
  createInvitation as createInvitationRecord,
  listInvitations,
  findInvitationByToken,
  updateInvitation,
  appendAuditEntry,
  newId,
  listMembershipsForProject,
  type ProjectRole,
  type Invitation,
} from "@/lib/projects/store";
import {
  membershipHasPermission,
  createInvitation,
} from "@/lib/authorization";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { PROJECT_ROLES } from "@/lib/projects/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  await requireProjectPermission(projectId, "manage_members");

  const invitations = await listInvitations();
  const projectInvitations = invitations
    .filter((i) => i.projectId === projectId)
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    }));

  return NextResponse.json({ invitations: projectInvitations });
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

  const { email, role } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (typeof role !== "string" || !PROJECT_ROLES.includes(role as ProjectRole)) {
    errors.role = "A valid role is required.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  try {
    const token = await createInvitation(
      projectId,
      { id: actingUser.id, email: actingUser.email },
      email as string,
      role as ProjectRole,
    );
    return NextResponse.json(
      { token, message: "Invitation created. Share the link with the recipient." },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const actingUser = await requireAuthenticatedUser();
  const membership = await requireProjectPermission(projectId, "manage_members");

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "A token is required." },
      { status: 400 },
    );
  }

  const revoked = await revokeInvitationInProject(
    projectId,
    { id: actingUser.id },
    token,
  );
  if (!revoked) {
    return NextResponse.json(
      { error: "That invitation could not be revoked." },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "Invitation revoked." });
}

async function revokeInvitationInProject(
  projectId: string,
  inviterUser: { id: string },
  token: string,
): Promise<boolean> {
  const memberships = await listMembershipsForProject(projectId);
  const inviter = memberships.find((m) => m.userId === inviterUser.id);
  if (!inviter || !membershipHasPermission(inviter, "manage_members")) {
    return false;
  }

  const invitations = await listInvitations();
  const invitation = invitations.find(
    (i: Invitation) =>
      i.token === token &&
      i.projectId === projectId &&
      i.status === "PENDING",
  );
  if (!invitation) return false;

  await updateInvitation({ ...invitation, status: "REVOKED" });
  await appendAuditEntry({
    id: newId(),
    projectId,
    userId: inviterUser.id,
    action: "invitation_revoked",
    details: `Revoked invitation ${invitation.id}`,
    createdAt: new Date().toISOString(),
  });
  return true;
}
