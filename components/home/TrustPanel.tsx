import Image from "next/image";
import { CheckCircle2, Calendar, Wallet, ArrowRight, User } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Project overview panel.
 * All figures below are SAMPLE DATA for demonstration only.
 */
const SAMPLE_MILESTONES = [
  { name: "Foundation & slab", status: "Complete" },
  { name: "Frame & roofing", status: "In progress" },
  { name: "Finishes & handover", status: "Upcoming" },
] as const;

export function TrustPanel() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="border-y border-navy/10 bg-pale py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Coordinator profile panel */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-lift">
              <Image
                src="/images/engineer-tablet.jpg"
                alt="Project coordinator reviewing site photographs on a tablet"
                width={640}
                height={720}
                className="aspect-[8/9] w-full object-cover"
              />
            </div>

            {/* Floating role card */}
            <div className="absolute -bottom-6 left-6 right-6 rounded-xl bg-navy p-5 text-white shadow-lift sm:left-10 sm:right-auto sm:max-w-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-navy">
                  <User className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">Your project coordinator</p>
                  <p className="text-xs text-white/65">
                    Based in Nairobi · replies within one working day
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-primary-light">
                <span className="flex -space-x-2">
                  {[
                    "bg-accent text-ink",
                    "bg-primary text-white",
                    "bg-primary-light text-navy",
                  ].map((tone, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-navy text-[10px] font-bold ${tone}`}
                    >
                      {["QS", "AR", "SE"][i]}
                    </span>
                  ))}
                </span>
                Quantity surveyor, architect &amp; site engineer on call
              </div>
            </div>
          </div>

          {/* Headline + sample summary card */}
          <div>
            <SectionHeading
              eyebrow="Project overview"
              title="Delivering clarity, accountability, and confidence."
              description="Every project gets a named coordinator, a written plan, and updates you can verify — so distance never means guessing."
            />

            {/* Light-blue project summary card — SAMPLE DATA */}
            <div className="mt-8 rounded-2xl border border-primary/15 bg-primary-light/40 p-6 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
                    Sample project
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy">
                    3-bed home — Karen, Nairobi
                  </p>
                </div>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary">
                  Demonstration data
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink">
                      Budget status
                    </span>
                    <span className="text-ink/70">
                      KES 6.4M of KES 9.8M approved
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-white"
                    role="progressbar"
                    aria-valuenow={65}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Budget approved: 65 percent (sample)"
                  >
                    <div className="h-full w-[65%] rounded-full bg-primary" />
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {SAMPLE_MILESTONES.map((milestone) => (
                    <li
                      key={milestone.name}
                      className="flex items-center justify-between rounded-lg bg-white/70 px-4 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2.5 font-medium text-ink">
                        <CheckCircle2
                          className={`h-4 w-4 ${
                            milestone.status === "Complete"
                              ? "text-primary"
                              : milestone.status === "In progress"
                                ? "text-accent-dark"
                                : "text-ink/30"
                          }`}
                          aria-hidden="true"
                        />
                        {milestone.name}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          milestone.status === "Complete"
                            ? "text-primary"
                            : milestone.status === "In progress"
                              ? "text-accent-dark"
                              : "text-ink/45"
                        }`}
                      >
                        {milestone.status}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-primary/15 pt-4 text-sm text-ink/75">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Next site visit: Friday
                  </span>
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    2 quotations awaiting approval
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/dashboard"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                See your project dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
