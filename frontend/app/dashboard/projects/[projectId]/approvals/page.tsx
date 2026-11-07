import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ApprovalPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Approvals" };

export default async function ProjectApprovalsPage({
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
  const approvals = workspace.approvals ?? [];

  if (!hasPermission(workspace, "view_approvals")) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Approvals are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Approvals</h1>
        <p className="mt-1 text-sm text-ink/60">Review requested changes before money or schedule moves.</p>
      </div>
      <Card>
        <CardHeader title="Approval requests" subtitle={`${approvals.length} request${approvals.length === 1 ? "" : "s"} recorded`} />
        <CardBody>
          <ApprovalPanel
            projectId={projectId}
            approvals={approvals}
            canRequest={hasPermission(workspace, "request_changes")}
            canDecide={hasPermission(workspace, "decide_approvals")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
