import { getBackendWorkspace, hasPermission } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { QuotationPanel } from "@/components/dashboard/WorkspacePanels";
import { RetryButton } from "@/components/dashboard/RetryButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quotations" };

export default async function ProjectQuotationsPage({
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
  const quotations = workspace.quotations ?? [];
  const isSupplier = workspace.role === "SUPPLIER";
  const canSubmit = hasPermission(workspace, "submit_quotations");
  const canDecide = hasPermission(workspace, "decide_quotations");

  if (!canSubmit && !canDecide) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Quotations are not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Quotations</h1>
        <p className="mt-1 text-sm text-ink/60">
          {isSupplier
            ? "Your submitted quotations. Other suppliers' prices are not visible to you."
            : `Supplier pricing for ${workspace.project.name}.`}
        </p>
      </div>
      <Card>
        <CardHeader title={isSupplier ? "Your quotations" : "Supplier quotations"} subtitle={`${quotations.length} quotation${quotations.length === 1 ? "" : "s"} available`} />
        <CardBody>
          <QuotationPanel
            projectId={projectId}
            quotations={quotations}
            canSubmit={canSubmit}
            canDecide={canDecide}
          />
        </CardBody>
      </Card>
    </div>
  );
}
