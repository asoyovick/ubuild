import { FolderKanban, ShieldCheck, Mail } from "lucide-react";
import { TRUST_PRINCIPLES } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ICONS = [FolderKanban, ShieldCheck, Mail] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-principles-heading"
      className="bg-white py-16 sm:py-20"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Workspace basics"
          title="Project details, team access, and activity in one place."
          description="Each record is tied to a project and visible according to the member’s role."
        />

        <div className="mt-10 grid gap-x-8 md:grid-cols-3">
          {TRUST_PRINCIPLES.map((principle, index) => {
            const Icon = ICONS[index];
            return (
              <article
                key={principle.title}
                className="border-t border-navy/15 py-6"
              >
                <span className="text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy">
                  {principle.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}
