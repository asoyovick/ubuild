import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getProfessionalDirectory } from "@/lib/ubuild";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RetryButton } from "@/components/dashboard/RetryButton";
import { ProfessionalFinder } from "@/components/dashboard/ProfessionalFinder";
import { ProfessionalProfileForm } from "@/components/dashboard/ProfessionalProfileForm";

export const metadata: Metadata = { title: "Professionals" };

export default async function ProfessionalsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const result = await getProfessionalDirectory();
  if (!result.ok || !result.data) {
    if (result.status === 401) {
      redirect("/login");
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Professionals</h1>
        <Card>
          <CardBody>
            <p className="text-sm text-ink/65">{result.error}</p>
            <div className="mt-4">
              <RetryButton />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Professionals</h1>
        <p className="mt-1 text-sm text-ink/60">
          Find professionals by construction stage and scope, then record an engagement on your project.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Find the right professional"
          subtitle="Ranking uses platform qualifications, UBuild ratings and stage fit."
        />
        <CardBody>
          <ProfessionalFinder
            professionals={result.data.professionals}
            stages={result.data.stages}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Your professional profile"
          subtitle="Published profiles can be matched to client opportunities and rated after a completed engagement."
        />
        <CardBody>
          <ProfessionalProfileForm />
        </CardBody>
      </Card>
    </div>
  );
}
