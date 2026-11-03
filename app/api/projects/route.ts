import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { createProject, newId } from "@/lib/projects/store";
import { appendAuditEntry } from "@/lib/projects/store";
import { PROJECT_ROLES } from "@/lib/projects/store";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  const { name, location, type, description } = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Please enter a project name.";
  }

  if (typeof location !== "string" || location.trim().length < 2) {
    errors.location = "Please enter a project location.";
  }

  if (typeof type !== "string" || type.trim().length < 2) {
    errors.type = "Please enter a project type.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const project = {
    id: newId(),
    ownerId: user.id,
    name: (name as string).trim(),
    location: (location as string).trim(),
    type: (type as string).trim(),
    description: (description as string)?.trim() ?? "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await createProject(project);
  await appendAuditEntry({
    id: newId(),
    projectId: project.id,
    userId: user.id,
    action: "project_created",
    details: `Project created by ${user.email} as owner`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ project }, { status: 201 });
}
