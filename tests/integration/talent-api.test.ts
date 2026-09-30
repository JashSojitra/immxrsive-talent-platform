import { tmpdir } from "node:os";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createDatabase, type Database } from "@/db/client";
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
import type {
  FilterMetadata,
  TalentDirectoryResponse,
} from "@/db/queries/talent";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData, type FixtureData } from "@/fixtures/schema";
import type { ApiErrorBody } from "@/lib/api-errors";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("public directory API", () => {
  let db: Database;
  let closeTestDatabase: (() => Promise<void>) | undefined;
  let closeRuntimeDatabase: (() => Promise<void>) | undefined;
  let officialFixtures: FixtureData;
  let talentGet: (request: Request) => Promise<Response>;
  let skillsGet: () => Promise<Response>;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error("TEST_DATABASE_URL is required for API integration tests.");
    }

    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeTestDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await clearTestData(db);
    officialFixtures = validateFixtureData(await loadFixtureSource());
    await importFixtureData(db, officialFixtures);

    process.env.DATABASE_URL = testDatabaseUrl;
    const talentRoute = await import("@/app/api/v1/talent/route");
    const skillsRoute = await import("@/app/api/v1/skills/route");
    const runtime = await import("@/db/runtime");
    talentGet = talentRoute.GET;
    skillsGet = skillsRoute.GET;
    closeRuntimeDatabase = runtime.closeRuntimeDatabase;
  });

  afterAll(async () => {
    await closeRuntimeDatabase?.();
    await closeTestDatabase?.();
  });

  test("no filters returns every published student and excludes S16", async () => {
    const { response, body } = await getTalent();

    expect(response.status).toBe(200);
    expect(body.count).toBe(17);
    expect(body.items).toHaveLength(17);
    expect(ids(body)).not.toContain("S16");
    expect(body.items.every((student) => student.id !== "S16")).toBe(true);
  });

  test("text search matches a student name", async () => {
    const { body } = await getTalent("q=Avery");
    expect(ids(body)).toEqual(["S01"]);
  });

  test("text search matches a professional headline", async () => {
    const { body } = await getTalent("q=training%20simulations");
    expect(ids(body)).toEqual(["S01"]);
  });

  test("text search matches standardized skill names", async () => {
    const { body } = await getTalent("q=OpenXR");
    expect(ids(body)).toEqual(["S01", "S11"]);
  });

  test("text search is case-insensitive", async () => {
    const { body } = await getTalent("q=aVeRy%20cHeN");
    expect(ids(body)).toEqual(["S01"]);
  });

  test("text search uses literal substring semantics", async () => {
    const { body } = await getTalent("q=very");
    expect(ids(body)).toEqual(["S01"]);
  });

  test("SQL wildcard characters are treated literally", async () => {
    const percent = await getTalent("q=%25");
    const underscore = await getTalent("q=_");

    expect(percent.body.items).toEqual([]);
    expect(underscore.body.items).toEqual([]);
  });

  test("one skill filter matches explicit student skills", async () => {
    const { body } = await getTalent("skill=React");
    expect(ids(body)).toEqual(["S10", "S18", "S04"]);
  });

  test("two skill filters use AND semantics", async () => {
    const { body } = await getTalent("skill=Unity&skill=Blender");
    expect(ids(body)).toEqual(["S05", "S02", "S12", "S17"]);
  });

  test("project technologies do not influence skill matching", async () => {
    const { body } = await getTalent("skill=C%23");
    expect(ids(body)).not.toContain("S06");
    expect(ids(body)).not.toContain("S16");
  });

  test("one availability filter uses structured availability", async () => {
    const { body } = await getTalent("availability=contract");
    expect(ids(body)).toEqual(["S18", "S07", "S02", "S09", "S12"]);
  });

  test("multiple availability values use OR semantics", async () => {
    const { body } = await getTalent(
      "availability=internship&availability=contract",
    );
    expect(ids(body)).toContain("S01");
    expect(ids(body)).toContain("S07");
    expect(ids(body)).not.toContain("S11");
    expect(ids(body)).not.toContain("S13");
  });

  test("one status filter matches the selected status", async () => {
    const { body } = await getTalent("status=alumni");
    expect(ids(body)).toEqual(["S13", "S11", "S12"]);
  });

  test("both status values use OR semantics", async () => {
    const { body } = await getTalent("status=current&status=alumni");
    expect(body.count).toBe(17);
  });

  test("filter categories combine with AND", async () => {
    const { body } = await getTalent(
      "q=developer&skill=React&availability=contract&status=current",
    );
    expect(ids(body)).toEqual(["S18"]);
  });

  test("duplicate filter values are harmless and normalized", async () => {
    const single = await getTalent("skill=React&availability=contract&status=current");
    const duplicate = await getTalent(
      "skill=React&skill=React&availability=contract&availability=contract&status=current&status=current",
    );

    expect(duplicate.body.items).toEqual(single.body.items);
    expect(duplicate.body.filters).toEqual({
      q: "",
      skill: ["React"],
      availability: ["contract"],
      status: ["current"],
    });
  });

  test.each([
    ["skill=Unknown", "skill", "UNKNOWN_SKILL"],
    ["availability=temporary", "availability", "INVALID_AVAILABILITY"],
    ["status=staff", "status", "INVALID_STATUS"],
  ])("invalid %s returns a structured 400", async (query, field, code) => {
    const response = await talentGet(requestFor(`/api/v1/talent?${query}`));
    const body = (await response.json()) as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.details).toContainEqual(
      expect.objectContaining({ field, code }),
    );
  });

  test("an empty match returns 200 with an empty envelope", async () => {
    const { response, body } = await getTalent("q=definitely-no-match");
    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.count).toBe(0);
  });

  test("student ordering is deterministic by lower-case name then ID", async () => {
    const first = await getTalent();
    const second = await getTalent();
    const names = first.body.items.map((student) => student.name);

    expect(second.body.items).toEqual(first.body.items);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  test("nested skills and availability preserve fixture display order", async () => {
    const { body } = await getTalent("q=Maya%20Patel");
    expect(body.items[0]?.skills).toEqual(["Blender", "Maya", "Unity"]);
    expect(body.items[0]?.availability).toEqual(["internship", "contract"]);
  });

  test("project evidence count is based on canonical contributor rows", async () => {
    const { body } = await getTalent("q=Avery%20Chen");
    expect(body.items[0]?.projectEvidenceCount).toBe(2);
  });

  test("skills endpoint returns DB-backed standardized skills in display order", async () => {
    const response = await skillsGet();
    const body = (await response.json()) as FilterMetadata;

    expect(response.status).toBe(200);
    expect(body.skills.map((skill) => skill.value)).toEqual(officialFixtures.skills);
  });

  test("skills endpoint returns availability and status metadata", async () => {
    const response = await skillsGet();
    const body = (await response.json()) as FilterMetadata;

    expect(body.availability.map((option) => option.value)).toEqual([
      "internship",
      "full-time",
      "contract",
    ]);
    expect(body.status.map((option) => option.value)).toEqual(["current", "alumni"]);
  });

  test("runtime APIs work without access to the fixture directory", async () => {
    const originalDirectory = process.cwd();
    try {
      process.chdir(tmpdir());
      const talentResponse = await talentGet(requestFor("/api/v1/talent?q=Avery"));
      const metadataResponse = await skillsGet();
      expect(talentResponse.status).toBe(200);
      expect(metadataResponse.status).toBe(200);
    } finally {
      process.chdir(originalDirectory);
    }
  });

  async function getTalent(query = "") {
    const suffix = query ? `?${query}` : "";
    const response = await talentGet(requestFor(`/api/v1/talent${suffix}`));
    return {
      response,
      body: (await response.json()) as TalentDirectoryResponse,
    };
  }
});

function requestFor(path: string) {
  return new Request(`http://localhost${path}`);
}

function ids(body: TalentDirectoryResponse) {
  return body.items.map((student) => student.id);
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
