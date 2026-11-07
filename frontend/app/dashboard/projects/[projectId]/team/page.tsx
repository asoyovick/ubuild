import {
  getBackendWorkspace,
  hasPermission,
  listBackendInvitations,
} from "@/lib/backend-projects";
import { ProjectInviteForm } from "@/components/dashboard/ProjectInviteForm";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team",
};

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const result = await getBackendWorkspace(projectId);
  if (!result.ok || !result.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">{result.error}</p>
          <div className="mt-4"><RetryButton /></div>
        </CardBody>
      </Card>
    );
  }
  const workspace = result.data;
  if (!hasPermission(workspace, "manage_members")) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Only project owners and coordinators can manage the team.</p>
        </CardBody>
      </Card>
    );
  }
  const members = workspace.team ?? [];
  const invitations = await listBackendInvitations(projectId);
  const pending = invitations.filter((invitation) => invitation.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Team</h1>
        <p className="mt-1 text-sm text-ink/60">Manage the people working on {workspace.project.name}.</p>
      </div>

      <ProjectInviteForm projectId={projectId} />

      <Card>
        <CardHeader
          title="Project members"
          subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`}
        />
        <CardBody>
          {members.length === 0 ? (
            <p className="text-sm text-ink/70">No active members are assigned to this project.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {members.map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{member.name}</p>
                    <p className="text-xs text-ink/55">{member.email}</p>
                    <p className="text-xs text-ink/55">
                      Joined {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
                    {PROJECT_ROLE_LABELS[member.role]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader title="Pending invitations" subtitle="Share the link with the invited person." />
          <CardBody>
            <ul className="divide-y divide-navy/10">
              {pending.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{invitation.email}</p>
                    <p className="text-xs text-ink/55">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-navy">
                    {PROJECT_ROLE_LABELS[invitation.role]}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
