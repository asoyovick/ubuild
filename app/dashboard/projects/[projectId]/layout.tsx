import { redirect } from "next/navigation";
import { requireProjectMembership } from "@/lib/authorization";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/projects/store";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RoleNav } from "@/components/dashboard/RoleNav";
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

  let membership;
  try {
    membership = await requireProjectMembership(projectId);
  } catch {
    redirect("/dashboard");
  }

  const project = await getProject(projectId);
  if (!project) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-pale">
      <DashboardSidebar userName={user.name} userEmail={user.email} />
      <div className="lg:pl-64">
        <div className="mx-auto px-4 py-8 sm:px-6 lg:px-10">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-navy sm:text-3xl">
                  {project.name}
                </h1>
                <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy">
                  {membership.role}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {project.type} · {project.location}
              </p>
            </div>
            <RoleNav role={membership.role} projectId={projectId} />
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
