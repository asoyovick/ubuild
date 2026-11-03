import { listUsers, findUserByEmail } from "@/lib/store";
import {
  createProject,
  createMembership,
  findMembership,
  newId,
} from "@/lib/projects/store";
import type { ProjectRole } from "@/lib/projects/types";
import { hashPassword } from "@/lib/auth";



export interface DevFixture {
  email: string;
  password: string;
  name: string;
  projectName: string;
  projectLocation: string;
  projectType: string;
  role: ProjectRole;
}

export const DEV_FIXTURES: DevFixture[] = [
  {
    email: "owner@example.test",
    password: "owner-test-2026",
    name: "Demo Owner",
    projectName: "Demo Project",
    projectLocation: "Nairobi",
    projectType: "New build",
    role: "OWNER",
  },
  {
    email: "coordinator@example.test",
    password: "coordinator-test-2026",
    name: "Demo Coordinator",
    projectName: "Demo Project",
    projectLocation: "Nairobi",
    projectType: "New build",
    role: "COORDINATOR",
  },
  {
    email: "architect@example.test",
    password: "architect-test-2026",
    name: "Demo Architect",
    projectName: "Demo Project",
    projectLocation: "Nairobi",
    projectType: "New build",
    role: "ARCHITECT",
  },
];

export async function seedDevFixtures(): Promise<{
  createdUsers: string[];
  createdProjectId: string | null;
}> {
  const createdUsers: string[] = [];

  for (const fixture of DEV_FIXTURES) {
    const existing = await findUserByEmail(fixture.email);
    if (existing) {
      createdUsers.push(existing.id);
      continue;
    }
    const passwordHash = await hashPassword(fixture.password);
    const userId = newId();
    await listUsers(); // ensure file exists
    const { createUser } = await import("@/lib/store");
    await createUser({
      id: userId,
      name: fixture.name,
      email: fixture.email,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    createdUsers.push(userId);
  }

  const ownerEmail = DEV_FIXTURES[0].email;
  const owner = await findUserByEmail(ownerEmail);
  if (!owner) {
    return { createdUsers, createdProjectId: null };
  }

  let projectId = "";
  const existingProject = await findProjectByName(owner.id, DEV_FIXTURES[0].projectName);
  if (existingProject) {
    projectId = existingProject.id;
  } else {
    const project = {
      id: newId(),
      ownerId: owner.id,
      name: DEV_FIXTURES[0].projectName,
      location: DEV_FIXTURES[0].projectLocation,
      type: DEV_FIXTURES[0].projectType,
      description: "Development fixture project. Remove after testing.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createProject(project);
    projectId = project.id;
  }

  for (let i = 0; i < DEV_FIXTURES.length; i++) {
    const fixture = DEV_FIXTURES[i];
    const fixtureUser = await findUserByEmail(fixture.email);
    if (!fixtureUser) continue;

    const existing = await findMembership(fixtureUser.id, projectId);
    if (!existing) {
      await createMembership({
        id: newId(),
        userId: fixtureUser.id,
        projectId,
        role: fixture.role,
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return { createdUsers, createdProjectId: projectId || null };
}

async function findProjectByName(
  ownerId: string,
  name: string,
): Promise<{ id: string } | null> {
  const { listProjects } = await import("@/lib/projects/store");
  const projects = await listProjects();
  const match = projects.find((p) => p.ownerId === ownerId && p.name === name);
  if (!match) return null;
  return { id: match.id };
}
