import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Review and approve project changes in your UBuild dashboard.",
};

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
