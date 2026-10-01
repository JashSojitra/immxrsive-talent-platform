import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDatabase, type Database } from "@/db/client";
import {
  availabilityOptions, inquiries, professionalLinks, projectAssets,
  projectContributors, projects, projectTechnologies, skills,
  studentAvailability, studentSkills, students,
} from "@/db/schema";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

const validEmployerFields = {
  companyName: "Example Inc.",
  contactName: "Alex Employer",
  contactEmail: "ALEX@EXAMPLE.COM",
  description: "We would like to discuss an internship opportunity.",
};

describeWithDatabase("contextual employer inquiry API", () => {
  let db: Database;
  let closeTestDatabase: (() => Promise<void>) | undefined;
  let closeRuntimeDatabase: (() => Promise<void>) | undefined;
  let postInquiry: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for inquiry API tests.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeTestDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await clearTestData(db);
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));
    process.env.DATABASE_URL = testDatabaseUrl;
    postInquiry = (await import("@/app/api/v1/inquiries/route")).POST;
    closeRuntimeDatabase = (await import("@/db/runtime")).closeRuntimeDatabase;
  });

  afterAll(async () => {
    await closeRuntimeDatabase?.();
    await closeTestDatabase?.();
  });

  test("valid student inquiry returns 201 and persists trusted student context only", async () => {
    const response = await post({ sourceType: "student", sourceId: "S01", ...validEmployerFields });
    expect(response.status).toBe(201);
    const confirmation = await response.json() as { id: string; message: string };
    expect(confirmation.message).toBe("Inquiry submitted successfully.");

    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, confirmation.id));
    expect(row).toMatchObject({
      sourceType: "student", sourceId: "S01", sourceName: "Avery Chen",
      sourceUrl: "/students/S01", studentId: "S01", projectId: null,
      companyName: "Example Inc.", contactName: "Alex Employer",
      contactEmail: "alex@example.com",
      description: validEmployerFields.description,
    });
  });

  test("valid project inquiry returns 201 and persists trusted project context only", async () => {
    const response = await post({ sourceType: "project", sourceId: "P01", ...validEmployerFields });
    expect(response.status).toBe(201);
    const confirmation = await response.json() as { id: string };
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, confirmation.id));
    expect(row).toMatchObject({
      sourceType: "project", sourceId: "P01",
      sourceName: "Industrial Safety VR Trainer", sourceUrl: "/projects/P01",
      studentId: null, projectId: "P01",
    });
  });

  test.each([
    ["sourceName", "Spoofed Name"],
    ["sourceUrl", "/students/S02"],
  ])("client cannot submit spoofed %s", async (field, value) => {
    const response = await post({ sourceType: "student", sourceId: "S01", ...validEmployerFields, [field]: value });
    expect(response.status).toBe(422);
  });

  test.each([
    ["student", "S16"],
    ["student", "INVALID"],
    ["project", "INVALID"],
  ])("unavailable %s source %s returns a non-disclosing 404", async (sourceType, sourceId) => {
    const response = await post({ sourceType, sourceId, ...validEmployerFields });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Inquiry source not available.", details: [] },
    });
  });

  test.each([
    ["companyName", ""],
    ["contactName", ""],
    ["contactEmail", "invalid"],
    ["description", "short"],
    ["sourceType", "invalid"],
  ])("invalid %s returns structured field feedback", async (field, value) => {
    const response = await post({ sourceType: "student", sourceId: "S01", ...validEmployerFields, [field]: value });
    expect(response.status).toBe(422);
    const body = await response.json() as { error: { details: Array<{ field: string }> } };
    expect(body.error.details.some((detail) => detail.field === field)).toBe(true);
  });

  test("oversized and malformed bodies are rejected before persistence", async () => {
    const oversized = await postInquiry(new Request("http://localhost/api/v1/inquiries", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(16_385),
    }));
    expect(oversized.status).toBe(413);
    const malformed = await postInquiry(new Request("http://localhost/api/v1/inquiries", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad-json",
    }));
    expect(malformed.status).toBe(400);
  });

  function post(body: Record<string, unknown>) {
    return postInquiry(new Request("http://localhost/api/v1/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
  }
});

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
