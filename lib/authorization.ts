import { redirect } from "next/navigation";
import {
  findMembership,
  findInvitationByToken,
  getProject,
  listMembershipsForProject,
  appendAuditEntry,
  newId,
  createMembership,
  updateInvitation,
  listInvitations,
  createInvitation as createInvitationRecord,
  createPasswordReset as createPasswordResetRecord,
  consumePasswordReset as consumePasswordResetRecord,
  updateMembership as updateMembershipRecord,
  type ProjectMembership,
  type ProjectRole,
} from "@/lib/projects/store";
import type {
  Invitation as InvitationType,
} from "@/lib/projects/types";

type Invitation = InvitationType;

import { checkInvitationRateLimiter, recordInvitationAttempt } from "@/lib/projects/limiter";

type AuthPermission =
  | "view_project"
  | "edit_project"
  | "manage_members"
  | "create_tasks"
  | "edit_tasks"
  | "view_budget"
  | "edit_budget"
  | "approve_expenses"
  | "submit_reports"
  | "view_documents"
  | "upload_documents"
  | "submit_quotations"
  | "view_approvals"
  | "request_changes"
  | "submit_boq";

export type RolePermissionsMap = Record<ProjectRole, AuthPermission[]>;

const ROLE_PERMISSIONS_MAP: RolePermissionsMap = {
  OWNER: [
    "view_project",
    "edit_project",
    "manage_members",
    "create_tasks",
    "edit_tasks",
    "view_budget",
    "edit_budget",
    "approve_expenses",
    "submit_reports",
    "view_documents",
    "upload_documents",
    "submit_quotations",
    "view_approvals",
    "request_changes",
    "submit_boq",
  ],
  COORDINATOR: [
    "view_project",
    "edit_project",
    "manage_members",
    "create_tasks",
    "edit_tasks",
    "view_budget",
    "view_documents",
    "upload_documents",
    "view_approvals",
    "request_changes",
  ],
  ARCHITECT: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "view_documents",
    "submit_reports",
    "request_changes",
  ],
  ENGINEER: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "view_documents",
    "submit_reports",
  ],
  QUANTITY_SURVEYOR: [
    "view_project",
    "view_budget",
    "edit_budget",
    "view_documents",
    "submit_boq",
    "submit_quotations",
    "view_approvals",
    "request_changes",
  ],
  SITE_SUPERVISOR: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "submit_reports",
    "view_documents",
    "upload_documents",
    "request_changes",
  ],
  CONTRACTOR: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "submit_reports",
    "request_changes",
  ],
  SUPPLIER: [
    "view_project",
    "view_documents",
    "submit_quotations",
  ],
};
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";



import fs from "node:fs/promises";
import path from "node:path";

async function writeJsonFile(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function requireAuthenticatedUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireProjectMembership(
  projectId: string,
): Promise<ProjectMembership> {
  const user = await requireAuthenticatedUser();
  const membership = await findMembership(user.id, projectId);
  if (!membership) {
    redirect("/dashboard");
  }
  return membership;
}

export async function requireProjectRole(
  projectId: string,
  allowedRoles: ProjectRole[],
): Promise<ProjectMembership> {
  const membership = await requireProjectMembership(projectId);
  if (!allowedRoles.includes(membership.role)) {
    redirect("/dashboard");
  }
  return membership;
}

export async function requireProjectPermission(
  projectId: string,
  permission: Permission,
): Promise<ProjectMembership> {
  const membership = await requireProjectMembership(projectId);
  if (!membershipHasPermission(membership, permission)) {
    redirect("/dashboard");
  }
  return membership;
}

export type Permission = AuthPermission;

export const ROLE_PERMISSIONS: RolePermissionsMap = {
  OWNER: [
    "view_project",
    "edit_project",
    "manage_members",
    "create_tasks",
    "edit_tasks",
    "view_budget",
    "edit_budget",
    "approve_expenses",
    "submit_reports",
    "view_documents",
    "upload_documents",
    "submit_quotations",
    "view_approvals",
    "request_changes",
    "submit_boq",
  ],
  COORDINATOR: [
    "view_project",
    "edit_project",
    "manage_members",
    "create_tasks",
    "edit_tasks",
    "view_budget",
    "view_documents",
    "upload_documents",
    "view_approvals",
    "request_changes",
  ],
  ARCHITECT: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "view_documents",
    "submit_reports",
    "request_changes",
  ],
  ENGINEER: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "view_documents",
    "submit_reports",
  ],
  QUANTITY_SURVEYOR: [
    "view_project",
    "view_budget",
    "edit_budget",
    "view_documents",
    "submit_boq",
    "submit_quotations",
    "view_approvals",
    "request_changes",
  ],
  SITE_SUPERVISOR: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "submit_reports",
    "view_documents",
    "upload_documents",
    "request_changes",
  ],
  CONTRACTOR: [
    "view_project",
    "create_tasks",
    "edit_tasks",
    "submit_reports",
    "request_changes",
  ],
  SUPPLIER: [
    "view_project",
    "view_documents",
    "submit_quotations",
  ],
};

export function membershipHasPermission(
  membership: ProjectMembership,
  permission: Permission,
): boolean {
  return (ROLE_PERMISSIONS_MAP[membership.role] ?? []).includes(permission);
}

export function getProjectRolesForUser(
  projectId: string,
): Promise<ProjectMembership[]> {
  return listMembershipsForProject(projectId);
}

export function membershipLabel(role: ProjectRole): string {
  return ({
    OWNER: "Owner",
    COORDINATOR: "Coordinator",
    ARCHITECT: "Architect",
    ENGINEER: "Engineer",
    QUANTITY_SURVEYOR: "Quantity Surveyor",
    SITE_SUPERVISOR: "Site Supervisor",
    CONTRACTOR: "Contractor",
    SUPPLIER: "Supplier",
  })[role];
}

export async function acceptInvitation(
  token: string,
): Promise<{ membership: ProjectMembership; project: Awaited<ReturnType<typeof getProject>> } | null> {
  const user = await requireAuthenticatedUser();
  const invitation = await findInvitationByToken(token);
  if (!invitation) return null;
  if (invitation.status !== "PENDING") return null;
  if (new Date(invitation.expiresAt) <= new Date()) return null;
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) return null;

  const existing = await findMembership(user.id, invitation.projectId);
  if (existing) {
    if (existing.status === "ACTIVE") {
      await markInvitationExpired(invitation.id);
      return null;
    }
    await updateMembershipActive(
      existing.id,
      invitation.role,
      existing,
    );
    await markInvitationAccepted(invitation.id);
    await appendAuditEntry({
      id: newId(),
      projectId: invitation.projectId,
      userId: user.id,
      action: "membership_restored",
      details: `Membership restored from invitation ${invitation.id} with role ${invitation.role}`,
      createdAt: new Date().toISOString(),
    });
    const project = await getProject(invitation.projectId);
    return { membership: existing, project };
  }

  const membership: ProjectMembership = {
    id: newId(),
    userId: user.id,
    projectId: invitation.projectId,
    role: invitation.role,
    status: "ACTIVE",
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await createMembership(membership);
  await markInvitationAccepted(invitation.id);
  await appendAuditEntry({
    id: newId(),
    projectId: invitation.projectId,
    userId: user.id,
    action: "membership_created",
    details: `Joined project via invitation ${invitation.id} as ${invitation.role}`,
    createdAt: new Date().toISOString(),
  });
  const project = await getProject(invitation.projectId);
  return { membership, project };
}

export async function createInvitation(
  projectId: string,
  inviterUser: { id: string; email: string },
  email: string,
  role: ProjectRole,
  skipMemberEmailCheck: boolean = false,
): Promise<string> {
  const memberships = await listMembershipsForProject(projectId);
  const inviter = memberships.find((m: ProjectMembership) => m.userId === inviterUser.id);
  if (!inviter) {
    throw new Error("Only project members can invite others.");
  }
  if (!membershipHasPermission(inviter, "manage_members")) {
    throw new Error("You do not have permission to invite people to this project.");
  }
  if (!ROLE_PERMISSIONS_MAP[role]) {
    throw new Error("Invalid role.");
  }
  if (role === "OWNER") {
    throw new Error("You cannot invite someone as the project owner.");
  }

  const limiter = checkInvitationRateLimiter(projectId);
  if (!limiter.allowed) {
    throw new Error(
      `You have reached the invitation limit for this project. Try again in ${Math.ceil(limiter.resetIn / 1000)} seconds.`,
    );
  }

  const { findUserByEmail } = await import("@/lib/store");
  const existingUser = await findUserByEmail(email.toLowerCase());
  if (existingUser && !skipMemberEmailCheck) {
    const existingMembership = await findMembership(existingUser.id, projectId);
    if (existingMembership && existingMembership.status === "ACTIVE") {
      throw new Error("That person is already a member of this project.");
    }
  }

  const token = `${newId()}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const invitation = {
    id: newId(),
    projectId,
    invitedByUserId: inviterUser.id,
    email: email.toLowerCase().trim(),
    role,
    token,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  await createInvitationRecord(invitation as Invitation);
  recordInvitationAttempt(projectId);
  await appendAuditEntry({
    id: newId(),
    projectId,
    userId: inviterUser.id,
    action: "invitation_created",
    details: `Invited ${email} as ${role}`,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export async function revokeInvitation(
  projectId: string,
  inviterUser: { id: string },
  token: string,
): Promise<boolean> {
  const memberships = await listMembershipsForProject(projectId);  const inviter = memberships.find((m: ProjectMembership) => m.userId === inviterUser.id);
  if (!inviter || !inviterHasPermission(inviter, "manage_members")) {
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
  await updateInvitation({
    ...invitation as Invitation,
    status: "REVOKED" as const,
  });
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

export async function requestPasswordReset(
  email: string,
): Promise<string | null> {
  const { findUserByEmail } = await import("@/lib/store");
  const user = await findUserByEmail(email.toLowerCase());
  if (!user) return null;

  const token = `${newId()}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const reset = {
    id: newId(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  await createPasswordResetRecord(reset);
  return token;
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const reset = await consumePasswordResetRecord(token);
  if (!reset) return false;
  const { listUsers } = await import("@/lib/store");
  const users = await listUsers();
  const user = users.find((u) => u.id === reset.userId);
  if (!user) return false;
  // In the current JSON store we cannot patch a single user's password hash in place,
  // so we recreate the user list with the updated password for the affected user.
  await replaceUserPasswordHash(user.id, await hashPassword(newPassword));
  return true;
}

async function markInvitationExpired(id: string) {
  const invitations = await listInvitations();
  await writeInvitationsRec(
    invitations.map((i: Invitation) =>
      i.id === id ? { ...i, status: "EXPIRED" as const } : i,
    ),
  );
}

async function markInvitationAccepted(id: string) {
  const invitations = await listInvitations();
  await writeInvitationsRec(
    invitations.map((i: Invitation) =>
      i.id === id
        ? { ...i, status: "ACCEPTED" as const, acceptedAt: new Date().toISOString() }
        : i,
    ),
  );
}

async function updateMembershipActive(
  id: string,
  role: ProjectRole,
  membership: ProjectMembership,
) {
  await updateMembershipRecord({
    ...membership,
    id,
    role,
    status: "ACTIVE" as const,
    updatedAt: new Date().toISOString(),
  });
}

function inviterHasPermission(
  inviter: ProjectMembership,
  permission: AuthPermission,
): boolean {
  return membershipHasPermission(inviter, permission);
}

async function replaceUserPasswordHash(userId: string, newHash: string) {
  const { listUsers } = await import("@/lib/store");
  const users = await listUsers();
  const updated = users.map((u) =>
    u.id === userId ? { ...u, passwordHash: newHash } : u,
  );
  await writeJsonFile(path.join(process.cwd(), "data", "users.json"), updated);
}

function writeInvitationsRec(records: Invitation[]) {
  return writeJsonFile(
    path.join(process.cwd(), "data", "invitations.json"),
    records,
  );
}
