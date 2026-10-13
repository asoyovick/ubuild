import { HOW_IT_WORKS } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="border-y border-navy/10 bg-pale py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="The process"
            title="How it works"
            description="Four steps from first idea to finished build — each one documented as you go."
          />
          <ArrowLink href="/how-it-works">Full lifecycle details</ArrowLink>
        </div>

        {/* Connected timeline */}
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Connector line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute top-7 right-[12%] left-[12%] hidden h-px bg-primary/25 lg:block"
          />
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step} className="relative">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-lg font-bold text-accent shadow-lift">
                {step.step}
              </div>
              <h3 className="mt-5 text-xl font-bold text-navy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
