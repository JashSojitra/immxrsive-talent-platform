import "./setup";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import { authUsers, projects, projectTechnologies, studioRoles } from "@/db/schema";
import { adminCommand, adminCreate, adminDetail } from "@/admin/service";
import { emptyContent } from "@/admin/policy";
import { listPublicProjects } from "@/projects/public-directory";
let db: Database;
let close: () => Promise<void>;
beforeAll(async () => {
  const connection = createDatabase(process.env.TEST_DATABASE_URL!);
  db = connection.db;
  close = () => connection.client.end();
  await migrate(db, { migrationsFolder: "drizzle" });
});
afterAll(async () => close?.());

test("public directory includes only published student work and preserves its technology ordering", async () => {
  const publicId = randomUUID();
  const privateId = randomUUID();
  await db.insert(projects).values([
    { id: publicId, title: "Published student work", description: "Public evidence", domain: "XR", publicationStatus: "published" },
    { id: privateId, title: "Private work", description: "Private draft", domain: "XR" },
  ]);
  await db.insert(projectTechnologies).values([
    { projectId: publicId, technologyName: "Unity", displayOrder: 1 },
    { projectId: publicId, technologyName: "OpenXR", displayOrder: 0 },
    { projectId: privateId, technologyName: "Private technology", displayOrder: 0 },
  ]);
  const rows = await listPublicProjects(db);
  expect(rows.find(row => row.id === publicId)?.technologies).toEqual(["OpenXR", "Unity"]);
  expect(rows.some(row => row.id === privateId)).toBe(false);
  expect(JSON.stringify(rows)).not.toContain("Private technology");
});

test("staff-curated projects enter and leave discovery with their publication lifecycle", async () => {
  const staffId = randomUUID();
  await db.insert(authUsers).values({ id: staffId, name: "Synthetic curator", email: `${staffId}@example.test` });
  await db.insert(studioRoles).values({ userId: staffId, role: "xr_admin" });
  const content = { ...emptyContent, title: "Synthetic staff collection", summary: "Public summary", description: "Published curated work", technologies: ["WebXR", "Three.js"], fallbackText: "A descriptive alternative to the experience." };
  const { project } = await adminCreate(db, staffId, content);
  expect((await listPublicProjects(db)).some(row => row.id === project.id)).toBe(false);
  const act = async (action: "publish" | "unpublish" | "archive") => {
    const current = await adminDetail(db, staffId, project.id);
    await adminCommand(db, staffId, project.id, { action, version: current.project.version });
  };
  await act("publish");
  expect((await listPublicProjects(db)).find(row => row.id === project.id)).toMatchObject({ managementMode: "ADMIN_MANAGED", technologies: ["WebXR", "Three.js"] });
  await act("unpublish");
  expect((await listPublicProjects(db)).some(row => row.id === project.id)).toBe(false);
  await act("publish");
  await act("archive");
  expect((await listPublicProjects(db)).some(row => row.id === project.id)).toBe(false);
});
