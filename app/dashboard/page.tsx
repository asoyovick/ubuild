import { ProjectOverviewCards, ProjectList } from "@/components/dashboard/ProjectOverviewCards";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { SAMPLE_MILESTONES, SAMPLE_REPORTS, formatDate } from "@/lib/dashboard-data";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Circle } from "lucide-react";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardOverviewPage() {
  const upcoming = SAMPLE_MILESTONES
    .filter((m) => m.status !== "complete")
    .slice(0, 3);

  const latestReports = SAMPLE_REPORTS.slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">
            Project overview
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Welcome back. Here is where your projects stand.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
        >
          Start a new project
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <ProjectOverviewCards />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <ProjectList />

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Upcoming milestones"
              action={
                <Link
                  href="/dashboard/milestones"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  All
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            <CardBody>
              <ol className="space-y-4">
                {upcoming.map((milestone) => (
                  <li key={milestone.id} className="flex gap-3">
                    {milestone.status === "in-progress" ? (
                      <Clock
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-dark"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-ink/30"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {milestone.name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/55">
                        {milestone.projectId} · due{" "}
                        {formatDate(milestone.dueDate)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Latest reports"
              action={
                <Link
                  href="/dashboard/reports"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  All
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            <CardBody>
              <ul className="space-y-4">
                {latestReports.map((report) => (
                  <li key={report.id} className="flex gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {report.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/55">
                        {formatDate(report.date)} · {report.author} ·{" "}
                        {report.photos} photos
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
