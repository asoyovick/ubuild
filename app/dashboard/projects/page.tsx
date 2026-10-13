import {
  SAMPLE_PROJECTS,
  formatKES,
  type SampleProject,
} from "@/lib/dashboard-data";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const metadata = {
  title: "Projects",
};

const STATUS_STYLES: Record<SampleProject["status"], string> = {
  "On track": "bg-primary/10 text-primary",
  "Needs attention": "bg-accent/25 text-accent-dark",
  Planning: "bg-navy/10 text-navy",
};

export default function DashboardProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Projects</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every project you are building with UBuild.
        </p>
      </div>

      <Card>
        <CardHeader
          title="All projects"
          subtitle="Budget and progress are updated from site reports."
        />
        <CardBody>
          <div className="grid gap-5 md:grid-cols-2">
            {SAMPLE_PROJECTS.map((project) => (
              <article
                key={project.id}
                className="rounded-lg border border-navy/10 bg-pale/60 p-5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold text-navy">
                    {project.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {project.id} · {project.type} · {project.location}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  Coordinator: {project.coordinator}
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink/70">
                      {project.progress}% complete
                    </span>
                    <span className="text-ink/55">
                      {formatKES(project.spent)} of {formatKES(project.budget)}
                    </span>
                  </div>
                  <ProgressBar
                    value={project.progress}
                    tone={project.status === "Needs attention" ? "warning" : "primary"}
                    label={`${project.name}: ${project.progress}% complete`}
                  />
                </div>

                <p className="mt-4 border-t border-navy/10 pt-3 text-sm">
                  <span className="font-semibold text-ink">Next:</span>{" "}
                  <span className="text-ink/70">{project.nextMilestone}</span>
                </p>
              </article>
            ))}
          </div>
          <p className="mt-5 rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
            Sample projects shown for demonstration. Connect your
            backend to see your real projects.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
