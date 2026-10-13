import Link from "next/link";
import { ArrowUpRight, MapPin, Mail } from "lucide-react";
import { FOOTER_COLUMNS, TAGLINE } from "@/lib/data";

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      {/* CTA band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="heading-display text-4xl text-white sm:text-5xl">
              Your next build starts here.
            </h2>
            <p className="mt-3 max-w-xl text-base text-white/70">
              Take the first step toward managing your construction project with
              greater visibility and control.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-accent px-7 py-3.5 text-sm font-bold tracking-wide text-ink transition-all hover:bg-accent-dark hover:shadow-[0_12px_28px_-10px_rgb(255_211_35/0.6)]"
          >
            Start Your Project
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <span className="heading-display text-3xl tracking-wider text-white">
              UBUILD
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">
              {TAGLINE} Plan, coordinate, and monitor your construction project
              with a team on the ground and a workspace built for remote owners.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-sm font-bold tracking-widest text-white uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/65 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-sm font-bold tracking-widest text-white uppercase">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/65">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>
                  Nairobi, Kenya
                  <span className="block text-xs text-white/45">
                    Serving property owners across Kenya and abroad
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>
                  Email us through the
                  <Link
                    href="/contact"
                    className="ml-1 text-accent underline-offset-2 hover:underline"
                  >
                    contact form
                  </Link>
                </span>
              </li>
            </ul>

            <form
              className="newsletter-form mt-6"
              data-newsletter
              aria-label="Newsletter subscription"
            >
              <h3 className="text-sm font-bold tracking-widest text-white uppercase">
                Project insights
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-white/55">
                Occasional notes on planning and managing builds remotely.
              </p>
              <div className="mt-3 flex overflow-hidden rounded-md bg-white/10 focus-within:ring-2 focus-within:ring-accent">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Your email"
                  className="w-full bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-accent px-4 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
                >
                  Join
                </button>
              </div>
              <p
                className="newsletter-message mt-2 hidden text-xs"
                role="status"
                aria-live="polite"
              />
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            © {new Date().getFullYear()} UBuild. All rights reserved.
          </p>
          <ul className="flex gap-6 text-xs text-white/45">
            <li>
              <Link href="/privacy" className="transition-colors hover:text-accent">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-accent">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
