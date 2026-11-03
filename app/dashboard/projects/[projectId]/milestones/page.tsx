import { redirect } from "next/navigation";
import { requireProjectMembership } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { formatDate } from "@/lib/dashboard-data";
import { CheckCircle2, Clock, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Milestones",
};

export default async function ProjectMilestonesPage({
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

  const MILESTONE_META = {
    complete: { icon: CheckCircle2, label: "Complete", tone: "text-primary" },
    "in-progress": { icon: Clock, label: "In progress", tone: "text-accent-dark" },
    upcoming: { icon: Circle, label: "Upcoming", tone: "text-ink/30" },
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Milestones</h1>
          <p className="mt-1 text-sm text-ink/60">
            The agreed schedule for {project.name}.
          </p>
        </div>
        <RoleNav role={membership.role} projectId={projectId} />
      </div>

      <Card>
        <CardHeader title="Milestone timeline" subtitle="Ordered by due date." />
        <CardBody>
          <ol className="relative space-y-6 border-l-2 border-navy/10 pl-6">
            <li className="relative">
              <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink/30">
                <Circle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-ink">No milestones yet</h2>
                <span className="rounded-full bg-pale px-2.5 py-0.5 text-xs font-bold text-ink/60">
                  Upcoming
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/55">No due date</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                Add the first milestone to start tracking progress.
              </p>
            </li>
          </ol>
          <p className="mt-6 rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
            Milestone data is not available yet.
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/dashboard/projects/${projectId}/milestones?action=create`}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          Add milestone
        </Link>
      </div>
    </div>
  );
}
