import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { getProjectEngagements, getProjectPaymentRequests } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { PaymentsWorkflow } from "@/components/dashboard/PaymentsWorkflow";

export const metadata: Metadata = { title: "Payments" };

export default async function ProjectPaymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [user, workspace, requests, engagements] = await Promise.all([
    getSessionUser(),
    getBackendWorkspace(projectId),
    getProjectPaymentRequests(projectId),
    getProjectEngagements(projectId),
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

  if (!requests.ok || !requests.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">
            {requests.status === 403
              ? "Payment records are limited to the client and the professionals engaged on this project."
              : requests.error}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Payment requests</h1>
        <p className="mt-1 text-sm text-ink/60">
          Deliverables, client review and explicit payment authorization for {workspace.data.project.name}.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Requests and instructions"
          subtitle="A payment is complete only when the payment provider confirms the transfer."
        />
        <CardBody>
          <PaymentsWorkflow
            projectId={projectId}
            role={workspace.data.membership.role}
            userId={user?.id ?? ""}
            requests={requests.data.paymentRequests}
            engagements={engagements.ok ? engagements.data?.engagements ?? [] : []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
