import Link from "next/link";
import { HOW_IT_WORKS } from "@/lib/data";

export const metadata = {
  title: "How it works",
  description: "Create a UBuild project, manage project access, and review recorded project activity.",
};

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-navy py-16 sm:py-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Project workspace</p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">How UBuild works</h1>
          <p className="mt-5 max-w-2xl text-base text-white/75">
            Set up a project and manage who can access it. The workspace keeps the project details, team roles, and recorded activity together.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-18">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <li key={step.step} className="border-t border-navy/15 py-5">
                <p className="text-sm font-semibold text-primary">{step.step}</p>
                <h2 className="mt-3 text-lg font-semibold text-navy">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{step.description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 border-t border-navy/15 pt-6">
            <h2 className="font-semibold text-navy">Workflows still in development</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
              Budget tracking, milestones, progress reports, approvals, and document uploads are not available in the workspace yet.
            </p>
            <Link href="/register" className="mt-5 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">Create an account</Link>
          </div>
        </div>
      </section>
    </>
  );
}
