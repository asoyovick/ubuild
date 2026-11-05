import { SERVICES } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";

export function ServicesOverview() {
  return (
    <section
      aria-labelledby="services-heading"
      className="bg-white py-16 sm:py-20"
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div id="services-heading">
            <SectionHeading
              eyebrow="What we do"
              title="Construction support, from plan to handover."
              description="Coordinate project planning, budgets, site updates, and decisions with your team in one place."
            />
          </div>
          <ArrowLink href="/services">View all services</ArrowLink>
        </div>

        <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.title}
                className="border-t border-navy/15 py-6"
              >
                <div className="flex items-center gap-3">
                  <span className="text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-navy">
                    {service.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{service.description}</p>
                {service.cta && service.ctaHref && <div className="mt-3"><ArrowLink href={service.ctaHref}>{service.cta}</ArrowLink></div>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
