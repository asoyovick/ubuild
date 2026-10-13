import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "navy" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-ink hover:bg-accent-dark shadow-[0_8px_20px_-8px_rgb(255_211_35/0.7)]",
  secondary:
    "bg-primary text-white hover:bg-primary-dark shadow-[0_8px_20px_-8px_rgb(8_120_209/0.7)]",
  navy: "bg-navy text-white hover:bg-navy-deep",
  outline:
    "border-2 border-white/70 text-white hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-primary hover:text-primary-dark bg-transparent",
};

export function Button({
  variant = "primary",
  href,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...(props as object)}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function ArrowLink({
  href,
  children,
  light = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-sm font-semibold tracking-wide transition-colors ${
        light
          ? "text-primary-light hover:text-accent"
          : "text-primary hover:text-primary-dark"
      } ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
