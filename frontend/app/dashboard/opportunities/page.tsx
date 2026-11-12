import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getMyApplications, getOpenOpportunities } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { OpportunityMarketplace } from "@/components/dashboard/OpportunityMarketplace";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { stage = "", q = "" } = await searchParams;
  const [opportunities, applications] = await Promise.all([
    getOpenOpportunities({ stage, query: q }),
    getMyApplications(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Opportunities</h1>
        <p className="mt-1 text-sm text-ink/60">
          Discover the work clients are publishing, apply with your proposed fee, and track your applications.
          A UBuild engagement only begins when the client selects you and approves the agreed terms.
        </p>
      </div>

      {!opportunities.ok || !opportunities.data ? (
        <Card>
          <CardBody>
            <p className="text-sm text-ink/65">{opportunities.error}</p>
            <div className="mt-4">
              <RetryButton />
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Open opportunities"
            subtitle="An application is not an engagement and creates no payment rights."
          />
          <CardBody>
            <OpportunityMarketplace
              opportunities={opportunities.data.opportunities}
              myApplications={applications.ok ? applications.data?.applications ?? [] : []}
              stage={stage}
              query={q}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
