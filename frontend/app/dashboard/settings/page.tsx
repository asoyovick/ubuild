import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import { listBackendProjects } from "@/lib/backend-projects";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Account",
};

export default async function DashboardSettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await listBackendProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Account Profile
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Your personal account and project membership details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal Information" subtitle="Registered user profile." />
          <CardBody>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {user.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                  Email Address
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                  Registered Profile Role
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {user.profileRole ? PROJECT_ROLE_LABELS[user.profileRole] : "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                  Account Status
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary-dark">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Active
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Project Memberships"
            subtitle={`${projects.length} active project${projects.length === 1 ? "" : "s"}`}
            action={
              <Link href="/dashboard/projects" className="text-xs font-semibold text-primary hover:underline">
                Manage
              </Link>
            }
          />
          <CardBody>
            {projects.length === 0 ? (
              <p className="text-sm text-ink/60">
                You do not have any active project memberships.
              </p>
            ) : (
              <ul className="divide-y divide-navy/10">
                {projects.map(({ project, membership }) => (
                  <li key={membership.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="truncate text-sm font-semibold text-navy hover:text-primary"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-ink/50">{project.location} · {project.type}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold text-navy">
                      {PROJECT_ROLE_LABELS[membership.role]}
                    </span>
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
