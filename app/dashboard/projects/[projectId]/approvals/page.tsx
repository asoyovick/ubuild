import { redirect } from "next/navigation";
import { requireProjectPermission } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { RoleNav } from "@/components/dashboard/RoleNav";
import { formatKES, formatDate } from "@/lib/dashboard-data";
import { Inbox } from "lucide-react";
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

      <Card>
        <CardBody>
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Inbox className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-navy">
              Nothing waiting for your decision
            </h2>
            <p className="mt-2 max-w-sm text-sm text-ink/60">
              When a coordinator requests a change, it appears here with its cost and schedule impact.
            </p>
          </div>
        </CardBody>
      </Card>

      <p className="rounded-md bg-pale px-4 py-2.5 text-xs text-ink/60">
        Approval data is not available yet.
      </p>
    </div>
  );
}
