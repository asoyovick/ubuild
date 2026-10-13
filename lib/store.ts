import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Local JSON data store.
 *
 * This is the development data layer. It keeps registered users,
 * contact submissions, and newsletter signups in /data so forms and
 * authentication genuinely work without an external database.
 *
 * For production, set DATABASE_URL and connect a real database —
 * the API routes read through this module, so only this file needs
 * to change.
 */

const DATA_DIR = path.join(process.cwd(), "data");

const USERS_FILE = path.join(DATA_DIR, "users.json");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "contact-submissions.json");
const NEWSLETTER_FILE = path.join(DATA_DIR, "newsletter.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
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

/* ---------- Users ---------- */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export async function listUsers(): Promise<StoredUser[]> {
  return readJson<StoredUser[]>(USERS_FILE, []);
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | undefined> {
  const users = await listUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(
  user: StoredUser,
): Promise<void> {
  const users = await listUsers();
  users.push(user);
  await writeJson(USERS_FILE, users);
}

/* ---------- Contact submissions ---------- */

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  projectType?: string;
  location?: string;
  budget?: string;
  message: string;
  submittedAt: string;
}

export async function listSubmissions(): Promise<ContactSubmission[]> {
  return readJson<ContactSubmission[]>(SUBMISSIONS_FILE, []);
}

export async function addSubmission(
  submission: ContactSubmission,
): Promise<void> {
  const submissions = await listSubmissions();
  submissions.push(submission);
  await writeJson(SUBMISSIONS_FILE, submissions);
}

/* ---------- Newsletter ---------- */

export interface NewsletterSignup {
  email: string;
  signedUpAt: string;
}

export async function listNewsletter(): Promise<NewsletterSignup[]> {
  return readJson<NewsletterSignup[]>(NEWSLETTER_FILE, []);
}

export async function addNewsletterSignup(
  signup: NewsletterSignup,
): Promise<void> {
  const list = await listNewsletter();
  list.push(signup);
  await writeJson(NEWSLETTER_FILE, list);
}

/* ---------- Sessions ---------- */

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
}

export async function listSessions(): Promise<StoredSession[]> {
  return readJson<StoredSession[]>(SESSIONS_FILE, []);
}

export async function addSession(session: StoredSession): Promise<void> {
  const sessions = await listSessions();
  sessions.push(session);
  await writeJson(SESSIONS_FILE, sessions);
}

export async function removeSession(token: string): Promise<void> {
  const sessions = await listSessions();
  await writeJson(
    SESSIONS_FILE,
    sessions.filter((s) => s.token !== token),
  );
}

export async function findSession(
  token: string,
): Promise<StoredSession | undefined> {
  const sessions = await listSessions();
  return sessions.find((s) => s.token === token);
}

export function newId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}
