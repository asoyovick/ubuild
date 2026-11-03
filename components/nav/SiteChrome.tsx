"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/nav/Navbar";
import { Footer } from "@/components/nav/Footer";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const isDashboard = usePathname().startsWith("/dashboard");

  return (
    <>
      {!isDashboard && <Navbar />}
      <main id="main-content">{children}</main>
      {!isDashboard && <Footer />}
    </>
  );
}
