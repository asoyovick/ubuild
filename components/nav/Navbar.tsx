"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { NAV_LINKS } from "@/lib/data";

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="UBuild home">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-accent">
        {/* Geometric U / foundation mark */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M4 4h4v9a4 4 0 0 0 8 0V4"
            stroke="#062A59"
            strokeWidth="3"
            strokeLinecap="square"
          />
          <path d="M4 20h16" stroke="#062A59" strokeWidth="3" strokeLinecap="square" />
        </svg>
      </span>
      <span
        className={`heading-display text-2xl tracking-wider ${
          dark ? "text-white" : "text-navy"
        }`}
      >
        UBUILD
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dark = pathname === "/";

  const navClasses = dark
    ? "absolute inset-x-0 top-0 z-50 bg-navy/95 text-white backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-0"
    : "sticky top-0 z-50 border-b border-navy/10 bg-white/95 text-navy backdrop-blur-sm";

  return (
    <header className={navClasses}>
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Logo dark={dark} />

        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`text-sm font-medium tracking-wide transition-colors ${
                  pathname === link.href
                    ? "text-accent"
                    : dark
                      ? "text-white/85 hover:text-accent"
                      : "text-ink/75 hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/login"
            className={`text-sm font-medium tracking-wide transition-colors ${
              dark ? "text-white/85 hover:text-accent" : "text-ink/75 hover:text-primary"
            }`}
          >
            Login
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-sm font-bold tracking-wide text-ink transition-all hover:bg-accent-dark hover:shadow-[0_8px_20px_-8px_rgb(255_211_35/0.7)]"
          >
            Start Your Project
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`rounded-md p-2 lg:hidden ${
            dark ? "text-white" : "text-navy"
          }`}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-navigation" className="border-t border-white/10 bg-navy lg:hidden">
          <ul className="space-y-1 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={`block rounded-md px-3 py-2.5 text-sm font-medium tracking-wide ${
                    pathname === link.href
                      ? "bg-white/10 text-accent"
                      : "text-white/85 hover:bg-white/5 hover:text-accent"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5 hover:text-accent"
              >
                Login
              </Link>
            </li>
            <li className="pt-2">
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-accent px-3 py-3 text-center text-sm font-bold text-ink hover:bg-accent-dark"
              >
                Start Your Project
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
