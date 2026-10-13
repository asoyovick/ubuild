import {
  SAMPLE_PROJECTS,
  formatKES,
  type SampleProject,
} from "@/lib/dashboard-data";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

const STATUS_STYLES: Record<SampleProject["status"], string> = {
  "On track": "bg-primary/10 text-primary",
  "Needs attention": "bg-accent/25 text-accent-dark",
  Planning: "bg-navy/10 text-navy",
};

export function ProjectOverviewCards() {
  const totalBudget = SAMPLE_PROJECTS.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = SAMPLE_PROJECTS.reduce((sum, p) => sum + p.spent, 0);

  const stats = [
    { label: "Active projects", value: String(SAMPLE_PROJECTS.length) },
    { label: "Total budget", value: formatKES(totalBudget) },
    { label: "Approved spend", value: formatKES(totalSpent) },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardBody>
            <p className="text-xs font-bold tracking-widest text-primary uppercase">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-navy sm:text-3xl">
              {stat.value}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function ProjectList() {
  return (
    <Card>
      <CardHeader
        title="Your projects"
        action={
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
      <CardBody>
        <ul className="divide-y divide-navy/10">
          {SAMPLE_PROJECTS.map((project) => (
            <li
              key={project.id}
              className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-bold text-navy">
                    {project.name}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {project.type} · {project.location} ·{" "}
                  {project.coordinator}
                </p>
                <div className="mt-3 max-w-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink/70">
                      {project.progress}% complete
                    </span>
                    <span className="text-ink/55">
                      {formatKES(project.spent)} of{" "}
                      {formatKES(project.budget)}
                    </span>
                  </div>
                  <ProgressBar
                    value={project.progress}
                    tone={
                      project.status === "Needs attention"
                        ? "warning"
                        : "primary"
                    }
                  />
                </div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                  Next
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {project.status === "Needs attention" && (
                    <AlertTriangle
                      className="h-4 w-4 text-accent-dark"
                      aria-hidden="true"
                    />
                  )}
                  {project.nextMilestone}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
          Sample projects shown for demonstration. Connect your
          backend to see your real projects.
        </p>
      </CardBody>
    </Card>
  );
}
