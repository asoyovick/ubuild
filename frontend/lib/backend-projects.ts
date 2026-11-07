import { backendJSON, backendRequest, type BackendResult } from "@/lib/backend-api";
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

export type WorkspacePermission =
  | "view_project"
  | "edit_project"
  | "manage_members"
  | "create_tasks"
  | "edit_tasks"
  | "manage_schedule"
  | "view_budget"
  | "edit_budget"
  | "approve_expenses"
  | "submit_reports"
  | "view_documents"
  | "upload_documents"
  | "submit_quotations"
  | "view_approvals"
  | "decide_approvals"
  | "request_changes"
  | "submit_boq"
  | "decide_quotations"
  | "manage_issues";

export interface TeamMember {
  userId: string;
  name: string;
  email?: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  assigneeId: string | null;
  assigneeName?: string;
  createdBy: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  dueAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  category: string;
  description: string;
  amountCents: number;
  currency: string;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  projectId: string;
  description: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  incurredAt: string | null;
  createdAt: string;
}

export interface BudgetView {
  items: BudgetItem[];
  expenses: Expense[];
  totalBudgetCents: number;
  approvedExpenseCents: number;
  pendingExpenseCents: number;
  committedCents: number;
  remainingCents: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  title: string;
  body: string;
  kind: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  projectId: string;
  title: string;
  details: string;
  kind: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  amountCents: number | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface Quotation {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName?: string;
  item: string;
  description: string;
  amountCents: number;
  currency: string;
  status: "SUBMITTED" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface BOQItem {
  id: string;
  projectId: string;
  description: string;
  quantity: number;
  unit: string;
  rateCents: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  details: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  raisedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface InvitationView {
  id: string;
  email: string;
  role: ProjectRole;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
}

export interface WorkspaceSummary {
  openTasks?: number;
  completedTasks?: number;
  totalTasks?: number;
  openIssues?: number;
  pendingApprovals?: number;
  pendingExpenses?: number;
  overdueMilestones?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  documents?: number;
}

export interface Workspace {
  project: BackendProject;
  membership: BackendMembership;
  role: ProjectRole;
  permissions: WorkspacePermission[];
  summary: WorkspaceSummary;
  team?: TeamMember[];
  tasks?: Task[];
  milestones?: Milestone[];
  reports?: Report[];
  budget?: BudgetView;
  documents?: ProjectDocument[];
  approvals?: Approval[];
  boq?: BOQItem[];
  issues?: Issue[];
  quotations?: Quotation[];
  activity?: ActivityEntry[];
}

export interface DashboardProject {
  project: BackendProject;
  membership: BackendMembership;
  summary: WorkspaceSummary;
}

export interface DashboardAssignedTask {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  dueAt: string | null;
  createdAt: string;
}

export interface DashboardDeadline {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: string;
  dueAt: string;
}

export interface DashboardPendingAction {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  kind: string;
  amountCents?: number | null;
  createdAt: string;
  actionType: "APPROVAL" | "EXPENSE";
}

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    profileRole: ProjectRole | null;
  };
  projects: DashboardProject[];
  activity: Array<ActivityEntry & { projectName: string }>;
  assignedTasks?: DashboardAssignedTask[];
  upcomingDeadlines?: DashboardDeadline[];
  pendingActions?: DashboardPendingAction[];
}

export async function listBackendProjects(): Promise<ProjectAccess[]> {
  const result = await backendJSON<{ projects: ProjectAccess[] }>("projects");
  return result?.projects ?? [];
}

export async function listBackendProjectsResult(): Promise<BackendResult<{ projects: ProjectAccess[] }>> {
  return backendRequest<{ projects: ProjectAccess[] }>("projects");
}

export async function getBackendProject(id: string): Promise<ProjectAccess | null> {
  return backendJSON<ProjectAccess>(`projects/${encodeURIComponent(id)}`);
}

export async function getBackendDashboard(): Promise<BackendResult<DashboardData>> {
  return backendRequest<DashboardData>("dashboard");
}

export async function getBackendWorkspace(id: string): Promise<BackendResult<Workspace>> {
  return backendRequest<Workspace>(`projects/${encodeURIComponent(id)}/workspace`);
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

export async function listBackendInvitations(id: string) {
  const result = await backendJSON<{ invitations: InvitationView[] }>(
    `projects/${encodeURIComponent(id)}/invitations`,
  );
  return result?.invitations ?? [];
}

export function hasPermission(
  workspace: Pick<Workspace, "permissions">,
  permission: WorkspacePermission,
): boolean {
  return workspace.permissions.includes(permission);
}
