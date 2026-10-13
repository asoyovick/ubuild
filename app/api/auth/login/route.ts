import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByEmail } from "@/lib/store";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  const { email, password } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Please enter a valid email address.";
  }
  if (typeof password !== "string" || password.length === 0) {
    errors.password = "Please enter your password.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const user = await findUserByEmail((email as string).trim().toLowerCase());
  if (!user) {
    return NextResponse.json(
      { errors: { form: "We couldn't find an account with that email." } },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password as string, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { errors: { form: "That password doesn't match our records." } },
      { status: 401 },
    );
  }

  const { newId } = await import("@/lib/store");
  const token = `${newId()}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  await createSession(token, user.id);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json(
    { message: "You are signed in.", user: { name: user.name, email: user.email } },
    { status: 200 },
  );
}
