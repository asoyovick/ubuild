import { redirect } from "next/navigation";
import { backendRequest } from "@/lib/backend-api";
import { Card, CardBody } from "@/components/ui/Card";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import type { BackendMembership, BackendProject } from "@/lib/backend-projects";

export const metadata = {
  title: "Accept invitation",
};

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  let result: { project?: BackendProject; membership?: BackendMembership } | null = null;
  let error = "";
  if (token) {
    const response = await backendRequest<{
      project?: BackendProject;
      membership?: BackendMembership;
    }>("invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      result = response.data;
    } else {
      error = response.error;
    }
  }

  if (!token) {
    error = "No invitation token was provided.";
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">
            Accept invitation
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Join a project you have been invited to.
          </p>

          {error ? (
            <Card className="mt-6">
              <CardBody>
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                    <AlertCircle className="h-7 w-7 text-red-600" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-navy">
                    Could not accept invitation
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-ink/60">
                    {error}
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : result ? (
            <Card className="mt-6">
              <CardBody>
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-navy">
                    You joined {result.project?.name ?? "the project"}
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-ink/60">
                    You are now a member of this project as{" "}
                    {result.membership?.role}.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardBody>
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-lg font-bold text-navy">
                    No invitation to accept
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-ink/60">
                    Open the invitation link shared with you to join a project.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
            >
              Back to dashboard
            </a>
          </div>
    </div>
  );
}
