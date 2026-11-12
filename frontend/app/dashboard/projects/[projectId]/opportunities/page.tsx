import type { Metadata } from "next";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { getOpportunity, getProjectOpportunities, getProjectRecommendations } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import {
  OpportunityWorkflow,
  type OpportunityWithApplications,
} from "@/components/dashboard/OpportunityWorkflow";

export const metadata: Metadata = { title: "Opportunities" };

export default async function ProjectOpportunitiesPage({
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

  const role = workspace.data.membership.role;
  const canRecommend = role === "OWNER" || role === "COORDINATOR";

  const [opportunities, recommendations] = await Promise.all([
    getProjectOpportunities(projectId),
    canRecommend ? getProjectRecommendations(projectId) : Promise.resolve(null),
  ]);

  if (!opportunities.ok || !opportunities.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">
            {opportunities.status === 403
              ? "Opportunities are not available for your role on this project."
              : opportunities.error}
          </p>
        </CardBody>
      </Card>
    );
  }

  const items: OpportunityWithApplications[] = await Promise.all(
    opportunities.data.opportunities.map(async (opportunity) => {
      const detail = await getOpportunity(opportunity.id);
      return {
        ...opportunity,
        applications: detail.ok ? detail.data?.applications ?? [] : [],
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Opportunities</h1>
        <p className="mt-1 text-sm text-ink/60">
          Publish the work {workspace.data.project.name} needs next, review applications and propose an
          engagement. Nothing becomes payable until you approve the agreed terms.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Marketplace opportunities"
          subtitle="Applications are not engagements and create no payment rights."
        />
        <CardBody>
          <OpportunityWorkflow
            project={workspace.data.project}
            role={role}
            opportunities={items}
            recommendations={
              recommendations?.ok ? recommendations.data?.recommendations ?? [] : []
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}
