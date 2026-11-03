import { redirect } from "next/navigation";
import { acceptInvitation } from "@/lib/authorization";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

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

  let result = null;
  let error = "";
  if (token) {
    try {
      result = await acceptInvitation(token);
    } catch (err) {
      error = err instanceof Error ? err.message : "Something went wrong.";
    }
  }

  if (!token) {
    error = "No invitation token was provided.";
  } else if (result === null && !error) {
    error = "This invitation is invalid, expired, or has already been used.";
  }

  return (
    <div className="min-h-screen bg-pale">
      <DashboardSidebar userName={user.name} userEmail={user.email} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-10">
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
                    Use the link sent to your email to accept an invitation.
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
      </div>
    </div>
  );
}
