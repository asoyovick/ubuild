import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BudgetPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Budget" };

export default async function ProjectBudgetPage({
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
  const budget = workspace.budget;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Budget and expenses</h1>
        <p className="mt-1 text-sm text-ink/60">Cost records for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="Budget summary" subtitle="Calculated from recorded budget lines and expenses." />
        <CardBody>
          {budget ? (
            <BudgetPanel
              projectId={projectId}
              budget={budget}
              canEdit={hasPermission(workspace, "edit_budget")}
              canApprove={hasPermission(workspace, "approve_expenses")}
            />
          ) : (
            <p className="text-sm text-ink/65">Budget information is not available for your role.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
