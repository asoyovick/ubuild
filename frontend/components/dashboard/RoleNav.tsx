import Link from "next/link";
import { Activity, LayoutDashboard, Users } from "lucide-react";
import type { ProjectRole } from "@/lib/projects/types";
import { membershipLabel } from "@/lib/authorization";

const MEMBER_MANAGERS: ProjectRole[] = ["OWNER", "COORDINATOR"];

export function RoleNav({
  role,
  projectId,
}: {
  role: ProjectRole;
  projectId: string;
}) {
  const items = [
    { label: "Overview", href: "", icon: LayoutDashboard },
    ...(MEMBER_MANAGERS.includes(role)
      ? [{ label: "Team", href: "/team", icon: Users }]
      : []),
    { label: "Activity", href: "/activity", icon: Activity },
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
