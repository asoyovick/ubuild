import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { getEngagementVariations, getProfessionalDirectory, getProjectEngagements } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import {
  EngagementWorkflow,
  type EngagementWithVariations,
} from "@/components/dashboard/EngagementWorkflow";

export const metadata: Metadata = { title: "Engagements" };

export default async function ProjectEngagementsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [user, workspace, engagements, directory] = await Promise.all([
    getSessionUser(),
    getBackendWorkspace(projectId),
    getProjectEngagements(projectId),
    getProfessionalDirectory(),
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

  if (!engagements.ok || !engagements.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">
            {engagements.status === 403
              ? "Engagements are not available for your role on this project."
              : engagements.error}
          </p>
        </CardBody>
      </Card>
    );
  }

  const base = engagements.data.engagements;
  const items: EngagementWithVariations[] = await Promise.all(
    base.map(async (engagement) => {
      const variations = await getEngagementVariations(projectId, engagement.id);
      return { ...engagement, variations: variations.ok ? variations.data?.variations ?? [] : [] };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Engagements</h1>
        <p className="mt-1 text-sm text-ink/60">
          Agreed scope, timeline and fee for every professional working on {workspace.data.project.name}.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Engagement record"
          subtitle="Only an approved engagement on this project permits a payment request."
        />
        <CardBody>
          <EngagementWorkflow
            projectId={projectId}
            role={workspace.data.membership.role}
            userId={user?.id ?? ""}
            engagements={items}
            professionals={directory.ok ? directory.data?.professionals ?? [] : []}
            defaultStage={workspace.data.project.constructionStage}
          />
        </CardBody>
      </Card>
    </div>
  );
}
