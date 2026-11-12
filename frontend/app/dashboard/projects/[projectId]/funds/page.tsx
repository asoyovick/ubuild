import type { Metadata } from "next";
import { getBackendWorkspace } from "@/lib/backend-projects";
import {
  getProjectAllocations,
  getProjectEngagements,
  getProjectFunds,
  getProjectLedger,
  getProjectProvider,
} from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { FundsWorkflow } from "@/components/dashboard/FundsWorkflow";

export const metadata: Metadata = { title: "Project funds" };

export default async function ProjectFundsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const workspace = await getBackendWorkspace(projectId);

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

  if (workspace.data.membership.role !== "OWNER") {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">
            Project funds, the payment provider and the financial ledger are limited to the project client.
          </p>
        </CardBody>
      </Card>
    );
  }

  const [funds, ledger, provider, allocations, engagements] = await Promise.all([
    getProjectFunds(projectId),
    getProjectLedger(projectId),
    getProjectProvider(projectId),
    getProjectAllocations(projectId),
    getProjectEngagements(projectId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Project funds</h1>
        <p className="mt-1 text-sm text-ink/60">
          Deposits, releases and the immutable ledger for {workspace.data.project.name}.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Funds account and ledger"
          subtitle="UBuild records every movement. The bank or payment service provider holds the money."
        />
        <CardBody>
          <FundsWorkflow
            projectId={projectId}
            role={workspace.data.membership.role}
            funds={funds.ok ? funds.data?.funds ?? null : null}
            availableCents={funds.ok ? funds.data?.availableCents ?? 0 : 0}
            provider={provider.ok ? provider.data?.provider ?? null : null}
            entries={ledger.ok ? ledger.data?.entries ?? [] : []}
            allocations={allocations.ok ? allocations.data?.allocations ?? [] : []}
            engagements={engagements.ok ? engagements.data?.engagements ?? [] : []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
