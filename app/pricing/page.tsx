import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";

const PACKAGES = [
  {
    name: "Project Review",
    price: "From KES 15,000",
    period: "one-time",
    description:
      "A structured review of your existing plans, budget, and next steps.",
    features: [
      "Plan and budget review",
      "Risk summary in plain language",
      "Recommended next steps",
      "One coordinator call",
    ],
  },
  {
    name: "Project Coordination",
    price: "From KES 45,000",
    period: "per month",
    description:
      "Ongoing coordination for active builds, with regular verified updates.",
    features: [
      "Named project coordinator",
      "Weekly photo-backed reports",
      "Budget and milestone tracking",
      "Professional coordination",
      "Approval management",
    ],
  },
  {
    name: "Full Project Management",
    price: "Custom quote",
    period: "per project",
    description:
      "End-to-end management from planning through handover.",
    features: [
      "Everything in Coordination",
      "BOQ and quotation management",
      "Site visits and inspections",
      "Contractor and supplier liaison",
      "Close-out documentation",
    ],
  },
] as const;

export const metadata = {
  title: "Pricing",
  description:
    "UBuild service packages and quotation requests for construction planning and coordination.",
};

export default function PricingPage() {
  return (
    <>
      <section className="bg-navy py-20 sm:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            Pricing
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Clear packages, quoted up front
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Every engagement starts with a written quotation.
            Prices below are starting points — final pricing
            depends on scope, location, and project stage.
          </p>
        </div>
      </section>

      <section aria-labelledby="packages" className="bg-white py-20 sm:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div id="packages" className="sr-only">
            <SectionHeading
              align="center"
              title="Service packages"
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <article
                key={pkg.name}
                className="flex flex-col border-t border-navy/15 py-6"
              >
                <h2 className="text-xl font-semibold text-navy">{pkg.name}</h2>
                <p className="mt-1.5 text-sm text-ink/65">
                  {pkg.description}
                </p>
                <p className="mt-6">
                  <span className="text-2xl font-semibold text-navy">
                    {pkg.price}
                  </span>
                  <span className="ml-2 text-sm text-ink/55">
                    {pkg.period}
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {pkg.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-ink/75">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    href="/contact"
                    variant="secondary"
                    className="w-full"
                  >
                    Request a quote
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-ink/60">
            All engagements include a written scope and quotation
            before work begins. Currency shown in KES; projects
            outside Kenya are quoted in local currency.
          </p>
        </div>
      </section>
    </>
  );
}
