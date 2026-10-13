import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-[92vh] items-end overflow-hidden bg-navy"
    >
      {/* Background photograph */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-construction.jpg"
          alt="Modern residential building under construction with tower crane"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Deep navy overlay, heavier on the left for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/70 to-navy/30" />
        <div className="absolute inset-0 bg-navy/20" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pb-28">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/60 px-4 py-1.5 text-xs font-semibold tracking-[0.18em] text-primary-light uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Construction technology · Kenya &amp; diaspora
          </p>

          <h1
            id="hero-heading"
            className="heading-display text-6xl text-white drop-shadow-lg sm:text-7xl lg:text-8xl"
          >
            Build from
            <br />
            anywhere in
            <br />
            the world.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Your vision. Our technology. A trusted team on the ground. Plan,
            coordinate, and monitor your construction project from wherever
            you are.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button href="/contact" className="px-8 py-4 text-base">
              Start Your Project
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button href="/services" variant="outline" className="px-8 py-4 text-base">
              Explore Our Services
            </Button>
          </div>
        </div>

        {/* Hero strip: quick orientation for remote owners */}
        <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/15 backdrop-blur-sm sm:gap-0 sm:rounded-xl">
          {[
            { k: "Planning", v: "Scope, budget & milestones" },
            { k: "Coordination", v: "Pros on the ground" },
            { k: "Reporting", v: "Photo-backed updates" },
          ].map((item) => (
            <div
              key={item.k}
              className="bg-navy/70 px-4 py-4 sm:px-6 sm:py-5"
            >
              <dt className="text-xs font-bold tracking-[0.16em] text-accent uppercase">
                {item.k}
              </dt>
              <dd className="mt-1 text-sm text-white/85">{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 right-8 hidden items-center gap-2 text-xs tracking-[0.2em] text-white/50 uppercase lg:flex">
        <Play className="h-3 w-3" />
        Scroll
      </div>
    </section>
  );
}
