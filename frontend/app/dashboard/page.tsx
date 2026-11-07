import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getBackendDashboard } from "@/lib/backend-projects";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { formatDate, formatDateTime, formatMoney, label } from "@/lib/workspace-client";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  HelpCircle,
  ListChecks,
  Wallet,
} from "lucide-react";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireAuthenticatedUser();
  const result = await getBackendDashboard();

  if (!result.ok || !result.data) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-ink/60">Welcome, {user.name}.</p>
        </header>
        <Card>
          <CardBody>
            <div className="flex flex-col items-start gap-4 py-6">
              <AlertTriangle className="h-6 w-6 text-accent-dark" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-navy">We couldn&apos;t load your dashboard</h2>
                <p className="mt-1 text-sm text-ink/65">{result.error}</p>
              </div>
              <RetryButton />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const {
    projects,
    activity,
    assignedTasks = [],
    upcomingDeadlines = [],
    pendingActions = [],
  } = result.data;

  const totals = projects.reduce(
    (sum, item) => ({
      tasks: sum.tasks + (item.summary.openTasks ?? 0),
      approvals: sum.approvals + (item.summary.pendingApprovals ?? 0),
      expenses: sum.expenses + (item.summary.pendingExpenses ?? 0),
      issues: sum.issues + (item.summary.openIssues ?? 0),
      documents: sum.documents + (item.summary.documents ?? 0),
    }),
    { tasks: 0, approvals: 0, expenses: 0, issues: 0, documents: 0 },
  );

  const profileRoles = Array.from(
    new Set(projects.map((item) => item.membership.role)),
  );

  return (
    <div className="space-y-8">
      <header className="border-b border-navy/15 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">
              {user.profileRole ? `${PROJECT_ROLE_LABELS[user.profileRole]} workspace` : "Overview"}
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Welcome, <span className="font-semibold text-navy">{user.name}</span>. Project access and actions are strictly determined by your active membership in each construction project.
            </p>
            {profileRoles.length > 0 && (
              <p className="mt-2 text-xs font-semibold tracking-wide text-ink/45 uppercase">
                Active project roles: {profileRoles.map((role) => PROJECT_ROLE_LABELS[role]).join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/help"
              className="inline-flex items-center gap-1.5 rounded-md border border-navy/20 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-pale"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Role guides
            </Link>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-ink hover:bg-accent-dark"
            >
              My Projects ({projects.length})
            </Link>
          </div>
        </div>
      </header>

      {projects.length === 0 ? (
        <section className="py-8" aria-labelledby="empty-projects">
          <Card>
            <CardBody className="py-10 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-navy/40" aria-hidden="true" />
              <h2 id="empty-projects" className="mt-4 text-lg font-bold text-navy">
                No active projects yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/65">
                You do not currently belong to any construction projects. Create a new project workspace or accept an invitation to see real tasks, budgets, milestones, and reports here.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/dashboard/projects"
                  className="rounded bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark"
                >
                  Create or join a project
                </Link>
              </div>
            </CardBody>
          </Card>
        </section>
      ) : (
        <>
          {/* Overview statistics across all projects */}
          <section aria-labelledby="attention-heading" className="space-y-4">
            <h2 id="attention-heading" className="font-semibold text-navy">Across your projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={ListChecks} label="Open tasks" value={totals.tasks} />
              <StatCard icon={CheckCircle2} label="Pending approvals" value={totals.approvals} />
              <StatCard icon={Wallet} label="Pending expenses" value={totals.expenses} />
              <StatCard icon={AlertTriangle} label="Open issues" value={totals.issues} />
              <StatCard icon={FileText} label="Documents" value={totals.documents} />
            </div>
          </section>

          {/* Pending decisions and actions requiring immediate attention */}
          {pendingActions.length > 0 && (
            <section aria-labelledby="pending-actions-heading" className="space-y-4">
              <div className="flex items-center justify-between border-b border-navy/15 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent-dark" aria-hidden="true" />
                  <h2 id="pending-actions-heading" className="font-semibold text-navy">
                    Actions requiring your attention
                  </h2>
                </div>
                <span className="rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-bold text-navy">
                  {pendingActions.length} pending
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingActions.map((action) => (
                  <Card key={`${action.actionType}-${action.id}`}>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                            {action.actionType === "APPROVAL" ? `${action.kind} approval` : "Expense decision"}
                          </span>
                          <p className="mt-1.5 font-semibold text-navy">{action.title}</p>
                          <p className="text-xs text-ink/55">
                            {action.projectName} · {formatDateTime(action.createdAt)}
                          </p>
                        </div>
                        {action.amountCents !== undefined && action.amountCents !== null && (
                          <span className="shrink-0 text-sm font-bold text-navy">
                            {formatMoney(action.amountCents)}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-navy/10 pt-2">
                        <Link
                          href={
                            action.actionType === "APPROVAL"
                              ? `/dashboard/projects/${action.projectId}/approvals`
                              : `/dashboard/projects/${action.projectId}/budget`
                          }
                          className="inline-flex text-xs font-semibold text-primary hover:underline"
                        >
                          Review and decide &rarr;
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Personal assigned tasks */}
          <section aria-labelledby="assigned-tasks-heading" className="space-y-4">
            <div className="flex items-center justify-between border-b border-navy/15 pb-3">
              <h2 id="assigned-tasks-heading" className="font-semibold text-navy">
                Tasks assigned to you
              </h2>
              <span className="text-xs font-medium text-ink/55">
                {assignedTasks.length === 0 ? "None assigned" : `${assignedTasks.length} active`}
              </span>
            </div>
            {assignedTasks.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-ink/65">
                    No open tasks are currently assigned to you across your active projects.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assignedTasks.map((task) => (
                  <Card key={task.id}>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-navy">{task.title}</p>
                          <p className="truncate text-xs text-ink/55">{task.projectName}</p>
                        </div>
                        <span className="rounded bg-navy/10 px-2 py-0.5 text-xs font-bold text-navy">
                          {label(task.status)}
                        </span>
                      </div>
                      {task.description && (
                        <p className="line-clamp-2 text-xs text-ink/70">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between border-t border-navy/10 pt-2 text-xs">
                        <span className="text-ink/55">
                          {task.dueAt ? `Due ${formatDate(task.dueAt)}` : "No due date"}
                        </span>
                        <Link
                          href={`/dashboard/projects/${task.projectId}/tasks`}
                          className="font-semibold text-primary hover:underline"
                        >
                          Task board &rarr;
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming deadlines and schedule */}
          <section aria-labelledby="deadlines-heading" className="space-y-4">
            <div className="flex items-center justify-between border-b border-navy/15 pb-3">
              <h2 id="deadlines-heading" className="font-semibold text-navy">
                Upcoming deadlines & schedule
              </h2>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-ink/65">
                    No scheduled milestone deadlines recorded in your projects.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {upcomingDeadlines.map((deadline) => (
                  <Card key={deadline.id}>
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-navy line-clamp-1">{deadline.title}</p>
                        <span className="shrink-0 rounded bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
                          {label(deadline.status)}
                        </span>
                      </div>
                      <p className="text-xs text-ink/55 line-clamp-1">{deadline.projectName}</p>
                      <div className="flex items-center justify-between border-t border-navy/10 pt-2 text-xs">
                        <span className="flex items-center gap-1 font-medium text-navy">
                          <Calendar className="h-3 w-3 text-ink/40" aria-hidden="true" />
                          {formatDate(deadline.dueAt)}
                        </span>
                        <Link
                          href={`/dashboard/projects/${deadline.projectId}/milestones`}
                          className="font-semibold text-primary hover:underline"
                        >
                          Timeline &rarr;
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Active project workspaces */}
          <section aria-labelledby="projects-heading" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-navy/15 pb-3">
              <h2 id="projects-heading" className="font-semibold text-navy">Your project workspaces</h2>
              <Link href="/dashboard/projects" className="text-sm font-semibold text-primary hover:underline">
                View all ({projects.length})
              </Link>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {projects.map(({ project, membership, summary }) => {
                const totalMilestones = summary.totalMilestones ?? 0;
                const completedMilestones = summary.completedMilestones ?? 0;
                const milestoneProgress =
                  totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : null;

                const totalTasks = summary.totalTasks ?? 0;
                const completedTasks = summary.completedTasks ?? 0;
                const taskProgress =
                  totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;

                return (
                  <Card key={project.id}>
                    <CardHeader
                      title={project.name}
                      subtitle={`${project.type} · ${project.location}`}
                      action={
                        <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
                          {PROJECT_ROLE_LABELS[membership.role]}
                        </span>
                      }
                    />
                    <CardBody className="space-y-4">
                      {/* Real Progress Indicators */}
                      {milestoneProgress !== null && (
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-navy">Milestones progress</span>
                            <span className="text-ink/60">
                              {completedMilestones} of {totalMilestones} ({milestoneProgress}%)
                            </span>
                          </div>
                          <ProgressBar value={milestoneProgress} label="Milestones progress" tone="primary" />
                        </div>
                      )}

                      {taskProgress !== null && (
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-navy">Task completion</span>
                            <span className="text-ink/60">
                              {completedTasks} of {totalTasks} ({taskProgress}%)
                            </span>
                          </div>
                          <ProgressBar value={taskProgress} label="Task completion" tone="navy" />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <SummaryLine label="Open tasks" value={summary.openTasks} />
                        <SummaryLine label="Pending approvals" value={summary.pendingApprovals} />
                        <SummaryLine label="Pending expenses" value={summary.pendingExpenses} />
                        <SummaryLine label="Open issues" value={summary.openIssues} />
                        <SummaryLine label="Documents" value={summary.documents} />
                        <SummaryLine label="Overdue milestones" value={summary.overdueMilestones} />
                      </div>

                      {summary.overdueMilestones !== undefined && summary.overdueMilestones > 0 && (
                        <p className="text-xs font-semibold text-accent-dark">
                          {summary.overdueMilestones} overdue milestone
                          {summary.overdueMilestones === 1 ? "" : "s"} require attention
                        </p>
                      )}

                      <div className="border-t border-navy/10 pt-2">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="inline-flex text-sm font-semibold text-primary hover:text-primary-dark"
                        >
                          Open {PROJECT_ROLE_LABELS[membership.role]} workspace &rarr;
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Recent activity audit log */}
          <section aria-labelledby="activity-heading" className="space-y-4">
            <h2 id="activity-heading" className="font-semibold text-navy">Recent project activity</h2>
            <Card>
              <CardBody>
                {activity.length === 0 ? (
                  <p className="text-sm text-ink/65">No activity has been recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-navy/10">
                    {activity.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-navy/50" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {entry.details || label(entry.action)}
                          </p>
                          <p className="mt-0.5 text-xs text-ink/50">
                            {entry.projectName} · {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label: title,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/10">
          <Icon className="h-5 w-5 text-navy" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-bold text-navy">{value}</span>
          <span className="block truncate text-xs font-medium text-ink/55">{title}</span>
        </span>
      </CardBody>
    </Card>
  );
}

function SummaryLine({ label: title, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div>
      <p className="text-xs text-ink/50">{title}</p>
      <p className="font-semibold text-navy">{value}</p>
    </div>
  );
}
