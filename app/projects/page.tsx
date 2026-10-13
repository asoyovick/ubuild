import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowLink } from "@/components/ui/Button";
import Image from "next/image";

interface ShowcaseProject {
  title: string;
  location: string;
  type: string;
  status: "Completed" | "In progress" | "Planning";
  image: string;
  imageAlt: string;
}

/**
 * Public showcase. Projects shown here are illustrative
 * examples of the kind of work UBuild supports.
 */
const SHOWCASE: ShowcaseProject[] = [
  {
    title: "Karen family home",
    location: "Nairobi",
    type: "Residential",
    status: "In progress",
    image: "/images/residential-development.jpg",
    imageAlt: "Residential development under construction",
  },
  {
    title: "Westlands apartment block",
    location: "Nairobi",
    type: "Multi-unit residential",
    status: "Completed",
    image: "/images/completed-house.jpg",
    imageAlt: "Completed contemporary residence",
  },
  {
    title: "Kilimani renovation",
    location: "Nairobi",
    type: "Renovation",
    status: "Planning",
    image: "/images/house-exterior.jpg",
    imageAlt: "Modern house exterior before renovation",
  },
  {
    title: "Mombasa beach house",
    location: "Mombasa",
    type: "Residential",
    status: "In progress",
    image: "/images/construction-site.jpg",
    imageAlt: "Active construction site",
  },
  {
    title: "Kigali duplex",
    location: "Kigali",
    type: "Duplex",
    status: "Planning",
    image: "/images/modern-home.jpg",
    imageAlt: "Modern home design",
  },
  {
    title: "Nakuru starter home",
    location: "Nakuru",
    type: "Residential",
    status: "Completed",
    image: "/images/structural-work.jpg",
    imageAlt: "Structural work on a residential build",
  },
];

const STATUS_STYLES: Record<ShowcaseProject["status"], string> = {
  Completed: "bg-primary/10 text-primary",
  "In progress": "bg-accent/20 text-accent-dark",
  Planning: "bg-navy/10 text-navy",
};

export const metadata = {
  title: "Projects",
  description:
    "A showcase of the kinds of construction projects UBuild supports. Sign in to view your own projects.",
};

export default function ProjectsPage() {
  return (
    <>
      <section className="bg-navy py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.22em] text-accent uppercase">
            Projects
          </p>
          <h1 className="heading-display mt-3 max-w-3xl text-5xl text-white sm:text-6xl">
            Projects we support
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            A showcase of project types in our portfolio. Your
            own projects live in your private dashboard —
            sign in to see them.
          </p>
        </div>
      </section>

      <section aria-labelledby="showcase-heading" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div id="showcase-heading" className="sr-only">
            <SectionHeading
              eyebrow="Showcase"
              title="Recent and ongoing work"
            />
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SHOWCASE.map((project) => (
              <article
                key={project.title}
                className="group overflow-hidden rounded-xl bg-pale shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <Image
                    src={project.image}
                    alt={project.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <span
                    className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-navy">
                    {project.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-ink/60">
                    {project.type} · {project.location}
                  </p>
                  <div className="mt-4">
                    <ArrowLink href="/contact">
                      Discuss a similar project
                    </ArrowLink>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-2xl bg-pale p-8 text-center sm:p-12">
            <h2 className="heading-display text-3xl text-navy sm:text-4xl">
              Your project could be next
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink/70">
              Create a free account to start planning your
              project with a named coordinator.
            </p>
            <div className="mt-6">
              <ArrowLink href="/register" className="text-base">
                Create an account
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
