import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBackendProject, listBackendMembers } from "@/lib/backend-projects";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Project overview",
};

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const access = await getBackendProject(projectId);
  if (!access) {
    redirect("/dashboard");
  }
  const { membership } = access;

  const members = await listBackendMembers(projectId);
  const memberCount = members.length;

  return (
    <div className="space-y-6">
      <p className="border-b border-navy/15 pb-4 text-sm text-ink/65">
        {memberCount} active project member{memberCount === 1 ? "" : "s"}
      </p>

      <Card>
        <CardHeader
          title="Project workspace"
          subtitle={`You are in this project as ${membership.role}.`}
        />
        <CardBody>
          <p className="text-sm text-ink/70">
            Project membership and access are managed here. Budget, milestone, report, and document records are not yet supported.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Team" action={<Link href={`/dashboard/projects/${projectId}/team`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View</Link>} />
          <CardBody>
            <p className="text-sm text-ink/70">
              {memberCount === 0
                ? "No active members are assigned."
                : `${memberCount} active member${memberCount === 1 ? "" : "s"} in this project.`}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Activity" action={<Link href={`/dashboard/projects/${projectId}/activity`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View</Link>} />
          <CardBody>
            <p className="text-sm text-ink/70">
              Review recorded changes to the project and its membership.
            </p>
          </CardBody>
        </Card>
      </div>

    </div>
  );
}
