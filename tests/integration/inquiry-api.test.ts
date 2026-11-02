import "./setup";

import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDatabase, type Database } from "@/db/client";
import {
  availabilityOptions, inquiries, professionalLinks, projectAssets,
  projectContributors, projects, projectTechnologies, skills,
  studentAvailability, studentSkills, students, authUsers, studentAffiliations, studentProfiles,
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
  const ownerId = randomUUID();
  let profileId: string;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for inquiry API tests.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeTestDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await clearTestData(db);
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));
    await db.insert(authUsers).values({ id: ownerId, name: "Public Profile Student", email: `${ownerId}@example.test` });
    await db.insert(studentAffiliations).values({
      userId: ownerId, institutionalEmail: `${ownerId}@algomau.ca`, verifiedAt: new Date(),
    });
    const [profile] = await db.insert(studentProfiles).values({
      ownerUserId: ownerId, publicationStatus: "published", studentStatus: "current",
      headline: "Public headline", biography: "Profile biography", program: "Computer Science",
    }).returning({ id: studentProfiles.id });
    profileId = profile.id;
    process.env.DATABASE_URL = testDatabaseUrl;
    postInquiry = (await import("@/app/api/v1/inquiries/route")).POST;
    closeRuntimeDatabase = (await import("@/db/runtime")).closeRuntimeDatabase;
  });

  afterAll(async () => {
    if (db && profileId) {
      await db.delete(inquiries).where(eq(inquiries.studentProfileId, profileId));
      await db.delete(authUsers).where(eq(authUsers.id, ownerId));
    }
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
      sourceUrl: "/students/S01", studentId: "S01", studentProfileId: null, projectId: null,
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
      studentId: null, studentProfileId: null, projectId: "P01",
    });
  });

  test("published UUID profile inquiry persists only the trusted profile foreign key and snapshot", async () => {
    const response = await post({ sourceType: "student", sourceId: profileId, ...validEmployerFields });
    expect(response.status).toBe(201);
    const confirmation = await response.json() as { id: string; message: string };
    expect(Object.keys(confirmation).sort()).toEqual(["id", "message"]);
    expect(confirmation.message).toBe("Inquiry submitted successfully.");
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, confirmation.id));
    expect(row).toMatchObject({
      sourceType: "student", sourceId: profileId, sourceName: "Public Profile Student",
      sourceUrl: `/students/${profileId}`, studentId: null, studentProfileId: profileId, projectId: null,
      companyName: "Example Inc.", contactEmail: "alex@example.com",
    });
    expect(JSON.stringify(confirmation)).not.toContain(ownerId);
  });

  test.each(["unpublished", "unverified", "missing-status"])("rejects %s UUID profile without inserting an inquiry", async (state) => {
    const id = randomUUID();
    await db.insert(authUsers).values({ id, name: "Private Student", email: `${id}@example.test` });
    try {
      if (state !== "unverified") await db.insert(studentAffiliations).values({
        userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date(),
      });
      const [profile] = await db.insert(studentProfiles).values({
        ownerUserId: id, publicationStatus: state === "unpublished" ? "unpublished" : "published",
        studentStatus: state === "missing-status" ? null : "current",
      }).returning({ id: studentProfiles.id });
      const before = await db.select({ id: inquiries.id }).from(inquiries);
      const response = await post({ sourceType: "student", sourceId: profile.id, ...validEmployerFields });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: "NOT_FOUND", message: "Inquiry source not available.", details: [] },
      });
      expect(await db.select({ id: inquiries.id }).from(inquiries)).toHaveLength(before.length);
    } finally {
      await db.delete(authUsers).where(eq(authUsers.id, id));
    }
  });

  test("database enforces null-safe exact source combinations, including project-only inquiries", async () => {
    for (const sourceType of ["student", "project"] as const) {
      for (let mask = 0; mask < 8; mask += 1) {
        const studentId = mask & 1 ? "S01" : null;
        const studentProfileId = mask & 2 ? profileId : null;
        const projectId = mask & 4 ? "P01" : null;
        const sourceId = sourceType === "project" ? "P01" : studentId ?? studentProfileId ?? "S01";
        const insert = db.insert(inquiries).values({
          sourceType, sourceId, studentId, studentProfileId, projectId,
          sourceName: "Snapshot", sourceUrl: "/context", ...validEmployerFields,
        });
        const valid = sourceType === "project" ? mask === 4 : mask === 1 || mask === 2;
        if (valid) await insert;
        else await expect(insert).rejects.toMatchObject({ cause: { code: "23514" } });
      }
    }
  });

  test.each(["legacy", "profile", "project"])("database rejects mismatched %s source ID", async (kind) => {
    await expect(db.insert(inquiries).values({
      sourceType: kind === "project" ? "project" : "student", sourceId: "WRONG",
      studentId: kind === "legacy" ? "S01" : null,
      studentProfileId: kind === "profile" ? profileId : null,
      projectId: kind === "project" ? "P01" : null,
      sourceName: "Snapshot", sourceUrl: "/context", ...validEmployerFields,
    })).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  test("profile foreign key rejects nonexistent profiles and restricts deletion of referenced profiles", async () => {
    const missingId = randomUUID();
    await expect(db.insert(inquiries).values({
      sourceType: "student", sourceId: missingId, studentProfileId: missingId,
      sourceName: "Snapshot", sourceUrl: "/context", ...validEmployerFields,
    })).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(db.delete(studentProfiles).where(eq(studentProfiles.id, profileId)))
      .rejects.toMatchObject({ cause: {
        code: "23001", constraint_name: "inquiries_student_profile_id_student_profiles_id_fk",
      } });
    expect(await db.select({ id: studentProfiles.id }).from(studentProfiles)
      .where(eq(studentProfiles.id, profileId))).toEqual([{ id: profileId }]);
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
    ["student", "00000000-0000-4000-8000-000000000000"],
    ["student", "' OR 1=1 --"],
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

  test("rejects unresolved template prompts without persisting them", async () => {
    const before = await db.select({ id: inquiries.id }).from(inquiries);
    const response = await post({
      sourceType: "student",
      sourceId: "S01",
      ...validEmployerFields,
      description: "We would like to discuss [opportunity or collaboration] with Avery.",
    });
    expect(response.status).toBe(422);
    const body = await response.json() as { error: { details: Array<{ field: string; message: string }> } };
    expect(body.error.details).toContainEqual(expect.objectContaining({
      field: "description",
      message: expect.stringContaining("[opportunity or collaboration]"),
    }));
    const after = await db.select({ id: inquiries.id }).from(inquiries);
    expect(after).toHaveLength(before.length);
  });

  test("persists a final personalized message with unrelated bracket text", async () => {
    const description = "We would like to discuss the scoped [Phase 2] collaboration with Avery.";
    const response = await post({
      sourceType: "student",
      sourceId: "S01",
      ...validEmployerFields,
      description,
    });
    expect(response.status).toBe(201);
    const confirmation = await response.json() as { id: string };
    const [row] = await db.select().from(inquiries).where(eq(inquiries.id, confirmation.id));
    expect(row?.description).toBe(description);
    expect(row).toMatchObject({ sourceName: "Avery Chen", sourceUrl: "/students/S01" });
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
