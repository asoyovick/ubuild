"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Array updated to exactly five items
const heroImages = [
  {
    src: "/images/foundation.jpg",
    alt: "Modern residential building under construction with tower crane",
  },
  {
    src: "/images/new.jpeg",
    alt: "Completed modern apartment interior",
  },
  {
    src: "/images/complete.jpg",
    alt: "Completed skyscraper in the city",
  },
  {
    src: "/images/progress1.jpg",
    alt: "Engineers inspecting site progress on location",
  },
  {
    src: "/images/planning.jpg",
    alt: "Architectural close-up of a modern commercial glass building façade",
  },
];

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // Dynamically wraps cleanly at 5 using heroImages.length
      setCurrentIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-[92vh] items-end overflow-hidden bg-navy"
    >
      {/* Image Wrapper Layer */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={image.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ))}

        {/* Gradient Scrim Overlay for ultimate text contrast */}
        <div className="absolute inset-0 z-15 bg-gradient-to-tr from-navy/80 via-navy/40 to-transparent mix-blend-multiply" />
      </div>

      {/* Content Layer */}
      <div className="relative z-20 mx-auto w-full px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pb-28">
        <div className="max-w-3xl">
          <h1
            id="hero-heading"
            className="heading-display text-6xl text-white font-bold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] sm:text-7xl lg:text-8xl"
          >
            Build from
            <br />
            anywhere in
            <br />
            the world.
          </h1>

          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Bring your vision to light. Plan,
            coordinate, and monitor your construction project from wherever
            you are.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button href="/contact" className="px-8 py-4 text-base shadow-lg">
              Start Your Project
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button href="/services" variant="outline" className="px-8 py-4 text-base bg-navy/20 border-white text-white hover:bg-white hover:text-navy transition-colors backdrop-blur-xs">
              Explore Our Services
            </Button>
          </div>
        </div>

        <div className="absolute bottom-6 right-8 hidden items-center gap-2 text-xs tracking-[0.2em] text-white font-semibold uppercase drop-shadow-sm lg:flex">
          <Play className="h-3 w-3 fill-white" />
          Scroll
        </div>
      </div>
    </section>
  );
}
