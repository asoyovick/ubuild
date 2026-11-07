import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBackendWorkspace } from "@/lib/backend-projects";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { Card, CardBody } from "@/components/ui/Card";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const result = await getBackendWorkspace(projectId);
  if (!result.ok || !result.data) {
    if (result.status === 401) {
      redirect("/login");
    }
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Project workspace</h1>
        </header>
        <Card>
          <CardBody>
            <div className="flex flex-col items-start gap-4 py-6">
              <h2 className="font-semibold text-navy">
                {result.status === 404
                  ? "Project not found or not available to you"
                  : "We couldn't load this project"}
              </h2>
              <p className="text-sm text-ink/65">
                {result.status === 404
                  ? "This project does not exist or your membership is not active. Project data is only available to active members."
                  : result.error}
              </p>
              <div className="flex flex-wrap gap-3">
                <RetryButton />
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { project, membership, permissions } = result.data;

  return (
    <div>
      <header className="mb-6 border-b border-navy/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-navy sm:text-3xl">{project.name}</h1>
              <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy">
                {PROJECT_ROLE_LABELS[membership.role]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink/60">{project.type} · {project.location}</p>
            {project.description && (
              <p className="mt-2 max-w-2xl text-sm text-ink/65">{project.description}</p>
            )}
          </div>
          <RoleNav role={membership.role} projectId={projectId} permissions={permissions} />
        </div>
      </header>
      {children}
    </div>
  );
}
