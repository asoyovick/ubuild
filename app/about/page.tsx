import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";
import { MapPin, Users, ClipboardList } from "lucide-react";

const APPROACH = [
  {
    icon: MapPin,
    title: "Built for projects in Kenya",
    description:
      "UBuild focuses on property owners and teams coordinating construction work in Kenya.",
  },
  {
    icon: ClipboardList,
    title: "Project access by role",
    description:
      "Project memberships use defined roles to control access to project information.",
  },
  {
    icon: Users,
    title: "A record of project changes",
    description:
      "Key changes to a project, its team, and invitations are recorded in its activity history.",
  },
] as const;

export const metadata = {
  title: "About Us",
  description:
    "UBuild provides project workspaces for property owners and construction teams in Kenya.",
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
        <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            About UBuild
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Construction projects, organized in one workspace
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            UBuild gives property owners and project teams a shared place for project details, membership, and recorded activity.
          </p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="Our mission"
                title="Keep project details and access together."
                description="Construction work involves owners and teams making decisions across different locations. A shared project record helps keep the people and project information connected."
              />
              <p className="mt-6 max-w-lg text-base leading-relaxed text-ink/70">
                The current workspace supports project setup, role-based access, invitations, and activity records. Budgeting, milestones, reports, and document storage are still in development.
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
                alt="Contemporary residential home"
                width={820}
                height={620}
                className="aspect-[5/4] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-pale py-20 sm:py-24">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Our approach"
            title="A practical project workspace."
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
        <div className="mx-auto flex flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="heading-display text-3xl text-navy sm:text-4xl">
              Managing a build from abroad?
            </h2>
            <p className="mt-2 max-w-xl text-ink/70">
              Keep team access and recorded changes tied to the project.
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
