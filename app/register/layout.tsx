import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free UBuild account to plan and track your construction project.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
