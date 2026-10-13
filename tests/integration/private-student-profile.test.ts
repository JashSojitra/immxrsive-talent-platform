import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AffiliationVerificationRequiredError,
  AuthenticationRequiredError,
} from "@/auth/server";
import { createStudentProfileHandlers } from "@/app/api/v1/student/profile/me/route";
import { createResumeExtractionHandler } from "@/app/api/v1/student/profile/resume/extract/route";
import { createDatabase, type Database } from "@/db/client";
import { queryTalentDirectory } from "@/db/queries/talent";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  availabilityOptions,
  inquiries,
  professionalLinks,
  projectAssets,
  projectContributors,
  projects,
  projectTechnologies,
  skills,
  studentAffiliations,
  studentAvailability,
  studentProfileAvailability,
  studentProfileLinks,
  studentProfiles,
  studentProfileSkills,
  studentSkills,
  students,
} from "@/db/schema";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
import {
  createPrivateStudentProfile,
  getPrivateStudentProfile,
  updatePrivateStudentProfile,
} from "@/profile/service";
import type { TalentQuery } from "@/validation/talent-query";
import { studentProfileDraftSchema } from "@/validation/student-profile";
import { extractResumeCandidates } from "@/resume/extract";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("private student profile", () => {
  let db: Database;
  let closeDatabase: (() => Promise<void>) | undefined;
  let skillId: string;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await clearTestData(db);
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));
    const [skill] = await db.select({ id: skills.id }).from(skills).limit(1);
    if (!skill) throw new Error("Expected fixture skills.");
    skillId = skill.id;
  });

  afterAll(async () => {
    await clearPrivateProfileData(db);
    await closeDatabase?.();
  });

  test("verified owner creates one unpublished draft and receives it on return", async () => {
    const ownerUserId = await createVerifiedUser(db, "owner");
    const handlers = handlersFor(ownerUserId);
    const publicQuery: TalentQuery = {
      q: "", searchGroups: [], skills: [], availability: [], status: [],
    };
    const before = await queryTalentDirectory(db, publicQuery);
    const response = await handlers.POST(profileRequest("POST", draft(skillId)));
    expect(response.status).toBe(201);
    const created = await response.json() as { profile: { id: string; publicationStatus: string } };
    expect(created.profile.publicationStatus).toBe("unpublished");

    const returned = await handlers.GET(new Request("https://talent.example.test/api/v1/student/profile/me"));
    expect(returned.status).toBe(200);
    expect(await returned.json()).toMatchObject({
      profile: { id: created.profile.id, headline: "XR developer", skillIds: [skillId] },
    });
    const after = await queryTalentDirectory(db, publicQuery);
    expect(after).toEqual(before);

    const duplicate = await handlers.POST(profileRequest("POST", draft(skillId)));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ error: { code: "PROFILE_EXISTS" } });
  });

  test("updates only the acting owner's draft and rejects stale revisions", async () => {
    const firstOwner = await createVerifiedUser(db, "first-owner");
    const secondOwner = await createVerifiedUser(db, "second-owner");
    const first = await createPrivateStudentProfile({
      db, ownerUserId: firstOwner, draft: parsedDraft(skillId),
    });
    const second = await createPrivateStudentProfile({
      db, ownerUserId: secondOwner, draft: parsedDraft(skillId, "Second profile"),
    });
    const updated = await updatePrivateStudentProfile({
      db,
      ownerUserId: firstOwner,
      draft: studentProfileDraftSchema.parse({
        ...draft(skillId, "First profile updated", first.updatedAt.toISOString()),
        education: ["BSc Computer Science - Algoma University"],
        experience: ["XR Lab Assistant - Built immersive training prototypes."],
      }),
    });
    expect(updated.headline).toBe("First profile updated");
    expect(updated.education).toEqual(["BSc Computer Science - Algoma University"]);
    expect(updated.experience).toEqual(["XR Lab Assistant - Built immersive training prototypes."]);
    expect((await getPrivateStudentProfile(db, secondOwner))?.headline).toBe("Second profile");
    await expect(updatePrivateStudentProfile({
      db,
      ownerUserId: firstOwner,
      draft: parsedDraft(skillId, "Stale overwrite", first.updatedAt.toISOString()),
    })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    expect((await getPrivateStudentProfile(db, firstOwner))?.headline).toBe("First profile updated");
    expect(second.id).not.toBe(updated.id);
  });

  test("rejects forged identity fields and unknown standardized skills", async () => {
    const ownerUserId = await createVerifiedUser(db, "validation-owner");
    const handlers = handlersFor(ownerUserId);
    const forged = await handlers.POST(profileRequest("POST", {
      ...draft(skillId), ownerUserId: "other-user", profileId: randomUUID(),
    }));
    expect(forged.status).toBe(422);
    expect(await getPrivateStudentProfile(db, ownerUserId)).toBeNull();

    const unknownSkill = await handlers.POST(profileRequest("POST", draft("not-a-real-skill")));
    expect(unknownSkill.status).toBe(422);
    expect(await unknownSkill.json()).toMatchObject({ error: { code: "INVALID_SKILL" } });
  });

  test("extracts a resume without modifying or publishing the owner's profile", async () => {
    const ownerUserId = await createVerifiedUser(db, "resume-owner");
    const profile = await createPrivateStudentProfile({
      db, ownerUserId, draft: parsedDraft(skillId, "Keep this manual headline"),
    });
    const handler = createResumeExtractionHandler({
      authorize: async () => ({ user: { id: ownerUserId } }),
      database: () => db,
      extract: extractResumeCandidates,
    });
    const bytes = await readFile("data/fixtures/r2/resume_clean_single_column.pdf");
    const form = new FormData();
    form.set("resume", new File([bytes], "resume.pdf", { type: "application/pdf" }));
    const response = await handler(new Request(
      "https://talent.example.test/api/v1/student/profile/resume/extract",
      { method: "POST", body: form },
    ));
    expect(response.status).toBe(200);
    const body = await response.json() as { candidates: { education: unknown[]; experience: unknown[] } };
    expect(body.candidates.education).toHaveLength(1);
    expect(body.candidates.experience).toHaveLength(1);
    expect(await getPrivateStudentProfile(db, ownerUserId)).toMatchObject({
      id: profile.id,
      headline: "Keep this manual headline",
      publicationStatus: "unpublished",
      education: [],
      experience: [],
    });
  });

  test.each([
    [new AuthenticationRequiredError(), 401, "AUTHENTICATION_REQUIRED"],
    [new AffiliationVerificationRequiredError(), 403, "AFFILIATION_REQUIRED"],
  ])("resume extraction fails closed before reading storage", async (error, status, code) => {
    const database = vi.fn(() => db);
    const extract = vi.fn<typeof extractResumeCandidates>();
    const handler = createResumeExtractionHandler({
      authorize: async () => { throw error; }, database, extract,
    });
    const response = await handler(new Request(
      "https://talent.example.test/api/v1/student/profile/resume/extract",
      { method: "POST" },
    ));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code } });
    expect(database).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
  });

  test.each([
    [new AuthenticationRequiredError(), 401, "AUTHENTICATION_REQUIRED"],
    [new AffiliationVerificationRequiredError(), 403, "AFFILIATION_REQUIRED"],
  ])("fails closed before opening the database", async (error, status, code) => {
    const database = vi.fn(() => db);
    const handlers = createStudentProfileHandlers({
      authorize: async () => { throw error; }, database,
    });
    const readResponse = await handlers.GET(
      new Request("https://talent.example.test/api/v1/student/profile/me"),
    );
    const writeResponse = await handlers.POST(profileRequest("POST", draft(skillId)));
    expect(readResponse.status).toBe(status);
    expect(writeResponse.status).toBe(status);
    expect(await readResponse.json()).toMatchObject({ error: { code } });
    expect(await writeResponse.json()).toMatchObject({ error: { code } });
    expect(database).not.toHaveBeenCalled();
  });

  function handlersFor(ownerUserId: string) {
    return createStudentProfileHandlers({
      authorize: async () => ({ user: { id: ownerUserId } }),
      database: () => db,
    });
  }
});

function draft(skillId: string, headline = "XR developer", revision: string | null = null) {
  return {
    headline,
    biography: "Building accessible immersive experiences.",
    publicLocation: "Sault Ste. Marie, ON",
    skillIds: [skillId, skillId],
    availability: ["internship", "internship"],
    linkedinUrl: "https://www.linkedin.com/in/student/",
    githubUrl: "https://github.com/student/",
    externalLinks: [{ label: "Portfolio", url: "https://student.example/#work", type: "portfolio" }],
    revision,
  };
}

function parsedDraft(skillId: string, headline = "XR developer", revision: string | null = null) {
  return studentProfileDraftSchema.parse(draft(skillId, headline, revision));
}

function profileRequest(method: "POST" | "PUT", body: unknown) {
  return new Request("https://talent.example.test/api/v1/student/profile/me", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createVerifiedUser(db: Database, label: string) {
  const id = randomUUID();
  await db.insert(authUsers).values({ id, name: label, email: `${label}-${id}@example.test` });
  await db.insert(studentAffiliations).values({
    userId: id,
    institutionalEmail: `${label}-${id}@algomau.ca`,
    verifiedAt: new Date(),
  });
  return id;
}

async function clearTestData(db: Database) {
  await clearPrivateProfileData(db);
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

async function clearPrivateProfileData(db: Database) {
  await db.delete(studentProfileLinks);
  await db.delete(studentProfileAvailability);
  await db.delete(studentProfileSkills);
  await db.delete(studentProfiles);
  await db.delete(studentAffiliations);
  await db.delete(authVerifications);
  await db.delete(authSessions);
  await db.delete(authAccounts);
  await db.delete(authUsers);
}
