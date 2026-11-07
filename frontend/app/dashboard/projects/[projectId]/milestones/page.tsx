import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MilestonePanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Milestones" };

export default async function ProjectMilestonesPage({
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
  const milestones = workspace.milestones ?? [];

  if (workspace.role === "SUPPLIER") {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Milestones are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Milestones</h1>
        <p className="mt-1 text-sm text-ink/60">The agreed schedule for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="Milestone tracking" subtitle={`${milestones.length} milestone${milestones.length === 1 ? "" : "s"} recorded`} />
        <CardBody>
          <MilestonePanel
            projectId={projectId}
            milestones={milestones}
            canManage={hasPermission(workspace, "manage_schedule")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
