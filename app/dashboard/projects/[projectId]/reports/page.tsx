import { redirect } from "next/navigation";
import { requireProjectMembership } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { formatDate } from "@/lib/dashboard-data";
import { Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Progress reports",
};

export default async function ProjectReportsPage({
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Progress reports</h1>
          <p className="mt-1 text-sm text-ink/60">
            Photo-backed updates for {project.name}.
          </p>
        </div>
        <RoleNav role={membership.role} projectId={projectId} />
      </div>

      <Card>
        <CardHeader title="Recent reports" subtitle="From authorized project members." />
        <CardBody>
          <p className="text-sm text-ink/70">
            No progress reports have been submitted for this project yet.
          </p>
        </CardBody>
      </Card>

      <p className="rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
        Report data appears once authorized members submit their site updates.
      </p>
    </div>
  );
}
