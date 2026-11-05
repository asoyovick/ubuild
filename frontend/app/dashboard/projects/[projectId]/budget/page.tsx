import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget",
};

export default async function ProjectBudgetPage({
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
    membership = await requireProjectPermission(projectId, "view_budget");
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
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Budget</h1>
          <p className="mt-1 text-sm text-ink/60">
            Cost overview for {project.name}.
          </p>
        </div>
        <RoleNav role={membership.role} projectId={projectId} />
      </div>

      <Card>
        <CardHeader title="Budget summary" subtitle="Calculated from actual budget and expense records." />
        <CardBody>
          <p className="text-sm text-ink/70">
            Budget and expense records cannot be managed in this workspace yet.
          </p>
        </CardBody>
      </Card>

    </div>
  );
}
