import { tmpdir } from "node:os";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDatabase, type Database } from "@/db/client";
import type { PublicProjectDetail } from "@/db/queries/project-detail";
import type { PublicStudentProfile } from "@/db/queries/student-profile";
import {
  availabilityOptions,
  inquiries,
  professionalLinks,
  projectAssets,
  projectContributors,
  projects,
  projectTechnologies,
  skills,
  studentAvailability,
  studentSkills,
  students,
} from "@/db/schema";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
import type { ApiErrorBody } from "@/lib/api-errors";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("public project detail API", () => {
  let db: Database;
  let closeTestDatabase: (() => Promise<void>) | undefined;
  let closeRuntimeDatabase: (() => Promise<void>) | undefined;
  let projectGet: (
    request: Request,
    context: { params: Promise<{ projectId: string }> },
  ) => Promise<Response>;
  let studentGet: (
    request: Request,
    context: { params: Promise<{ studentId: string }> },
  ) => Promise<Response>;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for API integration tests.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeTestDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await clearTestData(db);
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));

    process.env.DATABASE_URL = testDatabaseUrl;
    projectGet = (await import("@/app/api/v1/projects/[projectId]/route")).GET;
    studentGet = (await import("@/app/api/v1/students/[studentId]/route")).GET;
    closeRuntimeDatabase = (await import("@/db/runtime")).closeRuntimeDatabase;
  });

  afterAll(async () => {
    await closeRuntimeDatabase?.();
    await closeTestDatabase?.();
  });

  test("valid project returns its complete stable contract in database order", async () => {
    const { response, body } = await getProject("P01");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      id: "P01",
      title: "Industrial Safety VR Trainer",
      description: "Immersive safety training prototype for industrial onboarding.",
      domain: "Training / Simulation",
      technologies: ["Unity", "C#", "Blender"],
      contributors: [
        {
          studentId: "S01",
          name: "Avery Chen",
          headline: "XR Developer focused on training simulations",
          role: "XR Developer",
          profileUrl: "/students/S01",
        },
        {
          studentId: "S02",
          name: "Maya Patel",
          headline: "3D Artist and technical artist",
          role: "3D Artist",
          profileUrl: "/students/S02",
        },
        {
          studentId: "S06",
          name: "Leila Ahmed",
          headline: "UX researcher for immersive learning",
          role: "UX Researcher",
          profileUrl: "/students/S06",
        },
      ],
      assets: [{ type: "demo", label: "Demo", url: "https://example.com/p01-demo" }],
    });
  });

  test("shared profile evidence resolves to one canonical project identity", async () => {
    const avery = await getStudent("S01");
    const maya = await getStudent("S02");
    const averyProject = avery.projects.find((project) => project.id === "P01");
    const mayaProject = maya.projects.find((project) => project.id === "P01");
    expect(averyProject?.id).toBe("P01");
    expect(mayaProject?.id).toBe("P01");
    expect(averyProject?.title).toBe(mayaProject?.title);
    expect(`/projects/${averyProject?.id}`).toBe("/projects/P01");
    expect(`/projects/${mayaProject?.id}`).toBe("/projects/P01");
  });

  test("project technologies remain distinct from contributor skills", async () => {
    const project = (await getProject("P06")).body;
    const leila = await getStudent("S06");
    expect(project.technologies).toEqual(["React", "TypeScript", "Figma"]);
    expect(leila.skills).toEqual(["UX Research", "Figma", "Accessibility"]);
    expect(leila.skills).not.toContain("React");
  });

  test("unpublished contributor relationship and role remain without hidden profile details", async () => {
    const { body } = await getProject("P03");
    expect(body.contributors).toHaveLength(3);
    expect(body.contributors[2]).toEqual({
      studentId: "S16",
      name: null,
      headline: null,
      role: "QA Tester",
      profileUrl: null,
    });
    expect(JSON.stringify(body.contributors[2])).not.toMatch(/Nora|XR developer/i);
  });

  test("broken optional external URL is returned without being fetched or failing", async () => {
    const { response, body } = await getProject("P07");
    expect(response.status).toBe(200);
    expect(body.assets).toEqual([
      { type: "demo", label: "Demo", url: "https://example.invalid/demo" },
    ]);
  });

  test("unknown project returns a structured project-specific 404", async () => {
    const response = await projectGet(requestForProject("INVALID"), {
      params: Promise.resolve({ projectId: "INVALID" }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()) as ApiErrorBody).toEqual({
      error: { code: "NOT_FOUND", message: "Project not available.", details: [] },
    });
  });

  test("runtime endpoint does not depend on fixture files", async () => {
    const originalDirectory = process.cwd();
    try {
      process.chdir(tmpdir());
      expect((await getProject("P01")).response.status).toBe(200);
    } finally {
      process.chdir(originalDirectory);
    }
  });

  async function getProject(projectId: string) {
    const response = await projectGet(requestForProject(projectId), {
      params: Promise.resolve({ projectId }),
    });
    return { response, body: (await response.json()) as PublicProjectDetail };
  }

  async function getStudent(studentId: string) {
    const response = await studentGet(
      new Request(`http://localhost/api/v1/students/${studentId}`),
      { params: Promise.resolve({ studentId }) },
    );
    expect(response.status).toBe(200);
    return (await response.json()) as PublicStudentProfile;
  }
});

function requestForProject(projectId: string) {
  return new Request(`http://localhost/api/v1/projects/${projectId}`);
}

async function clearTestData(db: Database) {
  await db.delete(inquiries);
  await db.delete(projectContributors);
  await db.delete(projectTechnologies);
  await db.delete(projectAssets);
  await db.delete(professionalLinks);
  await db.delete(studentAvailability);
  await db.delete(studentSkills);
  await db.delete(projects);
  await db.delete(students);
  await db.delete(skills);
  await db.delete(availabilityOptions);
}
