import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { IssuePanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Issues" };

export default async function ProjectIssuesPage({
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
  const issues = workspace.issues ?? [];

  if (!hasPermission(workspace, "manage_issues")) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Issues are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Issues</h1>
        <p className="mt-1 text-sm text-ink/60">Risks, blockers, and defects recorded on site.</p>
      </div>
      <Card>
        <CardHeader title="Open and resolved issues" subtitle={`${issues.length} issue${issues.length === 1 ? "" : "s"} recorded`} />
        <CardBody>
          <IssuePanel
            projectId={projectId}
            issues={issues}
            canManage={hasPermission(workspace, "manage_issues")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
