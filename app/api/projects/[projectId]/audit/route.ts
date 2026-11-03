import { NextResponse } from "next/server";
import { requireProjectMembership } from "@/lib/authorization";
import { listMembershipsForProject } from "@/lib/projects/store";
import { readJson } from "@/lib/store";
import path from "node:path";
import { promises as fs } from "node:fs";

const AUDIT_FILE = path.join(process.cwd(), "data", "audit.json");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  await requireProjectMembership(projectId);

  let entries: Array<{
    id: string;
    projectId: string;
    userId: string;
    action: string;
    details: string;
    createdAt: string;
  }> = [];

  try {
    const raw = await fs.readFile(AUDIT_FILE, "utf-8");
    const all = JSON.parse(raw) as Array<{
      id: string;
      projectId: string;
      userId: string;
      action: string;
      details: string;
      createdAt: string;
    }>;
    entries = all.filter((e) => e.projectId === projectId);
  } catch {
    entries = [];
  }

  return NextResponse.json({ entries });
}
