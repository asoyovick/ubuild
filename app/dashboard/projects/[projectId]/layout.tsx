import { redirect } from "next/navigation";
import { requireProjectMembership } from "@/lib/authorization";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/projects/store";
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
    <div>
      <header className="mb-6 border-b border-navy/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-navy sm:text-3xl">{project.name}</h1>
              <span className="text-xs font-semibold text-ink/55">{membership.role.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-1 text-sm text-ink/60">{project.type} · {project.location}</p>
          </div>
          <RoleNav role={membership.role} projectId={projectId} />
        </div>
      </header>
      {children}
    </div>
  );
}
