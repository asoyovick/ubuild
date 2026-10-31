import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-[92vh] items-end overflow-hidden bg-navy"
    >
      <div className="absolute inset-0">
        <Image
          src="/images/hero-construction.jpg"
          alt="Modern residential building under construction with tower crane"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="relative mx-auto w-full px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pb-28">
        <div className="max-w-3xl">
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
            Bring your vision to light. Plan,
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
      </div>

      <div className="absolute bottom-6 right-8 hidden items-center gap-2 text-xs tracking-[0.2em] text-white/50 uppercase lg:flex">
        <Play className="h-3 w-3" />
        Scroll
      </div>
    </section>
  );
}
