import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-pale">
      <DashboardSidebar userName={user.name} userEmail={user.email} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
