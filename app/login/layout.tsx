import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your UBuild account to access your project dashboard.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
