import { SERVICES } from "@/lib/data";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";
import Image from "next/image";

export function ServicesOverview() {
  return (
    <section
      aria-labelledby="services-heading"
      className="bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div id="services-heading">
            <SectionHeading
              eyebrow="What we do"
              title="Smarter construction. Greater control."
              description="One workspace for planning, budgets, coordination, and progress — built for owners who cannot visit the site every day."
            />
          </div>
          <ArrowLink href="/services">View all services</ArrowLink>
        </div>

        {/* Asymmetrical grid: first card spans two columns, others vary */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            // First card is tall (2 rows), 5th card is tall too — asymmetric rhythm
            const tall = index === 0 || index === 4;
            return (
              <article
                key={service.title}
                className={`group relative overflow-hidden rounded-xl bg-pale shadow-card transition-shadow hover:shadow-lift ${
                  tall ? "sm:row-span-2 sm:flex sm:flex-col" : ""
                }`}
              >
                <div
                  className={`relative overflow-hidden ${
                    tall ? "aspect-[4/3] sm:flex-1" : "aspect-[16/10]"
                  }`}
                >
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div
                  className={`flex flex-col p-6 ${tall ? "sm:flex-1" : ""}`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-navy">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">
                    {service.description}
                  </p>
                  {service.cta && service.ctaHref && (
                    <div className="mt-auto pt-4">
                      <ArrowLink href={service.ctaHref}>{service.cta}</ArrowLink>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
