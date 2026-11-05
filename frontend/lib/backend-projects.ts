import { backendJSON } from "@/lib/backend-api";
import type { ProjectRole } from "@/lib/projects/types";

export interface BackendProject {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMembership {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  status: string;
  joinedAt: string;
  updatedAt: string;
}

export interface ProjectAccess {
  project: BackendProject;
  membership: BackendMembership;
}

export interface BackendAuditEntry {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export async function listBackendProjects(): Promise<ProjectAccess[]> {
  const result = await backendJSON<{ projects: ProjectAccess[] }>("projects");
  return result?.projects ?? [];
}

export async function getBackendProject(id: string): Promise<ProjectAccess | null> {
  return backendJSON<ProjectAccess>(`projects/${encodeURIComponent(id)}`);
}

export async function listBackendMembers(id: string) {
  const result = await backendJSON<{ members: Array<BackendMembership & { name: string; email: string }> }>(
    `projects/${encodeURIComponent(id)}/members`,
  );
  return result?.members ?? [];
}

export async function listBackendAudit(id: string) {
  const result = await backendJSON<{ entries: BackendAuditEntry[] }>(
    `projects/${encodeURIComponent(id)}/audit`,
  );
  return result?.entries ?? [];
}
