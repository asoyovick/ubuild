import { NextResponse } from "next/server";
import { requestPasswordReset, membershipHasPermission } from "@/lib/authorization";

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

  const { email } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const token = await requestPasswordReset((email as string).trim().toLowerCase());
  if (!token) {
    // Return the same success shape to avoid account enumeration.
    return NextResponse.json(
      {
        message:
          "If that email belongs to an account, we have sent password reset instructions.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      message:
        "If that email belongs to an account, we have sent password reset instructions.",
    },
    { status: 200 },
  );
}
