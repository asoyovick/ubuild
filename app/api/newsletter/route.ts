import { NextResponse } from "next/server";
import {
  addNewsletterSignup,
  listNewsletter,
  newId,
} from "@/lib/store";

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

  const { email } = body as { email?: unknown };

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      { errors: { email: "Please enter a valid email address." } },
      { status: 422 },
    );
  }

  const normalized = email.trim().toLowerCase();
  const existing = await listNewsletter();
  if (existing.some((s) => s.email.toLowerCase() === normalized)) {
    return NextResponse.json(
      { message: "This email is already subscribed." },
      { status: 200 },
    );
  }

  await addNewsletterSignup({
    email: normalized,
    signedUpAt: new Date().toISOString(),
  });

  void newId;

  return NextResponse.json(
    { message: "You're subscribed. We'll send occasional project insights." },
    { status: 201 },
  );
}
