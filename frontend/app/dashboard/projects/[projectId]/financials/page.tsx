import type { Metadata } from "next";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { getProfessionalFinancials } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { ProfessionalFinancialsView } from "@/components/dashboard/ProfessionalFinancialsView";

export const metadata: Metadata = { title: "My financials" };

export default async function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [workspace, financials] = await Promise.all([
    getBackendWorkspace(projectId),
    getProfessionalFinancials(projectId),
  ]);

  if (!workspace.ok || !workspace.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">{workspace.error}</p>
          <div className="mt-4">
            <RetryButton />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!financials.ok || !financials.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">
            {financials.status === 403
              ? "This financial view is limited to professionals engaged on this project. The client sees the project funds and ledger on the Funds page."
              : financials.error}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">My financials</h1>
        <p className="mt-1 text-sm text-ink/60">
          Your own engagements, payment requests and provider-confirmed releases on{" "}
          {workspace.data.project.name}.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Authorized financial visibility"
          subtitle="Only the client and the engaged professional can see these records."
        />
        <CardBody>
          <ProfessionalFinancialsView financials={financials.data.financials} />
        </CardBody>
      </Card>
    </div>
  );
}
