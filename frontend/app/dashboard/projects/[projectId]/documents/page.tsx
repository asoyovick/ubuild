import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DocumentPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documents" };

export default async function ProjectDocumentsPage({
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
  const documents = workspace.documents ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Documents</h1>
        <p className="mt-1 text-sm text-ink/60">Drawings, photos, and delivery records for {workspace.project.name}.</p>
      </div>
      <Card>
        <CardHeader title="Project documents" subtitle={`${documents.length} file${documents.length === 1 ? "" : "s"} available`} />
        <CardBody>
          <DocumentPanel
            projectId={projectId}
            documents={documents}
            canUpload={hasPermission(workspace, "upload_documents")}
          />
        </CardBody>
      </Card>
    </div>
  );
}
