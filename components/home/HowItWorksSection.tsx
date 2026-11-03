import { HOW_IT_WORKS } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="border-y border-navy/10 bg-pale py-16 sm:py-20"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="The process"
            title="How it works"
            description="Set up a project workspace, manage team roles, and review recorded changes."
          />
          <ArrowLink href="/how-it-works">Full lifecycle details</ArrowLink>
        </div>

        <ol className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step} className="border-t border-navy/15 py-5">
              <p className="text-sm font-semibold text-primary">{step.step}</p>
              <h3 className="mt-3 text-lg font-semibold text-navy">
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
