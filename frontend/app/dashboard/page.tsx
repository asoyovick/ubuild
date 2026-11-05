import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { listBackendProjects } from "@/lib/backend-projects";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const user = await requireAuthenticatedUser();
  const projects = await listBackendProjects();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          {user.profileRole ? `${PROJECT_ROLE_LABELS[user.profileRole]} workspace` : "Overview"}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Welcome, {user.name}. Project access and actions are based on your membership in each project.
        </p>
      </header>

      {projects.length === 0 ? (
        <section className="border-t border-navy/15 py-8" aria-labelledby="empty-projects">
          <h2 id="empty-projects" className="text-lg font-semibold text-navy">No projects yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/65">
            Create a project workspace or accept an invitation to see project details here.
          </p>
          <Link href="/contact" className="mt-5 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Create or join a project
          </Link>
        </section>
      ) : (
        <section aria-labelledby="projects-heading">
          <div className="flex items-baseline justify-between gap-4 border-b border-navy/15 pb-3">
            <h2 id="projects-heading" className="font-semibold text-navy">Your projects</h2>
            <Link href="/dashboard/projects" className="text-sm font-semibold text-primary hover:underline">All projects</Link>
          </div>
          <ul className="divide-y divide-navy/10">
            {projects.map(({ membership, project }) => (
              <li key={membership.id}>
                <Link href={`/dashboard/projects/${project.id}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-pale/60">
                  <span>
                    <span className="block font-semibold text-navy">{project.name}</span>
                    <span className="mt-1 block text-sm text-ink/60">{project.type} · {project.location}</span>
                  </span>
                  <span className="text-xs font-medium text-ink/55">{membership.role.replaceAll("_", " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
