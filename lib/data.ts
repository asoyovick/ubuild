import {
  ClipboardCheck,
  Wallet,
  Camera,
  Users,
  FileText,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Projects", href: "/projects" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export interface Service {
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  imageAlt: string;
  cta?: string;
  ctaHref?: string;
}

export const SERVICES: Service[] = [
  {
    title: "AI-Assisted Planning",
    description:
      "Organize project requirements, preliminary budgets, and construction milestones.",
    icon: ClipboardCheck,
    image: "/images/architect-plans.jpg",
    imageAlt: "Architectural drawings pinned to a planning board",
    cta: "Plan a project",
    ctaHref: "/contact",
  },
  {
    title: "Budget and BOQ Management",
    description:
      "Structure quantities, review quotations, and track approved spending.",
    icon: Wallet,
    image: "/images/quantity-surveyor.jpg",
    imageAlt: "Quantity surveyor reviewing cost estimates",
    cta: "See pricing",
    ctaHref: "/pricing",
  },
  {
    title: "Construction Progress Monitoring",
    description:
      "Review site reports, milestone updates, photographs, and outstanding issues.",
    icon: Camera,
    image: "/images/site-supervision.jpg",
    imageAlt: "Site supervisor documenting construction progress",
    cta: "How it works",
    ctaHref: "/how-it-works",
  },
  {
    title: "Professional Coordination",
    description:
      "Coordinate architects, engineers, quantity surveyors, contractors, and suppliers.",
    icon: Users,
    image: "/images/construction-team.jpg",
    imageAlt: "Construction professionals coordinating on site",
    cta: "Meet the team",
    ctaHref: "/about",
  },
  {
    title: "Project Documentation",
    description: "Keep important project documents organized and accessible.",
    icon: FileText,
    image: "/images/blueprint-review.jpg",
    imageAlt: "Engineers reviewing project documentation",
    cta: "Start your project",
    ctaHref: "/contact",
  },
  {
    title: "Approvals and Change Management",
    description:
      "Review proposed changes and understand their cost and schedule implications.",
    icon: GitBranch,
    image: "/images/project-meeting.jpg",
    imageAlt: "Project team reviewing a proposed change",
    cta: "Request a quote",
    ctaHref: "/pricing",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create Your Project",
    description:
      "Define your vision, project location, budget, and goals.",
  },
  {
    step: "02",
    title: "Build Your Plan",
    description:
      "Organize requirements, milestones, and professional support.",
  },
  {
    step: "03",
    title: "Monitor Progress",
    description:
      "Review reports, photographs, tasks, and project updates.",
  },
  {
    step: "04",
    title: "Manage Decisions",
    description:
      "Review expenses, approve changes, and coordinate the team.",
  },
] as const;

export const TRUST_PRINCIPLES = [
  {
    title: "Documented Project Decisions",
    description:
      "Every instruction, approval, and instruction change is recorded with a date and an owner, so nothing important lives in a WhatsApp thread.",
  },
  {
    title: "Evidence-Backed Progress Reports",
    description:
      "Site updates come with photographs and notes from the people doing the work, not summaries written days later.",
  },
  {
    title: "Clear Budget and Approval Records",
    description:
      "See what was quoted, what was approved, and what was paid — and keep the records after the project closes.",
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Services",
    links: [
      { label: "Project Planning", href: "/services" },
      { label: "Budget & BOQ Management", href: "/services" },
      { label: "Progress Monitoring", href: "/services" },
      { label: "Professional Coordination", href: "/services" },
      { label: "Pricing & Quotations", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Projects", href: "/projects" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Project Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Sign In", href: "/login" },
      { label: "Create Account", href: "/register" },
      { label: "Start a Project", href: "/contact" },
    ],
  },
] as const;

export const SITE_NAME = "UBuild";
export const TAGLINE = "Build from anywhere in the world.";
