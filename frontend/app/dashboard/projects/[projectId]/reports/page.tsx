import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ReportPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Progress reports" };

export default async function ProjectReportsPage({
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
  const reports = workspace.reports ?? [];

  if (workspace.role === "SUPPLIER") {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Progress reports are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Progress reports</h1>
        <p className="mt-1 text-sm text-ink/60">Site updates for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="Recent reports" subtitle="From authorized project members." />
        <CardBody>
          <ReportPanel
            projectId={projectId}
            reports={reports}
            canSubmit={hasPermission(workspace, "submit_reports")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
