import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Project,
  ProjectMembership,
  Invitation,
  PasswordReset,
  AuditLogEntry,
} from "./types";

const DATA_DIR = process.env.UBUILD_DATA_DIR
  ? path.resolve(process.env.UBUILD_DATA_DIR)
  : path.join(process.cwd(), "data");

const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const MEMBERSHIPS_FILE = path.join(DATA_DIR, "memberships.json");
const INVITATIONS_FILE = path.join(DATA_DIR, "invitations.json");
const PASSWORD_RESETS_FILE = path.join(DATA_DIR, "password-resets.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function listProjects(): Promise<Project[]> {
  return readJson<Project[]>(PROJECTS_FILE, []);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const projects = await listProjects();
  return projects.find((p) => p.id === id);
}

export async function createProject(
  project: Project,
): Promise<void> {
  const projects = await listProjects();
  projects.push(project);
  await writeJson(PROJECTS_FILE, projects);
}

export async function updateProject(
  project: Project,
): Promise<void> {
  const projects = await listProjects();
  await writeJson(
    PROJECTS_FILE,
    projects.map((p) => (p.id === project.id ? project : p)),
  );
}

/* ---------- Memberships ---------- */

export async function listMemberships(): Promise<ProjectMembership[]> {
  return readJson<ProjectMembership[]>(MEMBERSHIPS_FILE, []);
}

export async function listMembershipsForProject(
  projectId: string,
): Promise<ProjectMembership[]> {
  const memberships = await listMemberships();
  return memberships.filter(
    (m) => m.projectId === projectId && m.status === "ACTIVE",
  );
}

export async function findMembership(
  userId: string,
  projectId: string,
): Promise<ProjectMembership | undefined> {
  const memberships = await listMemberships();
  return memberships.find(
    (m) =>
      m.userId === userId &&
      m.projectId === projectId &&
      m.status === "ACTIVE",
  );
}

export async function createMembership(
  membership: ProjectMembership,
): Promise<void> {
  const memberships = await listMemberships();
  memberships.push(membership);
  await writeJson(MEMBERSHIPS_FILE, memberships);
}

export async function updateMembership(
  membership: ProjectMembership,
): Promise<void> {
  const memberships = await listMemberships();
  await writeJson(
    MEMBERSHIPS_FILE,
    memberships.map((m) =>
      m.id === membership.id ? membership : m,
    ),
  );
}

/* ---------- Invitations ---------- */

export async function listInvitations(): Promise<Invitation[]> {
  return readJson<Invitation[]>(INVITATIONS_FILE, []);
}

export async function findInvitationByToken(
  token: string,
): Promise<Invitation | undefined> {
  const invitations = await listInvitations();
  return invitations.find((i) => i.token === token);
}

export async function createInvitation(
  invitation: Invitation,
): Promise<void> {
  const invitations = await listInvitations();
  invitations.push(invitation);
  await writeJson(INVITATIONS_FILE, invitations);
}

export async function updateInvitation(
  invitation: Invitation,
): Promise<void> {
  const invitations = await listInvitations();
  await writeJson(
    INVITATIONS_FILE,
    invitations.map((i) =>
      i.id === invitation.id ? invitation : i,
    ),
  );
}

/* ---------- Password resets ---------- */

export async function listPasswordResets(): Promise<PasswordReset[]> {
  return readJson<PasswordReset[]>(PASSWORD_RESETS_FILE, []);
}

export async function createPasswordReset(
  reset: PasswordReset,
): Promise<void> {
  const resets = await listPasswordResets();
  resets.push(reset);
  await writeJson(PASSWORD_RESETS_FILE, resets);
}

export async function consumePasswordReset(
  token: string,
): Promise<PasswordReset | undefined> {
  const resets = await listPasswordResets();
  const record = resets.find(
    (r) => r.token === token && !r.usedAt && new Date(r.expiresAt) > new Date(),
  );
  if (!record) return undefined;
  await writeJson(
    PASSWORD_RESETS_FILE,
    resets.map((r) =>
      r.token === token ? { ...r, usedAt: new Date().toISOString() } : r,
    ),
  );
  return record;
}

/* ---------- Audit ---------- */

export async function appendAuditEntry(entry: AuditLogEntry): Promise<void> {
  const entries = await readJson<AuditLogEntry[]>(AUDIT_FILE, []);
  entries.unshift(entry);
  await writeJson(AUDIT_FILE, entries);
}

export { newId } from "@/lib/store";

export type { Project, ProjectMembership, Invitation, PasswordReset, AuditLogEntry, ProjectRole, MembershipStatus } from "./types";

export { PROJECT_ROLES, PROJECT_ROLE_LABELS, ROLE_ALLOWED_TO_INVITE, OWNER_ONLY_ACTIONS } from "./types";
