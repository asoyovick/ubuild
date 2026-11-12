import type { Metadata } from "next";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { getProjectEngagements, getProjectMessages } from "@/lib/ubuild";
import { getSessionUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { ProjectCollaboration } from "@/components/dashboard/ProjectCollaboration";

export const metadata: Metadata = { title: "Messages" };

export default async function ProjectMessagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [user, workspace, messages, engagements] = await Promise.all([
    getSessionUser(),
    getBackendWorkspace(projectId),
    getProjectMessages(projectId),
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

  if (!messages.ok || !messages.data) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">{messages.error}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-ink/60">
          Collaboration and decisions for {workspace.data.project.name}, attached to the same project and
          engagement records used everywhere else in UBuild.
        </p>
      </div>
      <Card>
        <CardHeader
          title="Project communication"
          subtitle="Financial authorizations are never given by message; use the payments page."
        />
        <CardBody>
          <ProjectCollaboration
            projectId={projectId}
            userId={user?.id ?? ""}
            messages={messages.data.messages}
            engagements={engagements.ok ? engagements.data?.engagements ?? [] : []}
          />
        </CardBody>
      </Card>
    </div>
  );
}
