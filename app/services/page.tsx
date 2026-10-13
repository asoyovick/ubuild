import { SERVICES } from "@/lib/data";
import { ArrowLink } from "@/components/ui/Button";
import Image from "next/image";

export const metadata = {
  title: "Services",
  description:
    "Construction technology and coordination services: planning, budget and BOQ management, progress monitoring, professional coordination, documentation, and approvals.",
};

export default function ServicesPage() {
  return (
    <>
      {/* Page header */}
      <section className="bg-navy py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            What we do
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Construction technology &amp; coordination services
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Practical support for property owners who plan, fund, and
            follow their build from a distance.
          </p>
        </div>
      </section>

      {/* Services list */}
      <section aria-labelledby="services-list" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {SERVICES.map((service, index) => {
              const Icon = service.icon;
              const flip = index % 2 === 1;
              return (
                <article
                  key={service.title}
                  className={`grid items-center gap-8 lg:grid-cols-2 ${
                    flip ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-card">
                    <Image
                      src={service.image}
                      alt={service.imageAlt}
                      width={760}
                      height={500}
                      className="aspect-[19/12] w-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-navy text-accent">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-2xl font-bold text-navy sm:text-3xl">
                      {service.title}
                    </h2>
                    <p className="mt-3 max-w-lg text-base leading-relaxed text-ink/70">
                      {service.description}
                    </p>
                    <p className="mt-3 max-w-lg text-sm text-ink/55">
                      Included in every UBuild project workspace, with
                      your coordinator keeping each part current as the
                      build moves forward.
                    </p>
                    {service.cta && service.ctaHref && (
                      <div className="mt-5">
                        <ArrowLink href={service.ctaHref}>
                          {service.cta}
                        </ArrowLink>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pale py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="heading-display text-3xl text-navy sm:text-4xl">
              Not sure where to start?
            </h2>
            <p className="mt-2 max-w-xl text-ink/70">
              Tell us about your project and a coordinator will
              suggest the right services for your location and budget.
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
