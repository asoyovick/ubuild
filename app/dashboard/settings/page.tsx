import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const metadata = {
  title: "Account",
};

export default async function DashboardSettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Account
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Your account details.
        </p>
      </div>

      <Card>
        <CardHeader title="Account" />
        <CardBody>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {user.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                Email
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {user.email}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

    </div>
  );
}
