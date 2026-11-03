import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { getProject, listMembershipsForProject } from "@/lib/projects/store";
import { listUsers } from "@/lib/store";
import { ProjectInviteForm } from "@/components/dashboard/ProjectInviteForm";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import type { Metadata } from "next";
import { membershipLabel } from "@/lib/authorization";

export const metadata: Metadata = {
  title: "Team",
};

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  try {
    await requireProjectPermission(projectId, "manage_members");
  } catch {
    redirect("/dashboard");
  }

  const project = await getProject(projectId);
  if (!project) {
    redirect("/dashboard");
  }

  const members = await listMembershipsForProject(projectId);
  const users = await listUsers();
  const userById = new Map(users.map((member) => [member.id, member]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-ink/60">
            Manage the people working on {project.name}.
          </p>
        </div>

      </div>

      <ProjectInviteForm projectId={projectId} />

      <Card>
        <CardHeader
          title="Project members"
          subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`}
        />
        <CardBody>
          {members.length === 0 ? (
            <p className="text-sm text-ink/70">
              No active members are assigned to this project.
            </p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {userById.get(member.userId)?.name ?? "Account unavailable"}
                    </p>
                    <p className="text-xs text-ink/55">
                      {userById.get(member.userId)?.email ?? ""}
                    </p>
                    <p className="text-xs text-ink/55">
                      Joined{" "}
                      {new Date(member.joinedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
                    {membershipLabel(member.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

    </div>
  );
}
