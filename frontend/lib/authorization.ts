import { redirect } from "next/navigation";
import {
  consumePasswordReset as consumePasswordResetRecord,
  PROJECT_ROLE_LABELS,
} from "@/lib/projects/store";
import type { ProjectRole } from "@/lib/projects/types";
import { getSessionUser, hashPassword } from "@/lib/auth";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Returns the authenticated session user or redirects to the login page.
 *
 * Project-specific authorization is enforced by the Go API. This helper only
 * protects the dashboard shell; pages and mutations rely on the backend
 * workspace response for active membership and role permissions.
 */
export async function requireAuthenticatedUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function membershipLabel(role: ProjectRole): string {
  return PROJECT_ROLE_LABELS[role];
}

async function writeJsonFile(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const reset = await consumePasswordResetRecord(token);
  if (!reset) return false;
  const { listUsers } = await import("@/lib/store");
  const users = await listUsers();
  const user = users.find((u) => u.id === reset.userId);
  if (!user) return false;
  // The current JSON store cannot patch one user's password in place, so the
  // updated password hash is written back with the rest of the user records.
  await replaceUserPasswordHash(user.id, await hashPassword(newPassword));
  return true;
}

async function replaceUserPasswordHash(userId: string, newHash: string) {
  const { listUsers } = await import("@/lib/store");
  const users = await listUsers();
  const updated = users.map((u) =>
    u.id === userId ? { ...u, passwordHash: newHash } : u,
  );
  await writeJsonFile(path.join(process.cwd(), "data", "users.json"), updated);
}
