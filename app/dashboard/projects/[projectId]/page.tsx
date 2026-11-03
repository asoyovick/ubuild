import { redirect } from "next/navigation";
import { requireProjectMembership } from "@/lib/authorization";
import { getProject, listMembershipsForProject, newId } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleActions } from "@/components/dashboard/RoleNav";
import { Plus, Users, CalendarClock, FileCheck, Wallet } from "lucide-react";
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

  let membership;
  try {
    membership = await requireProjectMembership(projectId);
  } catch {
    redirect("/dashboard");
  }

  const project = await getProject(projectId);
  if (!project) {
    redirect("/dashboard");
  }

  const members = await listMembershipsForProject(projectId);
  const memberCount = members.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Card>
            <CardBody>
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Project
              </p>
              <p className="mt-2 text-lg font-bold text-navy">{project.name}</p>
              <p className="mt-1 text-sm text-ink/60">{project.type} · {project.location}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Your role
              </p>
              <p className="mt-2 text-lg font-bold text-navy">{membership.role}</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                Team size
              </p>
              <p className="mt-2 text-lg font-bold text-navy">{memberCount}</p>
              <p className="mt-1 text-sm text-ink/60">active members</p>
            </CardBody>
          </Card>
        </div>

        <RoleActions role={membership.role} projectId={projectId} />
      </div>

      <Card>
        <CardHeader
          title="What you can do"
          subtitle={`You are in this project as ${membership.role}.`}
        />
        <CardBody>
          <p className="text-sm text-ink/70">
            This project currently has no task, milestone, budget, report, or document data.
            Use the actions above to add the first records for your role.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Team" action={<Link href={`/dashboard/projects/${projectId}/team`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View</Link>} />
          <CardBody>
            <p className="text-sm text-ink/70">
              {memberCount === 0
                ? "No team members yet."
                : `${memberCount} active member${memberCount === 1 ? "" : "s"} in this project.`}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Milestones" action={<Link href={`/dashboard/projects/${projectId}/milestones`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View</Link>} />
          <CardBody>
            <p className="text-sm text-ink/70">
              No milestones have been added yet.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reports" action={<Link href={`/dashboard/projects/${projectId}/reports`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">View</Link>} />
          <CardBody>
            <p className="text-sm text-ink/70">
              No progress reports have been submitted yet.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed border-navy/20 bg-pale/50 px-5 py-6 text-center">
        <p className="text-sm text-ink/60">
          This is a new project. Data appears here only after it is added by authorized team members.
        </p>
      </div>
    </div>
  );
}
