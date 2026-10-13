import { HOW_IT_WORKS } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const STEP_DETAILS = [
  {
    image: "/images/modern-home.jpg",
    imageAlt: "Completed modern residential home exterior",
    points: [
      "Tell us your vision, location, and target budget",
      "We confirm feasibility and next steps",
      "Your coordinator is assigned within one working day",
    ],
  },
  {
    image: "/images/blueprint-review.jpg",
    imageAlt: "Team reviewing building plans",
    points: [
      "Scope, BOQ, and milestone schedule organized",
      "Professionals matched to your project",
      "Budget broken into payable stages",
    ],
  },
  {
    image: "/images/site-supervision.jpg",
    imageAlt: "Site supervisor documenting work in progress",
    points: [
      "Photo-backed progress reports at each milestone",
      "Outstanding issues flagged with suggested actions",
      "Ask questions any time through the workspace",
    ],
  },
  {
    image: "/images/project-meeting.jpg",
    imageAlt: "Project team reviewing decisions together",
    points: [
      "Quotations and change requests reviewed with cost impact",
      "Approvals recorded with date and owner",
      "Close-out documents archived for you",
    ],
  },
] as const;

export const metadata = {
  title: "How It Works",
  description:
    "The UBuild project lifecycle: create your project, build your plan, monitor progress, and manage decisions.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-navy py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            The process
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            How it works
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Four steps from first idea to finished build. Each step
            is documented in your workspace, so nothing depends on
            memory or scattered messages.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ol className="space-y-16">
            {HOW_IT_WORKS.map((step, index) => {
              const detail = STEP_DETAILS[index];
              const flip = index % 2 === 1;
              return (
                <li
                  key={step.step}
                  className={`grid items-center gap-10 lg:grid-cols-2 ${
                    flip ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-card">
                    <Image
                      src={detail.image}
                      alt={detail.imageAlt}
                      width={760}
                      height={520}
                      className="aspect-[19/13] w-full object-cover"
                    />
                    <span className="absolute top-4 left-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-ink shadow-lift">
                      {step.step}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                      {step.title}
                    </h2>
                    <p className="mt-3 max-w-lg text-base leading-relaxed text-ink/70">
                      {step.description}
                    </p>
                    <ul className="mt-5 space-y-3">
                      {detail.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-3 text-sm text-ink/75"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-20 text-center">
            <SectionHeading
              align="center"
              title="Ready when you are."
              description="Start with a conversation about your project — there is no obligation."
            />
            <div className="mt-8">
              <Button href="/contact" className="px-8 py-4 text-base">
                Start Your Project
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
