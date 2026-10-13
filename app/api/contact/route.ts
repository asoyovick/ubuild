import { NextResponse } from "next/server";
import { addSubmission, newId } from "@/lib/store";

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

  const { name, email, phone, projectType, location, budget, message } =
    body as Record<string, unknown>;

  const errors: Record<string, string> = {};
  if (typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Please enter your name.";
  }
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Please enter a valid email address.";
  }
  if (
    typeof message !== "string" ||
    message.trim().length < 10
  ) {
    errors.message =
      "Tell us a little more about your project (at least 10 characters).";
  }
  if (
    phone !== undefined &&
    phone !== "" &&
    (typeof phone !== "string" || phone.trim().length < 5)
  ) {
    errors.phone = "Please check the phone number.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const submission = {
    id: newId(),
    name: (name as string).trim(),
    email: (email as string).trim(),
    phone: typeof phone === "string" ? phone.trim() : undefined,
    projectType:
      typeof projectType === "string" ? projectType : undefined,
    location:
      typeof location === "string" ? location.trim() : undefined,
    budget: typeof budget === "string" ? budget : undefined,
    message: (message as string).trim(),
    submittedAt: new Date().toISOString(),
  };

  try {
    await addSubmission(submission);
  } catch {
    return NextResponse.json(
      { error: "We couldn't save your message. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      message:
        "Thank you — your project inquiry has been received. A coordinator will reach out within one working day.",
      id: submission.id,
    },
    { status: 201 },
  );
}
