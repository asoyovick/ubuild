interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  dark = false,
}: SectionHeadingProps) {
  return (
    <div
      className={`max-w-2xl ${
        align === "center" ? "mx-auto text-center" : "text-left"
      }`}
    >
      {eyebrow && (
        <p
          className={`mb-3 text-xs font-bold tracking-[0.22em] uppercase ${
            dark ? "text-accent" : "text-primary"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`heading-display text-4xl sm:text-5xl lg:text-6xl ${
          dark ? "text-white" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${
            dark ? "text-white/75" : "text-ink/70"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
