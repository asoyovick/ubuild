import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AuthLayout({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: React.ReactNode;
}) {
  return (
    <>
      <section className="flex min-h-[80vh] items-center bg-navy py-20">
        <div className="mx-auto w-full max-w-md px-4 sm:px-6">
          <div className="rounded-2xl bg-white p-8 shadow-lift sm:p-10">
            <p className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
              {eyebrow}
            </p>
            <h1 className="heading-display mt-2 text-4xl text-navy">
              {title}
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              {subtitle}
            </p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-white/50">
            Building in Kenya?{" "}
            <Link
              href="/how-it-works"
              className="text-accent underline-offset-2 hover:underline"
            >
              See how UBuild works
            </Link>
          </p>
        </div>
      </section>
      <span className="sr-only">
        <ArrowRight aria-hidden="true" />
      </span>
    </>
  );
}
