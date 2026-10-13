import { Hero } from "@/components/home/Hero";
import { ServicesOverview } from "@/components/home/ServicesOverview";
import { TrustPanel } from "@/components/home/TrustPanel";
import { TechnologySection } from "@/components/home/TechnologySection";
import { PrecisionSection } from "@/components/home/PrecisionSection";
import { HowItWorks } from "@/components/home/HowItWorksSection";
import { TrustSection } from "@/components/home/TrustSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <TrustPanel />
      <TechnologySection />
      <PrecisionSection />
      <HowItWorks />
      <TrustSection />
    </>
  );
}
