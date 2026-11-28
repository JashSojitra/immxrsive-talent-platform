import "./setup";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { beforeAll, afterAll, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ actor: "" }));
vi.mock("@/auth/server", async original => ({ ...await original<typeof import("@/auth/server")>(), requireAuthenticatedRequestUser: async () => ({ id: state.actor }), getAuthenticatedRequestUser: async () => state.actor ? ({ id: state.actor }) : null }));
import { createDatabase } from "@/db/client";
import * as s from "@/db/schema";
import { POST } from "@/app/api/media/route";
import { GET as mediaGet } from "@/app/media/[id]/route";
import { createProject, inviteContributor, respondToInvitation, setMembershipRemoved, setProjectPublication } from "@/projects/service";
import { listScreenshots, updateScreenshots } from "@/projects/screenshots";
import { queryPublicProject } from "@/db/queries/project-detail";
import { listPublicProjects } from "@/projects/public-directory";
const c = createDatabase(process.env.TEST_DATABASE_URL!, 5); const db = c.db;
const owner = randomUUID(), member = randomUUID(), other = randomUUID(); let memberProfile: string; let input: Buffer;
const origin = "http://127.0.0.1:3100";
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  for (const id of [owner, member, other]) {
    await db.insert(s.authUsers).values({ id, name: "Screenshot fixture student", email: `${id}@example.test` });
    await db.insert(s.studentAffiliations).values({ userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date() });
    const [p] = await db.insert(s.studentProfiles).values({ ownerUserId: id }).returning(); if (id === member) memberProfile = p.id;
  }
  await db.insert(s.projectRoles).values({ id: "fixture-screenshot-role", name: "Fixture designer", displayOrder: 1000 });
  input = await sharp({ create: { width: 2400, height: 1350, channels: 3, background: "#582c83" } }).png().withMetadata().toBuffer(); state.actor = owner;
});
afterAll(async () => { await c.client.end(); });
const create = () => createProject({ db, actorUserId: owner, creatorRoleId: "fixture-screenshot-role", draft: { title: randomUUID(), description: "Test-only screenshot project.", domain: "XR", projectStatus: "in_progress", projectDate: null, technologies: [], repositories: [], links: [], media: [] } });
function upload(projectId: string, altText = "A test-only project screenshot", caption = "Fixture caption") {
  return POST(new Request(`${origin}/api/media`, { method: "POST", headers: { Origin: origin, "Content-Type": "image/png", "x-media-kind": "project_screenshot", "x-project-id": projectId, "x-alt-text": encodeURIComponent(altText), "x-caption": encodeURIComponent(caption) }, body: new Uint8Array(input) }));
}
test("screenshots reuse WebP/metadata stripping, require alt text, and become public only with the project", async () => {
  const p = await create();
  expect((await upload(p.id, "")).status).toBe(422); expect((await upload(p.id, "x".repeat(301))).status).toBe(422); expect((await upload(p.id, "Description", "x".repeat(301))).status).toBe(422);
  const uploaded = await upload(p.id); expect(uploaded.status).toBe(201); const result = await uploaded.json();
  const [media] = await db.select().from(s.mediaAssets).where(eq(s.mediaAssets.id, result.screenshots[0].url.split('/').pop()));
  const metadata = await sharp(media.bytes).metadata(); expect(media.kind).toBe("project_screenshot"); expect(metadata.format).toBe("webp"); expect(metadata.width).toBe(1920); expect(metadata.exif).toBeUndefined(); expect(metadata.xmp).toBeUndefined(); expect(metadata.icc).toBeUndefined();
  const getBytes = () => mediaGet(new Request(`${origin}/media/${media.id}`), { params: Promise.resolve({ id: media.id }) });
  state.actor = ""; expect((await getBytes()).status).toBe(404); state.actor = owner; expect((await getBytes()).headers.get("cache-control")).toBe("private, no-store");
  expect(await queryPublicProject(db, p.id)).toBeNull();
  expect((await listPublicProjects(db)).some(p2 => p2.id === p.id)).toBe(false);
  await setProjectPublication({ db, actorUserId: owner, projectId: p.id, version: p.version, published: true });
  expect((await queryPublicProject(db, p.id))?.screenshots?.[0]).toMatchObject({ altText: "A test-only project screenshot", caption: "Fixture caption" });
  expect((await listPublicProjects(db)).find(p2 => p2.id === p.id)?.media[0].url).toBe(result.screenshots[0].url);
  state.actor = ""; expect((await getBytes()).status).toBe(200);
  await setProjectPublication({ db, actorUserId: owner, projectId: p.id, version: p.version + 1, published: false });
  expect((await getBytes()).status).toBe(404); state.actor = owner;
});
test("accepted members can upload/reorder/delete; outsiders and pending/removed members cannot", async () => {
  const p = await create();
  const invitation = await inviteContributor({ db, actorUserId: owner, projectId: p.id, version: p.version, profileId: memberProfile, roleId: "fixture-screenshot-role" });
  state.actor = member; expect((await upload(p.id)).status).toBe(403);
  await respondToInvitation({ db, actorUserId: member, membershipId: invitation.id, version: invitation.version, accept: true });
  expect((await upload(p.id, "First image")).status).toBe(201); expect((await upload(p.id, "Second image")).status).toBe(201);
  const current = await listScreenshots(db, member, p.id); const reordered = [...current.screenshots].reverse().map(({ id, altText, caption }) => ({ id, altText, caption }));
  await expect(updateScreenshots(db, other, p.id, { revision: current.revision, screenshots: reordered })).rejects.toMatchObject({ status: 403 });
  const updated = await updateScreenshots(db, member, p.id, { revision: current.revision, screenshots: reordered }); expect(updated.screenshots.map(s => s.altText)).toEqual(["Second image", "First image"]);
  await expect(updateScreenshots(db, member, p.id, { revision: current.revision, screenshots: reordered })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
  const removedMedia = updated.screenshots[0].url.split('/').pop()!;
  await updateScreenshots(db, member, p.id, { revision: updated.revision, screenshots: reordered.slice(1) }); expect(await db.select().from(s.mediaAssets).where(eq(s.mediaAssets.id, removedMedia))).toHaveLength(0);
  await setMembershipRemoved({ db, actorUserId: owner, membershipId: invitation.id, version: invitation.version + 1, removed: true });
  await expect(listScreenshots(db, member, p.id)).rejects.toMatchObject({ status: 403 });
  expect((await upload(p.id)).status).toBe(403);
  state.actor = owner;
});
test("the project lock enforces max ten even with concurrent uploads", async () => {
  state.actor = owner; const p = await create();
  for (let i = 0; i < 9; i++) expect((await upload(p.id, `Image ${i}`)).status).toBe(201);
  const race = await Promise.all([upload(p.id, "Racing image one"), upload(p.id, "Racing image two")]); expect(race.map(r => r.status).sort()).toEqual([201, 422]);
  expect((await listScreenshots(db, owner, p.id)).screenshots).toHaveLength(10);
  expect((await upload(p.id)).status).toBe(422);
});
