import { SAMPLE_MILESTONES, formatDate } from "@/lib/dashboard-data";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CheckCircle2, Clock, Circle } from "lucide-react";

export const metadata = {
  title: "Milestones",
};

const MILESTONE_META = {
  complete: {
    icon: CheckCircle2,
    label: "Complete",
    tone: "text-primary",
  },
  "in-progress": {
    icon: Clock,
    label: "In progress",
    tone: "text-accent-dark",
  },
  upcoming: {
    icon: Circle,
    label: "Upcoming",
    tone: "text-ink/30",
  },
} as const;

export default function DashboardMilestonesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Milestones
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          The agreed schedule for your builds, with notes
          from the site.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Milestone timeline"
          subtitle="Ordered by project and due date."
        />
        <CardBody>
          <ol className="relative space-y-6 border-l-2 border-navy/10 pl-6">
            {SAMPLE_MILESTONES.map((milestone) => {
              const meta = MILESTONE_META[milestone.status];
              const Icon = meta.icon;
              return (
                <li key={milestone.id} className="relative">
                  <span
                    className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-white ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-bold text-ink">
                      {milestone.name}
                    </h2>
                    <span className="rounded-full bg-pale px-2.5 py-0.5 text-xs font-bold text-ink/60">
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {milestone.projectId}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">
                    Due {formatDate(milestone.dueDate)}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                    {milestone.note}
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
            Sample milestones shown for demonstration.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
