import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Legal"
          title="Terms of service"
        />
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-ink/75">
          <p>
            UBuild provides a coordination workspace for
            construction projects. The platform connects
            property owners with coordinators and
            professionals; it does not itself perform
            construction work.
          </p>
          <h2 className="text-lg font-bold text-navy">
            Using the platform
          </h2>
          <p>
            Provide accurate project information, respond to
            your coordinator&apos;s questions, and review
            approvals promptly. Records in your workspace
            are the agreed reference for decisions made
            during your project.
          </p>
          <h2 className="text-lg font-bold text-navy">
            Responsibility
          </h2>
          <p>
            UBuild coordinates and documents. Construction
            quality, safety, and regulatory compliance
            remain the responsibility of the hired
            professionals and contractors, and of the
            property owner.
          </p>
          <p className="text-ink/55">
            This is a template agreement. Replace it with
            your full legal text before launch.
          </p>
        </div>
      </div>
    </section>
  );
}
