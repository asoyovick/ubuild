import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Legal"
          title="Privacy policy"
        />
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-ink/75">
          <p>
            UBuild collects only the information needed to
            run your project: your name, email, the project
            details you provide, and the updates you and
            your coordinators add to your workspace.
          </p>
          <h2 className="text-lg font-bold text-navy">
            What we store
          </h2>
          <p>
            Account details, project plans, budgets,
            milestones, reports, photographs, and approval
            records. In this deployment, submissions are
            stored locally on the server and are never
            sold or shared with third parties.
          </p>
          <h2 className="text-lg font-bold text-navy">
            Your rights
          </h2>
          <p>
            You can request a copy of your data, ask for
            corrections, or request deletion at any time
            through the contact form.
          </p>
          <p className="text-ink/55">
            This is a template policy. Replace it with your
            full legal text before launch.
          </p>
        </div>
      </div>
    </section>
  );
}
