import Image from "next/image";
import { Eye, Wallet, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

const BENEFITS = [
  {
    icon: Eye,
    title: "Project visibility from anywhere",
    description:
      "Open the workspace from your phone and see where the project stands today.",
  },
  {
    icon: Wallet,
    title: "Clear budget and milestone tracking",
    description:
      "Approved spending and milestone status, side by side, in plain figures.",
  },
  {
    icon: Camera,
    title: "Evidence-backed construction updates",
    description:
      "Progress reports come with site photographs and the name of who reported.",
  },
] as const;

export function TechnologySection() {
  return (
    <section
      aria-labelledby="tech-heading"
      className="relative overflow-hidden bg-navy py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Large construction photograph */}
          <div className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl">
              <Image
                src="/images/building-structure.jpg"
                alt="Concrete structure of a residential building during construction"
                width={820}
                height={640}
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
            {/* Compact dashboard preview */}
            <div className="absolute -bottom-8 right-2 w-[62%] rounded-xl bg-white p-4 shadow-lift sm:right-6 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-widest text-navy uppercase">
                  Project snapshot
                </p>
                <span className="rounded-full bg-pale px-2 py-0.5 text-[10px] font-bold text-primary">
                  LIVE DEMO
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between rounded-lg bg-pale px-3 py-2 text-xs">
                  <span className="font-semibold text-ink">Roofing</span>
                  <span className="font-bold text-primary">72%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-pale px-3 py-2 text-xs">
                  <span className="font-semibold text-ink">
                    Spend this month
                  </span>
                  <span className="font-bold text-navy">KES 412K</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-pale px-3 py-2 text-xs">
                  <span className="font-semibold text-ink">
                    Open items
                  </span>
                  <span className="font-bold text-accent-dark">3</span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-ink/50">
                Sample figures shown for illustration.
              </p>
            </div>
          </div>

          {/* Copy + benefits */}
          <div className="order-1 lg:order-2">
            <SectionHeading
              dark
              eyebrow="Technology"
              title="Powered by intelligent construction technology."
              description="Bring planning, project coordination, budgets, and progress reporting into one connected workspace."
            />

            <ul className="mt-10 space-y-6">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.title} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary-light">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/70">
                        {benefit.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10">
              <Button href="/dashboard" className="px-8 py-4 text-base">
                Explore the Platform
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
