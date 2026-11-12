import Link from "next/link";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { formatMoney } from "@/lib/workspace-client";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import { stageLabel } from "@/lib/ubuild-shared";
import { ProjectBriefForm } from "@/components/dashboard/ProjectBriefForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project overview",
};

export default async function ProjectOverviewPage({
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
  const { project, summary, membership, team = [], activity = [], budget } = workspace;

  const stats = [
    { label: "Open tasks", value: summary.openTasks, href: "tasks" },
    { label: "Pending approvals", value: summary.pendingApprovals, href: "approvals" },
    { label: "Pending expenses", value: summary.pendingExpenses, href: "budget" },
    { label: "Open issues", value: summary.openIssues, href: "issues" },
    { label: "Overdue milestones", value: summary.overdueMilestones, href: "milestones" },
    { label: "Documents", value: summary.documents, href: "documents" },
  ].filter((stat) => stat.value !== undefined);

  // Construction progress calculated from actual database records
  const totalMilestones = summary.totalMilestones ?? 0;
  const completedMilestones = summary.completedMilestones ?? 0;
  const milestoneProgress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : null;

  const totalTasks = summary.totalTasks ?? 0;
  const completedTasks = summary.completedTasks ?? 0;
  const taskProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;

  const totalBudgetCents = budget?.totalBudgetCents ?? 0;
  const approvedExpenseCents = budget?.approvedExpenseCents ?? 0;
  const budgetProgress =
    totalBudgetCents > 0 ? Math.round((approvedExpenseCents / totalBudgetCents) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-navy/15 pb-4">
        <p className="text-sm text-ink/65">
          {membership.role !== "SUPPLIER" ? (
            `${team.length} active project member${team.length === 1 ? "" : "s"} · `
          ) : null}
          Your active role in this project is{" "}
          <span className="font-semibold text-navy">{PROJECT_ROLE_LABELS[membership.role]}</span>.
          {project.description ? ` · ${project.description}` : ""}
        </p>
      </div>

      {/* Real Construction Progress & Timeline */}
      {membership.role !== "SUPPLIER" && (
        <section aria-labelledby="construction-progress-heading" className="space-y-3">
          <h2 id="construction-progress-heading" className="font-semibold text-navy">
            Construction progress & timeline
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy">Milestones progress</span>
                  <span className="text-ink/60">
                    {milestoneProgress !== null ? `${milestoneProgress}%` : "Not scheduled"}
                  </span>
                </div>
                {milestoneProgress !== null ? (
                  <>
                    <ProgressBar value={milestoneProgress} tone="primary" label="Milestone progress" />
                    <p className="text-xs text-ink/55">
                      {completedMilestones} of {totalMilestones} milestones completed
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink/55">
                    No milestones recorded yet. Add milestones to track construction schedule.
                  </p>
                )}
                <Link
                  href={`/dashboard/projects/${projectId}/milestones`}
                  className="inline-flex pt-1 text-xs font-semibold text-primary hover:underline"
                >
                  View schedule &rarr;
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-navy">Work completion</span>
                  <span className="text-ink/60">
                    {taskProgress !== null ? `${taskProgress}%` : "No tasks"}
                  </span>
                </div>
                {taskProgress !== null ? (
                  <>
                    <ProgressBar value={taskProgress} tone="navy" label="Task progress" />
                    <p className="text-xs text-ink/55">
                      {completedTasks} of {totalTasks} work items completed
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink/55">
                    No tasks recorded yet. Create tasks to assign and track field work.
                  </p>
                )}
                <Link
                  href={`/dashboard/projects/${projectId}/tasks`}
                  className="inline-flex pt-1 text-xs font-semibold text-primary hover:underline"
                >
                  View task board &rarr;
                </Link>
              </CardBody>
            </Card>

            {budget && (
              <Card>
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">Budget utilization</span>
                    <span className="text-ink/60">
                      {budgetProgress !== null ? `${budgetProgress}%` : "No budget"}
                    </span>
                  </div>
                  {budgetProgress !== null ? (
                    <>
                      <ProgressBar
                        value={budgetProgress}
                        tone={budgetProgress > 90 ? "warning" : "primary"}
                        label="Budget utilization"
                      />
                      <p className="text-xs text-ink/55">
                        {formatMoney(approvedExpenseCents)} approved of {formatMoney(totalBudgetCents)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink/55">
                      Budget lines have not been added yet.
                    </p>
                  )}
                  <Link
                    href={`/dashboard/projects/${projectId}/budget`}
                    className="inline-flex pt-1 text-xs font-semibold text-primary hover:underline"
                  >
                    View budget details &rarr;
                  </Link>
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Project Status Counters */}
      {stats.length > 0 && (
        <section aria-labelledby="summary-heading" className="space-y-3">
          <h2 id="summary-heading" className="font-semibold text-navy">Project status</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={`/dashboard/projects/${projectId}/${stat.href}`}
                className="rounded-xl bg-white px-5 py-4 shadow-card transition-shadow hover:shadow-lift"
              >
                <p className="text-2xl font-bold text-navy">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-ink/55">{stat.label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Details & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Project details"
            action={<span className="text-xs font-semibold text-ink/50">{PROJECT_ROLE_LABELS[membership.role]}</span>}
          />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Location" value={project.location} />
              <Detail label="Project type" value={project.type} />
              <Detail label="Construction stage" value={stageLabel(project.constructionStage)} />
              <Detail
                label="Project budget"
                value={formatMoney(project.budgetCents ?? 0, project.currency || "KES")}
              />
              <Detail label="Created" value={new Date(project.createdAt).toLocaleDateString("en-GB")} />
              <Detail label="Your role" value={PROJECT_ROLE_LABELS[membership.role]} />
            </dl>
            {project.scope && (
              <div className="mt-4 border-t border-navy/10 pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/45">Scope of work</p>
                <p className="mt-1 text-sm text-ink/70">{project.scope}</p>
              </div>
            )}
            {membership.role === "OWNER" && (
              <div className="mt-4 border-t border-navy/10 pt-3">
                <ProjectBriefForm project={project} />
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            action={
              membership.role !== "SUPPLIER" ? (
                <Link
                  href={`/dashboard/projects/${projectId}/activity`}
                  className="text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  View all
                </Link>
              ) : undefined
            }
          />
          <CardBody>
            {activity.length === 0 ? (
              <p className="text-sm text-ink/60">No activity has been recorded yet.</p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {activity.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm text-ink">{entry.details || entry.action.replaceAll("_", " ")}</p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {new Date(entry.createdAt).toLocaleString("en-GB")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-widest text-ink/45">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
