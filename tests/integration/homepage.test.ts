import "./setup";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { loadHomepage } from "@/components/home/load-homepage";
import { createDatabase } from "@/db/client";
import { articles, authUsers, studentProfiles } from "@/db/schema";

vi.mock("server-only", () => ({}));

const url = process.env.TEST_DATABASE_URL!;
const reader = createDatabase(url, 1);
const blocker = createDatabase(url, 1);
const userId = randomUUID();

beforeAll(async () => {
  await migrate(reader.db, { migrationsFolder: "drizzle" });
  await reader.db.insert(authUsers).values({ id: userId, name: "Homepage fixture student", email: "homepage@example.test" });
  const [profile] = await reader.db.insert(studentProfiles).values({
    ownerUserId: userId, publicationStatus: "published", studentStatus: "current",
  }).returning();
  await reader.db.insert(articles).values({
    slug: "homepage-test-story", category: "student_success", status: "published",
    title: "Homepage fixture story", excerpt: "Test excerpt", bodyMarkdown: "Test body",
    studentProfileId: profile.id, studentApprovedAt: new Date(), publishedAt: new Date(),
    authorDisplayName: "Test author", createdBy: userId, updatedBy: userId,
  });
});

afterAll(async () => {
  await Promise.all([reader.client.end({ timeout: 1 }), blocker.client.end({ timeout: 1 })]);
});

test("loads a published story and student with one database connection", async () => {
  const homepage = await loadHomepage(reader.db);
  expect(homepage.portfolios).toBe(1);
  expect(homepage.homeStories).toMatchObject([{ slug: "homepage-test-story", student: { name: "Homepage fixture student" } }]);
}, 6500);

test("a blocked articles table produces empty story and update sections while other reads succeed", async () => {
  await blocker.client.begin(async tx => {
    await tx`LOCK TABLE articles IN ACCESS EXCLUSIVE MODE`;
    const homepage = await loadHomepage(reader.db, 2500, 150);
    expect(homepage.portfolios).toBe(1);
    expect(homepage.homeStories).toEqual([]);
    expect(homepage.updates).toEqual([]);
  });
  expect((await loadHomepage(reader.db)).homeStories).toHaveLength(1);
}, 5000);

test("the page deadline also covers waiting for the sole pooled connection", async () => {
  await reader.client.begin(async () => {
    const homepage = await loadHomepage(reader.db, 150, 1200);
    expect(homepage).toEqual({ projects: [], portfolios: 0, partners: [], homeStories: [], updates: [] });
  });
  expect((await loadHomepage(reader.db)).portfolios).toBe(1);
}, 3000);
