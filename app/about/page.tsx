import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";
import { MapPin, Users, ClipboardList } from "lucide-react";

const APPROACH = [
  {
    icon: MapPin,
    title: "On the ground, where your project is",
    description:
      "Our coordinators work in the market where your build happens. They know the local professionals, materials pricing, and approval realities.",
  },
  {
    icon: ClipboardList,
    title: "Written down, every time",
    description:
      "Decisions, quantities, and approvals are recorded in plain language. If it isn't documented, it didn't happen.",
  },
  {
    icon: Users,
    title: "Built around the owner",
    description:
      "The workspace is written for property owners, not only for engineers. Ask anything, any time — your coordinator answers.",
  },
] as const;

export const metadata = {
  title: "About Us",
  description:
    "UBuild connects property owners and investors with construction professionals and digital tools for remote project management.",
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy py-20 sm:py-24">
        <div className="absolute inset-0">
          <Image
            src="/images/about-site.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25"
            aria-hidden="true"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            About UBuild
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Construction expertise, managed with technology
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            UBuild connects property owners and investors with
            construction professionals and digital tools for
            planning, budgets, milestones, progress reports,
            documentation, and approvals.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="Our mission"
                title="Distance should not decide build quality."
                description="Many property owners manage construction from another city or country. That makes information the most valuable material on any site. We make sure owners always know what is happening, what it costs, and what happens next."
              />
              <p className="mt-6 max-w-lg text-base leading-relaxed text-ink/70">
                We began in Kenya, working with property owners in
                Nairobi and with diaspora customers managing
                family homes from abroad. The same problems
                appear everywhere: budgets that drift, milestones
                that slip, and decisions lost in message threads.
                UBuild exists to close that gap.
              </p>
              <div className="mt-8">
                <ArrowLink href="/contact">
                  Talk to our team
                </ArrowLink>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl shadow-lift">
              <Image
                src="/images/completed-house.jpg"
                alt="Completed contemporary home delivered through careful coordination"
                width={820}
                height={620}
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-pale py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our approach"
            title="Practical, documented, accountable."
            align="center"
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {APPROACH.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-xl bg-white p-7 shadow-card"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="heading-display text-3xl text-navy sm:text-4xl">
              Managing a build from abroad?
            </h2>
            <p className="mt-2 max-w-xl text-ink/70">
              We work with owners in different time zones every
              day. Your coordinator is your local presence.
            </p>
          </div>
          <ArrowLink href="/contact" className="shrink-0 text-base">
            Describe your project
          </ArrowLink>
        </div>
      </section>
    </>
  );
}
