import Link from "next/link";

const PROJECT_TYPES = [
  { title: "New builds", description: "Residential and commercial construction from site preparation through handover." },
  { title: "Renovations", description: "Alterations, extensions, and upgrades to existing properties." },
  { title: "Multi-unit developments", description: "Apartments and other projects delivered across multiple units or phases." },
];

export const metadata = {
  title: "Project types",
  description: "Construction project types supported by UBuild, including new builds, renovations, and multi-unit developments.",
};

export default function ProjectsPage() {
  return (
    <>
      <section className="bg-navy py-16 sm:py-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Project types</p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">Construction work we support</h1>
          <p className="mt-5 max-w-2xl text-base text-white/75">
            UBuild coordinates construction projects for property owners and teams in Kenya.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-18" aria-label="Construction project types">
        <div className="mx-auto grid gap-x-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {PROJECT_TYPES.map((type) => (
            <article key={type.title} className="border-t border-navy/15 py-5">
              <h2 className="text-lg font-semibold text-navy">{type.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{type.description}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto mt-10 px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-ink/70">
            Ask us about your project’s location, scope, and stage of work.
          </p>
          <Link href="/contact" className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">Contact UBuild</Link>
        </div>
      </section>
    </>
  );
}
