import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listBackendProjects } from "@/lib/backend-projects";
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
  const projects = await listBackendProjects();

  return (
    <div className="min-h-screen bg-pale">
      <DashboardSidebar
        userName={user.name}
        userEmail={user.email}
        profileRole={user.profileRole}
        projects={projects.map(({ project, membership }) => ({
          id: project.id,
          name: project.name,
          role: membership.role,
        }))}
      />
      <div className="lg:pl-64">
        <div className="mx-auto px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
