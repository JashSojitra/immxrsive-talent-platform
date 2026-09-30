import { asc, count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

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
import { skillIdForName } from "@/fixtures/ids";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData, type FixtureData } from "@/fixtures/schema";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("fixture import with PostgreSQL", () => {
  let db: Database;
  let closeDatabase: (() => Promise<void>) | undefined;
  let officialFixtures: FixtureData;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error("TEST_DATABASE_URL is required for integration tests.");
    }

    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    officialFixtures = validateFixtureData(await loadFixtureSource());
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  afterAll(async () => {
    await closeDatabase?.();
  });

  test("multiple student availability values import in source order", async () => {
    await importFixtureData(db, officialFixtures);

    const rows = await db
      .select()
      .from(studentAvailability)
      .where(eq(studentAvailability.studentId, "S02"))
      .orderBy(asc(studentAvailability.displayOrder));

    expect(rows.map((row) => row.availabilityValue)).toEqual([
      "internship",
      "contract",
    ]);
  });

  test("student skills remain independent from project technologies", async () => {
    await importFixtureData(db, officialFixtures);

    const explicitSkill = await db
      .select()
      .from(studentSkills)
      .where(eq(studentSkills.studentId, "S06"));
    const projectTechnology = await db
      .select()
      .from(projectTechnologies)
      .where(eq(projectTechnologies.projectId, "P01"));

    expect(explicitSkill.map((row) => row.skillId)).not.toContain(skillIdForName("C#"));
    expect(projectTechnology.map((row) => row.technologyName)).toContain("C#");
  });

  test("a shared project is one project with multiple contributor rows", async () => {
    await importFixtureData(db, officialFixtures);

    const [projectCount] = await db
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.id, "P01"));
    const contributors = await db
      .select()
      .from(projectContributors)
      .where(eq(projectContributors.projectId, "P01"));

    expect(projectCount.value).toBe(1);
    expect(contributors).toHaveLength(3);
  });

  test("contributor roles are preserved", async () => {
    await importFixtureData(db, officialFixtures);

    const [contributor] = await db
      .select()
      .from(projectContributors)
      .where(eq(projectContributors.studentId, "S06"));

    expect(contributor.role).toBe("UX Researcher");
  });

  test("importing the same fixtures twice is idempotent", async () => {
    await importFixtureData(db, officialFixtures);
    const firstCounts = await databaseCounts(db);

    await importFixtureData(db, officialFixtures);
    const secondCounts = await databaseCounts(db);

    expect(secondCounts).toEqual(firstCounts);
  });

  test("fixture validation failure cannot partially mutate the database", async () => {
    await importFixtureData(db, officialFixtures);
    const before = await databaseCounts(db);
    const invalidSource = structuredClone(await loadFixtureSource()) as {
      students: Array<{ project_ids: string[] }>;
    };
    invalidSource.students[0].project_ids = [];

    expect(() => validateFixtureData(invalidSource)).toThrow(/relationship mismatch/i);
    expect(await databaseCounts(db)).toEqual(before);
  });

  test("a database failure rolls back the entire import transaction", async () => {
    await importFixtureData(db, officialFixtures);
    const before = await databaseCounts(db);
    const postValidationMutation = structuredClone(officialFixtures);
    postValidationMutation.projects[0].contributors[0].student_id = "S99";

    await expect(importFixtureData(db, postValidationMutation)).rejects.toThrow();
    expect(await databaseCounts(db)).toEqual(before);
  });
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

async function databaseCounts(db: Database) {
  const tables = {
    students,
    skills,
    studentSkills,
    availabilityOptions,
    studentAvailability,
    professionalLinks,
    projects,
    projectContributors,
    projectTechnologies,
    projectAssets,
    inquiries,
  };

  return Object.fromEntries(
    await Promise.all(
      Object.entries(tables).map(async ([name, table]) => {
        const [result] = await db.select({ value: count() }).from(table);
        return [name, result.value];
      }),
    ),
  );
}
