import { redirect } from "next/navigation";

export const metadata = { title: "Progress reports" };

export default function DashboardReportsPage() {
  redirect("/dashboard/projects");
}
