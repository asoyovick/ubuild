import { requireAuthenticatedUser } from "@/lib/authorization";
import { listBackendProjects } from "@/lib/backend-projects";
import { PROJECT_ROLE_LABELS } from "@/lib/projects/types";
import { Card, CardBody } from "@/components/ui/Card";
import { ProjectCreateForm } from "@/components/dashboard/ProjectCreateForm";
import Link from "next/link";

export const metadata = {
  title: "Projects",
};

export default async function DashboardProjectsPage() {
  await requireAuthenticatedUser();
  const membershipsWithProject = await listBackendProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Projects</h1>
        <p className="mt-1 text-sm text-ink/60">
          Projects you can access.
        </p>
      </div>

      <ProjectCreateForm />

      {membershipsWithProject.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-10 text-center">
                <h2 className="mt-5 text-lg font-bold text-navy">
                  No projects yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-ink/60">
                Create a project above or accept an invitation to join an existing one.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {membershipsWithProject.map(({ membership, project }) => {
              if (!project) {
                return null;
              }
              return (
                <Link
                  key={membership.id}
                  href={`/dashboard/projects/${membership.projectId}`}
                  className="block rounded-lg border border-navy/10 bg-pale/60 p-5 transition-colors hover:bg-pale"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-navy">
                      {project.name}
                    </h2>
                    <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-bold text-navy">
                      {PROJECT_ROLE_LABELS[membership.role]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">
                    {project.type} · {project.location}
                  </p>
                  <p className="mt-1 text-xs text-ink/55">
                    Joined{" "}
                    {new Date(membership.joinedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
