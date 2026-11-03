import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authorization";
import {
  listMembershipsForProject,
  getProject,
  listProjects,
} from "@/lib/projects/store";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ProjectSelector } from "@/components/dashboard/ProjectSelector";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Projects",
};

export default async function DashboardProjectsPage() {
  const user = await requireAuthenticatedUser();
  const memberships = await listMembershipsForProjectForUser(user.id);
  const membershipsWithProject = await enrichMembershipsWithProjects(memberships);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Projects</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every project you are building with UBuild.
        </p>
      </div>

      {membershipsWithProject.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ArrowRight className="h-7 w-7 text-primary" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-navy">
                You haven't joined a project yet
              </h2>
              <p className="mt-2 max-w-sm text-sm text-ink/60">
                After you create or accept an invitation to a project, it will appear here.
              </p>
              <Button href="/contact" variant="navy" className="mt-6">
                Start a project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <ProjectSelector
            projects={membershipsWithProject.map((m) => ({
              id: m.projectId,
              name: m.project?.name ?? "Untitled project",
            }))}
          />

          <div className="mt-6 space-y-4">
            {membershipsWithProject.map((membership) => {
              const project = membership.project;
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
                      {membership.role}
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

import type { ProjectMembership } from "@/lib/projects/store";

async function listMembershipsForProjectForUser(
  userId: string,
): Promise<ProjectMembership[]> {
  const all = await listMembershipsFromStore();
  return all.filter(
    (m) => m.userId === userId && m.status === "ACTIVE",
  );
}

async function listMembershipsFromStore(): Promise<ProjectMembership[]> {
  const { listMemberships } = await import("@/lib/projects/store");
  return listMemberships();
}

async function enrichMembershipsWithProjects(
  memberships: ProjectMembership[],
): Promise<
  Array<{
    id: string;
    userId: string;
    projectId: string;
    role: string;
    status: string;
    joinedAt: string;
    updatedAt: string;
    project?: Awaited<ReturnType<typeof getProject>>;
  }>
> {
  const projects = await Promise.all(
    memberships.map(async (m) => {
      const project = await getProject(m.projectId);
      return { ...m, project };
    }),
  );
  return projects;
}
