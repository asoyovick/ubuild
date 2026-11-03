import { NextResponse } from "next/server";
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

  return NextResponse.json(
    {
      error: "Password reset by email is not available yet. Contact UBuild for help regaining access.",
    },
    { status: 503 },
  );
}
