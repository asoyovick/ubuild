import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { RoleNav } from "@/components/dashboard/RoleNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approvals",
};

export default async function ProjectApprovalsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  let membership;
  try {
    membership = await requireProjectPermission(projectId, "view_approvals");
  } catch {
    redirect("/dashboard");
  }

  const project = await getProject(projectId);
  if (!project) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Approvals</h1>
          <p className="mt-1 text-sm text-ink/60">
            Review requested changes before money or schedule moves.
          </p>
        </div>
        <RoleNav role={membership.role} projectId={projectId} />
      </div>

      <p className="border-t border-navy/15 py-5 text-sm text-ink/70">
        Approval tracking is not available in this workspace yet.
      </p>
    </div>
  );
}
