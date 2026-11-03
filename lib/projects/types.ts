export type ProjectRole =
  | "OWNER"
  | "COORDINATOR"
  | "ARCHITECT"
  | "ENGINEER"
  | "QUANTITY_SURVEYOR"
  | "SITE_SUPERVISOR"
  | "CONTRACTOR"
  | "SUPPLIER";

export type MembershipStatus = "ACTIVE" | "PENDING" | "REMOVED";

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  location: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  invitedByUserId: string;
  email: string;
  role: ProjectRole;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
}

export const PROJECT_ROLES: ProjectRole[] = [
  "OWNER",
  "COORDINATOR",
  "ARCHITECT",
  "ENGINEER",
  "QUANTITY_SURVEYOR",
  "SITE_SUPERVISOR",
  "CONTRACTOR",
  "SUPPLIER",
];

export const ROLE_ALLOWED_TO_INVITE = [
  "OWNER",
  "COORDINATOR",
] as const;

export const OWNER_ONLY_ACTIONS = ["removeMember", "changeRole", "deleteProject"] as const;
