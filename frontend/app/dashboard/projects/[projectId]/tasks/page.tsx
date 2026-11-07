import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TaskPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tasks" };

export default async function ProjectTasksPage({
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
  const tasks = workspace.tasks ?? [];
  const team = workspace.team ?? [];
  const canCreate = hasPermission(workspace, "create_tasks");
  const canEdit = hasPermission(workspace, "edit_tasks");

  if (!canCreate && !canEdit) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Tasks are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Tasks</h1>
        <p className="mt-1 text-sm text-ink/60">Work that has been agreed for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="Task board" subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"} recorded`} />
        <CardBody>
          <TaskPanel
            projectId={projectId}
            tasks={tasks}
            team={team}
            canCreate={canCreate}
            canEdit={canEdit}
          />
        </CardBody>
      </Card>
    </div>
  );
}
