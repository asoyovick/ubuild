import Image from "next/image";
import { PenTool, Camera, Users } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";

const CARDS = [
  {
    icon: PenTool,
    title: "Planning and Budgeting",
    description:
      "Organize the scope, budget, BOQ, and project milestones.",
    image: "/images/architect-plans.jpg",
    imageAlt: "Architectural plans being reviewed at a desk",
  },
  {
    icon: Camera,
    title: "Site Progress",
    description:
      "Review construction reports and supporting site photographs.",
    image: "/images/construction-site.jpg",
    imageAlt: "Active construction site with workers documenting progress",
  },
  {
    icon: Users,
    title: "Team Coordination",
    description:
      "Keep project decisions, tasks, and approvals organized.",
    image: "/images/construction-team.jpg",
    imageAlt: "Construction team coordinating during a site walk",
  },
] as const;

export function PrecisionSection() {
  return (
    <section
      aria-labelledby="precision-heading"
      className="bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          {/* Text column */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading
              eyebrow="Project management"
              title="Precision planning. Better project coordination."
              description="A construction project is a chain of decisions. UBuild keeps each decision recorded, dated, and attached to the people responsible."
            />
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink/70">
              Whether you are across town or across an ocean, the
              workspace stays the same: current, verifiable, and easy to
              read. Your coordinator keeps it updated so you can focus on
              the decisions that need you.
            </p>
            <div className="mt-8">
              <ArrowLink href="/how-it-works">
                See the project lifecycle
              </ArrowLink>
            </div>
          </div>

          {/* Image-led cards, staggered */}
          <div className="grid gap-6 sm:grid-cols-2">
            {CARDS.map((card, index) => {
              const Icon = card.icon;
              const offset =
                index === 1 ? "sm:translate-y-8" : "";
              return (
                <article
                  key={card.title}
                  className={`group overflow-hidden rounded-xl bg-pale shadow-card transition-shadow hover:shadow-lift ${offset}`}
                >
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <Image
                      src={card.image}
                      alt={card.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="p-6">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-navy">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                      {card.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
