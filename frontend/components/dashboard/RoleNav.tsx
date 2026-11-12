import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  FileText,
  FolderKanban,
  Handshake,
  Landmark,
  ListChecks,
  Megaphone,
  MessageSquare,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import type { ProjectRole } from "@/lib/projects/types";
import { membershipLabel } from "@/lib/authorization";
import type { WorkspacePermission } from "@/lib/backend-projects";

export function RoleNav({
  role,
  projectId,
  permissions,
}: {
  role: ProjectRole;
  projectId: string;
  permissions: WorkspacePermission[];
}) {
  const has = (permission: WorkspacePermission) => permissions.includes(permission);
  const items = [
    { label: "Overview", href: "", icon: FolderKanban },
    ...(has("edit_tasks") || has("create_tasks")
      ? [{ label: "Tasks", href: "/tasks", icon: ListChecks }]
      : []),
    ...(role !== "SUPPLIER"
      ? [{ label: "Milestones", href: "/milestones", icon: Landmark }]
      : []),
    ...(has("view_budget")
      ? [{ label: "Budget", href: "/budget", icon: Wallet }]
      : []),
    ...(has("submit_boq") || has("view_budget")
      ? [{ label: "BOQ", href: "/boq", icon: ClipboardList }]
      : []),
    ...(has("view_documents")
      ? [{ label: "Documents", href: "/documents", icon: FileText }]
      : []),
    ...(role !== "SUPPLIER"
      ? [{ label: "Reports", href: "/reports", icon: FileBarChart }]
      : []),
    ...(has("view_approvals")
      ? [{ label: "Approvals", href: "/approvals", icon: CheckCircle2 }]
      : []),
    ...(has("submit_quotations") || has("decide_quotations")
      ? [{ label: "Quotations", href: "/quotations", icon: Receipt }]
      : []),
    ...(has("manage_issues")
      ? [{ label: "Issues", href: "/issues", icon: AlertTriangle }]
      : []),
    ...(role !== "SUPPLIER"
      ? [
          { label: "Engagements", href: "/engagements", icon: Handshake },
          { label: "Opportunities", href: "/opportunities", icon: Megaphone },
        ]
      : []),
    { label: "Messages", href: "/messages", icon: MessageSquare },
    ...(role !== "OWNER"
      ? [{ label: "My financials", href: "/financials", icon: Wallet }]
      : []),
    ...(role === "OWNER"
      ? [
          { label: "Payments", href: "/payments", icon: Receipt },
          { label: "Funds", href: "/funds", icon: Wallet },
        ]
      : role !== "SUPPLIER"
        ? [{ label: "Payments", href: "/payments", icon: Receipt }]
        : []),
    ...(has("manage_members")
      ? [{ label: "Team", href: "/team", icon: Users }]
      : []),
    ...(role !== "SUPPLIER"
      ? [{ label: "Activity", href: "/activity", icon: Activity }]
      : []),
  ];

  return (
    <nav aria-label={`${membershipLabel(role)} project navigation`} className="flex flex-wrap gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={`/dashboard/projects/${projectId}${item.href}`}
            className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink/70 hover:bg-navy/5 hover:text-navy"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
