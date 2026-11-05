import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/authorization";

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

  const { token, newPassword, confirmPassword } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof token !== "string" || token.length === 0) {
    errors.token = "A reset token is required.";
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    errors.newPassword = "Choose a password of at least 8 characters.";
  }

  if (typeof confirmPassword !== "string" || confirmPassword !== newPassword) {
    errors.confirmPassword = "The passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const ok = await resetPassword(token as string, newPassword as string);
  if (!ok) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { message: "Your password has been updated. You can now sign in." },
    { status: 200 },
  );
}
