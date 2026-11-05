import { redirect } from "next/navigation";

export const metadata = { title: "Milestones" };

export default function DashboardMilestonesPage() {
  redirect("/dashboard/projects");
}
