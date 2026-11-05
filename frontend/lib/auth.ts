import { cookies } from "next/headers";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  removeSession,
  addSession,
} from "@/lib/store";
import type { ProjectRole } from "@/lib/projects/types";
import { backendJSON } from "@/lib/backend-api";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "ubuild_session";

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return scryptAsync(password, salt, 64).then(
    (buf) => `${salt}:${(buf as Buffer).toString("hex")}`,
  );
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, "hex");
  if (buf.length !== stored.length) return false;
  return timingSafeEqual(buf, stored);
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  profileRole: ProjectRole | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await backendJSON<{ user: SessionUser | null }>("auth/me");
  return result?.user ?? null;
}

export async function createSession(
  token: string,
  userId: string,
): Promise<void> {
  await addSession({ token, userId, createdAt: new Date().toISOString() });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await removeSession(token);
  }
  cookieStore.delete(SESSION_COOKIE);
}
