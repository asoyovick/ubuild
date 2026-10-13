/**
 * SAMPLE DATA for the dashboard demonstration.
 *
 * These projects, budgets, milestones, reports, and approvals are
 * illustrative examples. They are NOT real UBuild projects.
 *
 * When the backend API is available, replace these imports with
 * real fetches (see README "Dashboard integration").
 */

export interface SampleProject {
  id: string;
  name: string;
  location: string;
  type: string;
  budget: number;
  spent: number;
  progress: number;
  status: "On track" | "Needs attention" | "Planning";
  coordinator: string;
  nextMilestone: string;
}

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: "UB-1042",
    name: "Karen family home",
    location: "Nairobi",
    type: "New build",
    budget: 9800000,
    spent: 6400000,
    progress: 65,
    status: "On track",
    coordinator: "Amara O.",
    nextMilestone: "Roofing inspection",
  },
  {
    id: "UB-1038",
    name: "Westlands apartment block",
    location: "Nairobi",
    type: "Multi-unit",
    budget: 42000000,
    spent: 39500000,
    progress: 92,
    status: "On track",
    coordinator: "Daniel K.",
    nextMilestone: "Finishing walkthrough",
  },
  {
    id: "UB-1051",
    name: "Kilimani renovation",
    location: "Nairobi",
    type: "Renovation",
    budget: 3200000,
    spent: 140000,
    progress: 8,
    status: "Planning",
    coordinator: "Amara O.",
    nextMilestone: "Plan approval",
  },
  {
    id: "UB-1047",
    name: "Mombasa beach house",
    location: "Mombasa",
    type: "New build",
    budget: 15600000,
    spent: 9100000,
    progress: 54,
    status: "Needs attention",
    coordinator: "Joseph M.",
    nextMilestone: "Plumbing inspection",
  },
];

export interface SampleMilestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: "complete" | "in-progress" | "upcoming";
  note: string;
}

export const SAMPLE_MILESTONES: SampleMilestone[] = [
  {
    id: "ms-1",
    projectId: "UB-1042",
    name: "Foundation & slab",
    dueDate: "2026-08-14",
    status: "complete",
    note: "Slab poured and cured. Photos attached to report R-118.",
  },
  {
    id: "ms-2",
    projectId: "UB-1042",
    name: "Frame & roofing",
    dueDate: "2026-10-30",
    status: "in-progress",
    note: "Roof trusses at 70%. Steel delivery confirmed for Thursday.",
  },
  {
    id: "ms-3",
    projectId: "UB-1042",
    name: "Finishes & handover",
    dueDate: "2027-01-20",
    status: "upcoming",
    note: "Fixture selection due before this milestone.",
  },
  {
    id: "ms-4",
    projectId: "UB-1038",
    name: "Finishing walkthrough",
    dueDate: "2026-10-22",
    status: "in-progress",
    note: "Paint and tiling nearly complete on floors 1–3.",
  },
  {
    id: "ms-5",
    projectId: "UB-1051",
    name: "Plan approval",
    dueDate: "2026-11-05",
    status: "upcoming",
    note: "Waiting on architect's revised drawings.",
  },
];

export interface SampleReport {
  id: string;
  projectId: string;
  title: string;
  date: string;
  author: string;
  photos: number;
  summary: string;
}

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    id: "R-118",
    projectId: "UB-1042",
    title: "Weekly site report — week 41",
    date: "2026-10-09",
    author: "Amara O.",
    photos: 12,
    summary:
      "Roofing progressed on the main block. One delay: tile delivery moved to Thursday. No safety incidents.",
  },
  {
    id: "R-117",
    projectId: "UB-1042",
    title: "Weekly site report — week 40",
    date: "2026-10-02",
    author: "Amara O.",
    photos: 9,
    summary:
      "Wall plastering on the ground floor finished. Electrical rough-in starts Monday.",
  },
  {
    id: "R-112",
    projectId: "UB-1047",
    title: "Inspection note — plumbing",
    date: "2026-10-07",
    author: "Joseph M.",
    photos: 6,
    summary:
      "First-floor plumbing needs rework before inspection. Quotation requested from the plumber.",
  },
];

export interface SampleApproval {
  id: string;
  projectId: string;
  title: string;
  requestedBy: string;
  date: string;
  amount: number;
  reason: string;
  impact: string;
  status: "pending" | "approved" | "declined";
}

export const SAMPLE_APPROVALS: SampleApproval[] = [
  {
    id: "ap-1",
    projectId: "UB-1042",
    title: "Roof tile order",
    requestedBy: "Amara O.",
    date: "2026-10-10",
    amount: 840000,
    reason: "Current supplier cannot meet the roofing schedule.",
    impact:
      "Adds KES 840K to materials. Keeps the roofing milestone on schedule.",
    status: "pending",
  },
  {
    id: "ap-2",
    projectId: "UB-1047",
    title: "Plumbing rework",
    requestedBy: "Joseph M.",
    date: "2026-10-08",
    amount: 165000,
    reason: "First-floor plumbing failed pressure test.",
    impact:
      "Rework adds about 4 days. No change to the overall completion date.",
    status: "pending",
  },
  {
    id: "ap-3",
    projectId: "UB-1042",
    title: "Window frame upgrade",
    requestedBy: "Amara O.",
    date: "2026-10-01",
    amount: 210000,
    reason: "Better rain sealing for the coastal-season weather.",
    impact: "One-time cost, improves long-term maintenance.",
    status: "approved",
  },
];

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
