import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  Mail,
  ShieldCheck,
  Users,
  CheckCircle2,
  FileText,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support",
};

export default function DashboardHelpPage() {
  const roleGuides = [
    {
      role: "Project Owner / Client",
      icon: Wallet,
      description:
        "Track overall construction progress, monitor approved and pending expenses against your budget, review progress reports, approve change or variation requests, and invite professionals to collaborate.",
    },
    {
      role: "Project Coordinator / Manager",
      icon: Users,
      description:
        "Coordinate project delivery, assign tasks with due dates, schedule and track milestones, manage team submissions, review supplier quotations, and resolve reported site issues.",
    },
    {
      role: "Architect",
      icon: FileText,
      description:
        "Upload architectural drawings and design versions, submit variation requests, review client and contractor feedback, track drawing revisions, and coordinate design tasks.",
    },
    {
      role: "Quantity Surveyor",
      icon: CheckCircle2,
      description:
        "Build and update Bills of Quantities (BOQ), monitor budget allocations and cost variances, review contractor and supplier quotations, and prepare cost reports.",
    },
    {
      role: "Civil / Structural Engineer",
      icon: ShieldCheck,
      description:
        "Upload engineering drawings and structural calculations, submit technical inspection reports, review compliance documents, and record engineering observations.",
    },
    {
      role: "Site Supervisor",
      icon: CheckCircle2,
      description:
        "Submit daily site reports, log site photos, verify material deliveries, report site blockers and safety issues, and update task progress from the ground.",
    },
    {
      role: "Contractor",
      icon: FileText,
      description:
        "Review work packages and construction schedules, update task completion statuses, submit progress reports, request material approvals, and notify of delays.",
    },
    {
      role: "Supplier",
      icon: ShieldCheck,
      description:
        "Submit quotations securely. Your prices are strictly confidential and isolated from competing suppliers. Upload delivery notes and verify orders for authorized teams.",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Help & Support</h1>
        <p className="mt-1 text-sm text-ink/60">
          Guidance on using your role workspace, project permissions, and getting in touch.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Role-Specific Workspaces"
              subtitle="What you can do based on your active role in each project."
            />
            <CardBody className="divide-y divide-navy/10">
              {roleGuides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <div key={guide.role} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold text-navy">{guide.role}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-ink/70">
                        {guide.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Frequently Asked Questions"
              subtitle="Common questions about permissions and project access."
            />
            <CardBody className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-navy">Can I have different roles in different projects?</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/65">
                  Yes. Your registered profile role sets your default identity, but your actual
                  permissions within any project are strictly governed by your active membership in
                  that project. For instance, you could be an Architect in Project A and a Project Owner in Project B.
                </p>
              </div>
              <div className="border-t border-navy/10 pt-3">
                <h3 className="font-semibold text-navy">How are supplier quotations isolated?</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/65">
                  Suppliers only ever see quotations they have submitted themselves. Competing supplier
                  proposals, overall project budgets, and confidential internal team communications are
                  strictly inaccessible to supplier accounts.
                </p>
              </div>
              <div className="border-t border-navy/10 pt-3">
                <h3 className="font-semibold text-navy">Why is a section empty?</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/65">
                  UBuild enforces a strict no-mock-data policy. All statistics, progress bars, and records
                  reflect real input saved to the database. If a project has not yet added budget lines,
                  tasks, or milestones, an empty state is shown until real data is recorded.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Need assistance?" subtitle="Get in touch with support." />
            <CardBody className="space-y-4">
              <div className="rounded-lg bg-pale p-4">
                <div className="flex items-center gap-2 text-navy">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wider">Email support</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">support@ubuild.co.ke</p>
                <p className="mt-1 text-xs text-ink/60">
                  Available Monday to Friday, 8:00 AM – 5:00 PM EAT.
                </p>
              </div>

              <div className="rounded-lg border border-navy/15 p-4 text-xs text-ink/70">
                <p className="font-semibold text-navy">Reporting site issues or defects?</p>
                <p className="mt-1">
                  You can log blockers directly inside your project under the{" "}
                  <span className="font-semibold text-navy">Issues</span> tab, where the team coordinator
                  and site supervisor receive immediate visibility.
                </p>
              </div>

              <Link
                href="/dashboard/projects"
                className="inline-flex w-full items-center justify-center rounded bg-navy px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-navy-deep"
              >
                Go to your projects
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
