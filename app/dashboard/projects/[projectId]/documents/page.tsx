import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function ProjectDocumentsPage({
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
    membership = await requireProjectPermission(projectId, "view_documents");
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
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-ink/60">
            Important documents for {project.name}.
          </p>
        </div>
        <RoleNav role={membership.role} projectId={projectId} />
      </div>

      <Card>
        <CardHeader title="Project documents" />
        <CardBody>
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-navy">
              No documents uploaded yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-ink/60">
              Upload plans, drawings, approvals, and other project documents when they are available.
            </p>
          </div>
        </CardBody>
      </Card>

      <p className="rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
        Document data appears once authorized members upload files.
      </p>
    </div>
  );
}
