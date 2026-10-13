import { ShieldCheck, Camera, Wallet } from "lucide-react";
import { TRUST_PRINCIPLES } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ICONS = [ShieldCheck, Camera, Wallet] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-principles-heading"
      className="bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Our promise"
          title="Built on transparency and trust."
          description="Remote construction only works when information is honest and verifiable. These are the principles every UBuild project follows."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TRUST_PRINCIPLES.map((principle, index) => {
            const Icon = ICONS[index];
            return (
              <article
                key={principle.title}
                className="rounded-xl border border-navy/10 bg-pale p-7 shadow-card transition-shadow hover:shadow-lift"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-navy text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-navy">
                  {principle.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-ink/60">
          Customer testimonials will appear here once real project
          partners share their experiences.{" "}
          <span className="font-semibold text-ink">
            No reviews are shown until they are verified.
          </span>
        </p>
      </div>
    </section>
  );
}
