import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BOQPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bill of quantities" };

export default async function ProjectBOQPage({
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
  const items = workspace.boq ?? [];

  if (!hasPermission(workspace, "view_budget") && !hasPermission(workspace, "submit_boq")) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">The bill of quantities is not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Bill of quantities</h1>
        <p className="mt-1 text-sm text-ink/60">Measured work for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="BOQ lines" subtitle={`${items.length} line${items.length === 1 ? "" : "s"} recorded`} />
        <CardBody>
          <BOQPanel
            projectId={projectId}
            items={items}
            canSubmit={hasPermission(workspace, "submit_boq")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
