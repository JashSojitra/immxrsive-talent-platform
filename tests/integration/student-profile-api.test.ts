import { tmpdir } from "node:os";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDatabase, type Database } from "@/db/client";
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

describeWithDatabase("public student profile API", () => {
  let db: Database;
  let closeTestDatabase: (() => Promise<void>) | undefined;
  let closeRuntimeDatabase: (() => Promise<void>) | undefined;
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
    const route = await import("@/app/api/v1/students/[studentId]/route");
    const runtime = await import("@/db/runtime");
    studentGet = route.GET;
    closeRuntimeDatabase = runtime.closeRuntimeDatabase;
  });

  afterAll(async () => {
    await closeRuntimeDatabase?.();
    await closeTestDatabase?.();
  });

  test("published student returns 200 with the professional shell", async () => {
    const { response, body } = await getProfile("S01");

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "S01",
      name: "Avery Chen",
      headline: "XR Developer focused on training simulations",
      program: "Computer Science",
      status: "current",
    });
    expect(body).toHaveProperty("availability");
    expect(body).toHaveProperty("skills");
    expect(body).toHaveProperty("links");
    expect(body).toHaveProperty("projects");
    expect(body).not.toHaveProperty("profileStatus");
    expect(body).not.toHaveProperty("profile_status");
  });

  test("multiple availability values preserve database display order", async () => {
    const { body } = await getProfile("S02");
    expect(body.availability).toEqual(["internship", "contract"]);
  });

  test("standardized student skills preserve their own display order", async () => {
    const { body } = await getProfile("S02");
    expect(body.skills).toEqual(["Blender", "Maya", "Unity"]);
  });

  test("project technologies never populate student skills", async () => {
    const { body } = await getProfile("S06");
    expect(body.skills).toEqual(["UX Research", "Figma", "Accessibility"]);
    expect(body.skills).not.toContain("React");
    expect(body.projects.find((project) => project.id === "P06")?.technologies).toContain("React");
  });

  test("project evidence includes descriptions, domains, technologies, links, and contributor roles", async () => {
    const { body } = await getProfile("S01");
    expect(body.projects).toHaveLength(2);
    expect(body.projects.find((project) => project.id === "P01")).toEqual({
      id: "P01",
      title: "Industrial Safety VR Trainer",
      description: "Immersive safety training prototype for industrial onboarding.",
      domain: "Training / Simulation",
      role: "XR Developer",
      technologies: ["Unity", "C#", "Blender"],
      links: [{ type: "demo", label: "Demo", url: "https://example.com/p01-demo" }],
    });
  });

  test("shared projects stay canonical while preserving each student's role", async () => {
    const avery = (await getProfile("S01")).body;
    const maya = (await getProfile("S02")).body;
    const averyShared = avery.projects.filter((project) => project.id === "P01");
    const mayaShared = maya.projects.filter((project) => project.id === "P01");

    expect(averyShared).toHaveLength(1);
    expect(mayaShared).toHaveLength(1);
    expect(averyShared[0]?.title).toBe(mayaShared[0]?.title);
    expect(averyShared[0]?.role).toBe("XR Developer");
    expect(mayaShared[0]?.role).toBe("3D Artist");
  });

  test("professional links are returned in deterministic order", async () => {
    const { body } = await getProfile("S01");
    expect(body.links).toEqual([
      { type: "github", label: "Github", url: "https://github.com/example-avery" },
    ]);
  });

  test("unknown and unpublished students return indistinguishable 404 responses", async () => {
    const unknown = await getError("INVALID");
    const unpublished = await getError("S16");

    expect(unknown.response.status).toBe(404);
    expect(unpublished.response.status).toBe(404);
    expect(unpublished.body).toEqual(unknown.body);
    expect(unknown.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Student profile not available.",
        details: [],
      },
    });
    expect(JSON.stringify(unknown.body)).not.toMatch(/unpublished|hidden|private/i);
  });

  test("runtime endpoint does not depend on fixture files", async () => {
    const originalDirectory = process.cwd();
    try {
      process.chdir(tmpdir());
      const { response } = await getProfile("S01");
      expect(response.status).toBe(200);
    } finally {
      process.chdir(originalDirectory);
    }
  });

  async function getProfile(studentId: string) {
    const response = await studentGet(
      requestFor(studentId),
      { params: Promise.resolve({ studentId }) },
    );
    return { response, body: (await response.json()) as PublicStudentProfile };
  }

  async function getError(studentId: string) {
    const response = await studentGet(
      requestFor(studentId),
      { params: Promise.resolve({ studentId }) },
    );
    return { response, body: (await response.json()) as ApiErrorBody };
  }
});

function requestFor(studentId: string) {
  return new Request(`http://localhost/api/v1/students/${studentId}`);
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
