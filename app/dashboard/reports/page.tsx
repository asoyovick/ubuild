import { SAMPLE_REPORTS, formatDate } from "@/lib/dashboard-data";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Image as ImageIcon } from "lucide-react";

export const metadata = {
  title: "Progress reports",
};

export default function DashboardReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Progress reports
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Photo-backed updates from your coordinators.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {SAMPLE_REPORTS.map((report) => (
          <Card key={report.id}>
            <CardHeader
              title={report.title}
              subtitle={`${formatDate(report.date)} · ${report.author}`}
            />
            <CardBody>
              <p className="text-sm leading-relaxed text-ink/75">
                {report.summary}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pale px-3 py-1 text-xs font-semibold text-ink/65">
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {report.photos} site photographs
                </span>
                <span className="text-xs font-semibold text-primary">
                  {report.projectId}
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
        Sample reports shown for demonstration. Photo
        attachments appear once the backend is connected.
      </p>
    </div>
  );
}
