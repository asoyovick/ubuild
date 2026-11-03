import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarClock,
  FileCheck,
  Wallet,
  FolderOpen,
  Users,
  ClipboardList,
  Building2,
  HardHat,
  Scale,
  Eye,
  ChevronRight,
  Plus,
} from "lucide-react";
import type { ProjectRole } from "@/lib/projects/types";
import { membershipLabel } from "@/lib/authorization";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

const NAV_BY_ROLE: Record<ProjectRole, NavItem[]> = {
  OWNER: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Team", href: "/dashboard/projects/[projectId]/team", icon: Users },
    { label: "Budget", href: "/dashboard/projects/[projectId]/budget", icon: Wallet },
    { label: "Milestones", href: "/dashboard/projects/[projectId]/milestones", icon: CalendarClock },
    { label: "Reports", href: "/dashboard/projects/[projectId]/reports", icon: FileCheck },
    { label: "Approvals", href: "/dashboard/projects/[projectId]/approvals", icon: FileCheck },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
    { label: "Activity", href: "/dashboard/projects/[projectId]/activity", icon: ClipboardList },
  ],
  COORDINATOR: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Team", href: "/dashboard/projects/[projectId]/team", icon: Users },
    { label: "Tasks", href: "/dashboard/projects/[projectId]/tasks", icon: ClipboardList },
    { label: "Milestones", href: "/dashboard/projects/[projectId]/milestones", icon: CalendarClock },
    { label: "Reports", href: "/dashboard/projects/[projectId]/reports", icon: FileCheck },
    { label: "Decisions", href: "/dashboard/projects/[projectId]/decisions", icon: HardHat },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
  ],
  ARCHITECT: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Design tasks", href: "/dashboard/projects/[projectId]/design-tasks", icon: ClipboardList },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
    { label: "Plan revisions", href: "/dashboard/projects/[projectId]/plan-revisions", icon: Building2 },
    { label: "Design requests", href: "/dashboard/projects/[projectId]/design-requests", icon: Eye },
    { label: "Milestones", href: "/dashboard/projects/[projectId]/milestones", icon: CalendarClock },
  ],
  ENGINEER: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Technical tasks", href: "/dashboard/projects/[projectId]/technical-tasks", icon: ClipboardList },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
    { label: "Technical notes", href: "/dashboard/projects/[projectId]/technical-notes", icon: Eye },
    { label: "Milestones", href: "/dashboard/projects/[projectId]/milestones", icon: CalendarClock },
  ],
  QUANTITY_SURVEYOR: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "BOQ", href: "/dashboard/projects/[projectId]/boq", icon: Scale },
    { label: "Cost estimates", href: "/dashboard/projects/[projectId]/cost-estimates", icon: Wallet },
    { label: "Quotations", href: "/dashboard/projects/[projectId]/quotations", icon: ClipboardList },
    { label: "Budget requests", href: "/dashboard/projects/[projectId]/budget-requests", icon: Wallet },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
  ],
  SITE_SUPERVISOR: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Site tasks", href: "/dashboard/projects/[projectId]/site-tasks", icon: ClipboardList },
    { label: "Milestones", href: "/dashboard/projects/[projectId]/milestones", icon: CalendarClock },
    { label: "Progress reports", href: "/dashboard/projects/[projectId]/progress-reports", icon: FileCheck },
    { label: "Site photos", href: "/dashboard/projects/[projectId]/site-photos", icon: Eye },
    { label: "Issues", href: "/dashboard/projects/[projectId]/site-issues", icon: HardHat },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
  ],
  CONTRACTOR: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Work packages", href: "/dashboard/projects/[projectId]/work-packages", icon: FolderKanban },
    { label: "Tasks", href: "/dashboard/projects/[projectId]/tasks", icon: ClipboardList },
    { label: "Deadlines", href: "/dashboard/projects/[projectId]/deadlines", icon: CalendarClock },
    { label: "Submissions", href: "/dashboard/projects/[projectId]/submissions", icon: FolderOpen },
    { label: "Change requests", href: "/dashboard/projects/[projectId]/change-requests", icon: ClipboardList },
  ],
  SUPPLIER: [
    { label: "Overview", href: "/dashboard/projects/[projectId]", icon: LayoutDashboard },
    { label: "Supply requests", href: "/dashboard/projects/[projectId]/supply-requests", icon: ClipboardList },
    { label: "Quotations", href: "/dashboard/projects/[projectId]/quotations", icon: Wallet },
    { label: "Orders", href: "/dashboard/projects/[projectId]/orders", icon: FolderKanban },
    { label: "Delivery", href: "/dashboard/projects/[projectId]/delivery", icon: Eye },
    { label: "Documents", href: "/dashboard/projects/[projectId]/documents", icon: FolderOpen },
  ],
};

export function RoleNav({
  role,
  projectId,
}: {
  role: ProjectRole;
  projectId: string;
}) {
  const items = NAV_BY_ROLE[role] ?? [];
  const roleLabel = membershipLabel(role);

  return (
    <nav aria-label={`${roleLabel} navigation`} className="space-y-1">
      <div className="rounded-lg bg-navy/5 px-3 py-2">
        <span className="text-xs font-bold tracking-widest text-navy/50 uppercase">
          {roleLabel}
        </span>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href.replace("[projectId]", projectId)}
            className="inline-flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-navy/5"
          >
            <Icon className="h-4.5 w-4.5 shrink-0 text-navy/60" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-accent/25 px-2 py-0.5 text-xs font-bold text-accent-dark">
                {item.badge}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-ink/30" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleActions({
  role,
  projectId,
}: {
  role: ProjectRole;
  projectId: string;
}) {
  const primaryActions: Record<
    ProjectRole,
    Array<{ label: string; href: string; icon: typeof Plus }>
  > = {
    OWNER: [
      { label: "Add team member", href: `/dashboard/projects/${projectId}/team?action=invite`, icon: Plus },
      { label: "Create milestone", href: `/dashboard/projects/${projectId}/milestones?action=create`, icon: Plus },
    ],
    COORDINATOR: [
      { label: "Add task", href: `/dashboard/projects/${projectId}/tasks?action=create`, icon: Plus },
      { label: "Create milestone", href: `/dashboard/projects/${projectId}/milestones?action=create`, icon: Plus },
    ],
    ARCHITECT: [
      { label: "New design task", href: `/dashboard/projects/${projectId}/design-tasks?action=create`, icon: Plus },
      { label: "Upload drawing", href: `/dashboard/projects/${projectId}/documents?action=upload`, icon: Plus },
    ],
    ENGINEER: [
      { label: "New technical task", href: `/dashboard/projects/${projectId}/technical-tasks?action=create`, icon: Plus },
      { label: "Upload document", href: `/dashboard/projects/${projectId}/documents?action=upload`, icon: Plus },
    ],
    QUANTITY_SURVEYOR: [
      { label: "New BOQ", href: `/dashboard/projects/${projectId}/boq?action=create`, icon: Plus },
      { label: "Submit quotation", href: `/dashboard/projects/${projectId}/quotations?action=create`, icon: Plus },
    ],
    SITE_SUPERVISOR: [
      { label: "New site task", href: `/dashboard/projects/${projectId}/site-tasks?action=create`, icon: Plus },
      { label: "New report", href: `/dashboard/projects/${projectId}/progress-reports?action=create`, icon: Plus },
    ],
    CONTRACTOR: [
      { label: "Update task", href: `/dashboard/projects/${projectId}/tasks?action=update`, icon: Plus },
      { label: "Mark complete", href: `/dashboard/projects/${projectId}/submissions?action=create`, icon: Plus },
    ],
    SUPPLIER: [
      { label: "New quotation", href: `/dashboard/projects/${projectId}/quotations?action=create`, icon: Plus },
      { label: "Update delivery", href: `/dashboard/projects/${projectId}/delivery?action=edit`, icon: Plus },
    ],
  };

  const actions = primaryActions[role] ?? [];
  if (actions.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-accent-dark"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
