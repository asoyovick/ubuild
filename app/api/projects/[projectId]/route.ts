import { NextResponse } from "next/server";
import { requireProjectMembership } from "@/lib/authorization";
import { getProject } from "@/lib/projects/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  await requireProjectMembership(projectId);

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}
