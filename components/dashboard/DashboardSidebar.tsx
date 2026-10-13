"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarClock,
  FileCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Milestones", href: "/dashboard/milestones", icon: CalendarClock },
  { label: "Reports", href: "/dashboard/reports", icon: FileCheck },
  { label: "Approvals", href: "/dashboard/approvals", icon: FileCheck },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  }

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
              <path
                d="M4 4h4v9a4 4 0 0 0 8 0V4"
                stroke="#062A59"
                strokeWidth="3"
                strokeLinecap="square"
              />
              <path d="M4 20h16" stroke="#062A59" strokeWidth="3" strokeLinecap="square" />
            </svg>
          </span>
          <span className="heading-display text-xl tracking-wider">UBUILD</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="rounded p-1 text-white/60 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/25 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 ${active ? "text-accent" : "text-white/50"}`}
                    aria-hidden="true"
                  />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-navy">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="truncate text-xs text-white/50">{userEmail}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href="/contact"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-accent-dark"
          >
            New project
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {signingOut ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        <span className="heading-display text-lg tracking-wider text-white">UBUILD</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded p-2 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-deep/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 bottom-0 left-0 w-72 shadow-lift">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
