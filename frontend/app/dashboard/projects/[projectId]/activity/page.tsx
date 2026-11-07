import { getBackendWorkspace } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { Activity, CheckCircle2, FileText, Users, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity",
};

export default async function ProjectActivityPage({
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
  const entries = workspace.activity ?? [];

  if (workspace.role === "SUPPLIER") {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-ink/65">Project activity is not available for your role in this project.</p>
        </CardBody>
      </Card>
    );
  }

  const actionIcons: Record<string, typeof Activity> = {
    project_created: Activity,
    membership_created: Users,
    membership_restored: Users,
    member_removed: Users,
    role_changed: Users,
    invitation_created: FileText,
    invitation_revoked: FileText,
    approval_approved: CheckCircle2,
    approval_rejected: XCircle,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Activity</h1>
        <p className="mt-1 text-sm text-ink/60">Recent changes in {workspace.project.name}.</p>
      </div>

      <Card>
        <CardHeader title="Recent activity" subtitle="Recorded project changes." />
        <CardBody>
          {entries.length === 0 ? (
            <p className="text-sm text-ink/70">No activity has been recorded yet.</p>
          ) : (
            <ul className="divide-y divide-navy/10">
              {entries.map((entry) => {
                const Icon = actionIcons[entry.action] ?? Activity;
                return (
                  <li key={entry.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-navy/60" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">
                        {entry.action.replaceAll("_", " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/55">{entry.details}</p>
                      <p className="mt-1 text-xs text-ink/45">
                        {new Date(entry.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
