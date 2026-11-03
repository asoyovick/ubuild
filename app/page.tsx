import { Hero } from "@/components/home/Hero";
import { ServicesOverview } from "@/components/home/ServicesOverview";
import { HowItWorks } from "@/components/home/HowItWorksSection";
import { TrustSection } from "@/components/home/TrustSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <HowItWorks />
      <TrustSection />
    </>
  );
}
