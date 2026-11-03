import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { membershipHasPermission } from "@/lib/authorization";
import { getProject, listMembershipsForProject, newId } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { Button } from "@/components/ui/Button";
import { Plus, Users, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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

  let membership;
  try {
    membership = await requireProjectPermission(projectId, "manage_members");
  } catch {
    redirect("/dashboard");
  }

  const project = await getProject(projectId);
  if (!project) {
    redirect("/dashboard");
  }

  const members = await listMembershipsForProject(projectId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-ink/60">
            Manage the people working on {project.name}.
          </p>
        </div>

        {membershipHasPermission(membership, "manage_members") && (
          <Link
            href={`/dashboard/projects/${projectId}/team?action=invite`}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite member
          </Link>
        )}
      </div>

      <Card>
        <CardHeader
          title="Project members"
          subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`}
        />
        <CardBody>
          {members.length === 0 ? (
            <p className="text-sm text-ink/70">
              No team members yet. The project owner can invite others.
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
                      {member.userId}
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

      <div className="rounded-lg border border-dashed border-navy/20 bg-pale/50 px-5 py-6 text-center">
        <p className="text-sm text-ink/60">
          Member names and emails are not yet stored in the data model.
          This page shows member ids and roles until a user profile field is added.
        </p>
      </div>
    </div>
  );
}
