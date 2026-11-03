import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createUserIfEmailAvailable,
  findUserByEmail,
  newId,
} from "@/lib/store";
import { hashPassword, createSession, SESSION_COOKIE } from "@/lib/auth";
import { PROJECT_ROLES, type ProjectRole } from "@/lib/projects/types";

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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Enter your account details and try again." },
      { status: 400 },
    );
  }

  const { name, email, role, password, confirmPassword } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Please enter your full name.";
  }
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    errors.email = "Please enter a valid email address.";
  }
  if (typeof password !== "string" || password.length < 8) {
    errors.password = "Choose a password of at least 8 characters.";
  }
  if (typeof role !== "string" || !PROJECT_ROLES.includes(role as ProjectRole)) {
    errors.role = "Choose a role from the list.";
  }
  if (typeof confirmPassword !== "string" || confirmPassword.length === 0) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (typeof password === "string" && confirmPassword !== password) {
    errors.confirmPassword = "The passwords do not match.";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const normalizedEmail = (email as string).trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json(
      {
        errors: {
          email: "An account with this email already exists. Try logging in.",
        },
      },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password as string);
  const user = {
    id: newId(),
    name: (name as string).trim(),
    email: normalizedEmail,
    passwordHash,
    profileRole: role as ProjectRole,
    createdAt: new Date().toISOString(),
  };
  const created = await createUserIfEmailAvailable(user);
  if (!created) {
    return NextResponse.json(
      { errors: { email: "An account with this email already exists. Try logging in." } },
      { status: 409 },
    );
  }

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
    {
      message: "Your account has been created.",
      user: { name: user.name, email: user.email, profileRole: user.profileRole },
    },
    { status: 201 },
  );
}
