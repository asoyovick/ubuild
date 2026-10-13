import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const metadata = {
  title: "Settings",
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
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Your account and notification preferences.
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
            <div>
              <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                Member since
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-widest text-ink/45 uppercase">
                Plan
              </dt>
              <dd className="mt-1">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Project Coordination
                </span>
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifications" subtitle="Choose what reaches your inbox." />
        <CardBody>
          <ul className="space-y-4">
            {[
              { label: "Weekly progress summary", hint: "A digest every Monday." },
              { label: "Approval requests", hint: "Immediately when a decision is needed." },
              { label: "Milestone completions", hint: "When a milestone is marked complete." },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink/55">{item.hint}</p>
                </div>
                <span className="rounded-full bg-pale px-3 py-1 text-xs font-semibold text-ink/55">
                  On
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-ink/55">
            Notification preferences are part of the
            demonstration interface.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
