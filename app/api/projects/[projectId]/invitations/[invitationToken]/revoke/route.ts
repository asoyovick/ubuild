import { NextResponse } from "next/server";
import { requireProjectPermission } from "@/lib/authorization";
import {
  listInvitations,
  updateInvitation,
  appendAuditEntry,
  newId,
  type Invitation,
} from "@/lib/projects/store";
import { membershipHasPermission } from "@/lib/authorization";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; invitationToken: string }> },
) {
  const { projectId, invitationToken } = await params;
  const actingUser = await requireAuthenticatedUser();
  const membership = await requireProjectPermission(projectId, "manage_members");

  const invitations = await listInvitations();
  const invitation = invitations.find(
    (i: Invitation) =>
      i.token === invitationToken &&
      i.projectId === projectId &&
      i.status === "PENDING",
  );

  if (!invitation) {
    return NextResponse.json(
      { error: "That invitation could not be revoked." },
      { status: 404 },
    );
  }

  await updateInvitation({ ...invitation, status: "REVOKED" });
  await appendAuditEntry({
    id: newId(),
    projectId,
    userId: actingUser.id,
    action: "invitation_revoked",
    details: `Revoked invitation ${invitation.id}`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ message: "Invitation revoked." });
}
