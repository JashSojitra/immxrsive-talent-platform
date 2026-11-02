import "./setup";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import * as s from "@/db/schema";
import { createProjectHandlers } from "@/projects/http";
import { AuthenticationRequiredError } from "@/auth/server";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { queryTalentDirectory } from "@/db/queries/talent";
import { createContextualInquiry } from "@/db/queries/inquiry";
import { inviteContributor, respondToInvitation, updateContribution } from "@/projects/service";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";

const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const draft = { title: "Manual XR work", description: "A student-created project.", domain: "Training", technologies: ["Unity"], projectDate: "2026-10-31", projectStatus: "completed", repositories: [], links: [{ label: "Project website", url: "https://example.com/project" }], media: [{ kind: "video", label: "Walkthrough", url: "https://example.com/video", altText: "" }] };
suite("manual project HTTP and public projection", () => {
  let db: Database, close: () => Promise<void>, handlers: ReturnType<typeof createProjectHandlers>;
  let users: string[], profiles: string[], ids: string[];
  beforeAll(async () => {
    const connection = createDatabase(target!, 5); db = connection.db; close = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));
    handlers = createProjectHandlers({ database: () => db, applicationOrigin: "http://localhost", authorize: async req => {
      const id = req.headers.get("x-test-user"); if (!id) throw new AuthenticationRequiredError(); return { user: { id } };
    } });
  });
  beforeEach(async () => {
    ids = []; users = []; profiles = [];
    for (let i = 0; i < 3; i++) {
      const id = randomUUID(); users.push(id);
      await db.insert(s.authUsers).values({ id, name: `Phase3 Student ${i}`, email: `${id}@example.test` });
      if (i < 2) await db.insert(s.studentAffiliations).values({ userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date() });
      const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: id, publicationStatus: "published", studentStatus: "current", headline: "XR work", biography: "Synthetic test profile", program: "Computing" }).returning(); profiles.push(profile.id);
    }
  });
  afterEach(async () => {
    if (ids.length) {
      await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId, ids));
      const members = await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      if (members.length) await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId, members.map(m => m.id)));
      await db.delete(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      await db.delete(s.projectRepositories).where(inArray(s.projectRepositories.projectId, ids));
      await db.delete(s.projectLinks).where(inArray(s.projectLinks.projectId, ids));
      await db.delete(s.projectMedia).where(inArray(s.projectMedia.projectId, ids));
      await db.delete(s.inquiries).where(inArray(s.inquiries.projectId, ids));
      await db.delete(s.projects).where(inArray(s.projects.id, ids));
    }
    await db.delete(s.authUsers).where(inArray(s.authUsers.id, users));
  });
  afterAll(async () => close?.());
  function request(body?: unknown, actor = users[0], origin: string | null = "http://localhost") {
    return new Request("http://localhost/api/v1/student/projects", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(actor ? { "x-test-user": actor } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  async function create() {
    const response = await handlers.create(request({ draft, creatorRoleId: "xr-developer" })); expect(response.status).toBe(201);
    const body = await response.json(); ids.push(body.project.id); return body as { project: { id: string; version: number; publicationStatus: string }; draft: typeof draft };
  }
  test("verified student creates, edits, publishes and unpublishes one canonical project", async () => {
    const saved = await create(); const id = saved.project.id;
    expect(saved.project.publicationStatus).toBe("unpublished");
    expect(saved.draft).toMatchObject(draft);
    expect(await queryPublicProject(db, id)).toBeNull();
    expect((await queryPublicStudentProfile(db, profiles[0]))?.projects).toEqual([]);
    const get = await handlers.get(request(), id); expect(get.headers.get("cache-control")).toBe("private, no-store");
    const list = await (await handlers.list(request())).json(); expect(list.projects.map((p: { id: string }) => p.id)).toContain(id);
    const publish = await handlers.publication(request({ version: 1, published: true }), id); expect(publish.status).toBe(200);
    const visible = await queryPublicProject(db, id);
    expect(visible).toMatchObject({ id, title: draft.title, projectDate: draft.projectDate, projectStatus: "completed", contributors: [{ studentId: profiles[0], role: "XR Developer", profileUrl: `/students/${profiles[0]}` }] });
    expect(visible?.assets).toContainEqual({ type: "video", label: "Walkthrough", url: "https://example.com/video" });
    const inquiry = await createContextualInquiry(db, { sourceType: "project", sourceId: id, companyName: "Example", contactName: "Employer", contactEmail: "employer@example.test", description: "We would like to discuss this published project.", website: "" });
    expect(inquiry).not.toBeNull();
    expect((await db.select().from(s.inquiries).where(eq(s.inquiries.id, inquiry!.id)))[0]).toMatchObject({ projectId: id, studentId: null, studentProfileId: null });
    expect((await queryPublicStudentProfile(db, profiles[0]))?.projects).toMatchObject([{ id, role: "XR Developer", technologies: ["Unity"] }]);
    const talent = await queryTalentDirectory(db, { q: "", searchGroups: [], skills: [], availability: [], status: [] });
    expect(talent.items.find(p => p.id === profiles[0])?.projectEvidenceCount).toBe(1);
    expect((await queryPublicStudentProfile(db, profiles[0]))?.skills).not.toContain("Unity");
    const serialized = JSON.stringify(visible); expect(serialized).not.toContain(users[0]); expect(serialized).not.toContain("algomau.ca");
    const unpublish = await handlers.publication(request({ version: 2, published: false }), id); expect(unpublish.status).toBe(200);
    expect(await queryPublicProject(db, id)).toBeNull(); expect((await queryPublicStudentProfile(db, profiles[0]))?.projects).toEqual([]);
  });
  test("zero/multiple/replaced repositories preserve the permanent ID and every shared field", async () => {
    const saved = await create(); let version = saved.project.version;
    for (const repositories of [[{ url: "https://github.com/org/a" }, { url: "https://github.com/org/b" }], [{ url: "https://github.com/org/renamed" }], []]) {
      const response = await handlers.edit(request({ version, draft: { ...draft, repositories } }), saved.project.id); expect(response.status).toBe(200);
      const body = await response.json(); expect(body.project.id).toBe(saved.project.id); expect(body.draft.repositories).toEqual(repositories); version = body.project.version;
    }
  });
  test("anonymous, unverified, outsider and legacy mutations are denied", async () => {
    expect((await handlers.create(request({ draft, creatorRoleId: "xr-developer" }, ""))).status).toBe(401);
    expect((await handlers.create(request({ draft, creatorRoleId: "xr-developer" }, users[2]))).status).toBe(403);
    const saved = await create();
    expect((await handlers.edit(request({ version: 1, draft }), "P01")).status).toBe(403);
    for (const actor of ["", users[1], users[2]]) {
      const expected = actor ? 403 : 401;
      expect((await handlers.edit(request({ version: 1, draft }, actor), saved.project.id)).status).toBe(expected);
      expect((await handlers.publication(request({ version: 1, published: true }, actor), saved.project.id)).status).toBe(expected);
      expect((await handlers.get(request(undefined, actor), saved.project.id)).status).toBe(expected);
    }
  });
  test("configured public origin accepts proxy reconstruction without trusting an internal host", async () => {
    const canonical = createProjectHandlers({ database: () => db, authorize: async () => ({ user: { id: users[0] } }), applicationOrigin: "https://studio.example" });
    const proxied = (origin: string) => new Request("http://localhost:3100/api/v1/student/projects", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ draft, creatorRoleId: "xr-developer" }) });
    expect((await canonical.create(proxied("http://localhost:3100"))).status).toBe(403);
    const response = await canonical.create(proxied("https://studio.example")); expect(response.status).toBe(201);
    ids.push((await response.json()).project.id);
  });
  test("strict body schemas, origin checks and bounded JSON reject unsafe requests", async () => {
    for (const origin of [null, "https://evil.example"]) expect((await handlers.create(request({ draft, creatorRoleId: "xr-developer" }, users[0], origin))).status).toBe(403);
    for (const body of [{ draft: { ...draft, maintainerUserId: users[1] }, creatorRoleId: "xr-developer" }, { draft, creatorRoleId: "xr-developer", ownerUserId: users[1] }, { draft: { ...draft, media: [{ kind: "playable", label: "Unsafe", url: "javascript:alert(1)" }] }, creatorRoleId: "xr-developer" }]) expect((await handlers.create(request(body))).status).toBe(422);
    const oversized = request({ draft: { ...draft, description: "x".repeat(66000) }, creatorRoleId: "xr-developer" }); expect((await handlers.create(oversized)).status).toBe(413);
    const malformed = new Request("http://localhost/api/v1/student/projects", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost", "x-test-user": users[0] }, body: "{" }); expect((await handlers.create(malformed)).status).toBe(400);
  });
  test("stale update/publication returns a structured 409 and preserves newer database values", async () => {
    const saved = await create();
    expect((await handlers.edit(request({ version: 1, draft: { ...draft, title: "Newer value" } }), saved.project.id)).status).toBe(200);
    const stale = await handlers.edit(request({ version: 1, draft: { ...draft, title: "Stale value" } }), saved.project.id); expect(stale.status).toBe(409); expect(await stale.json()).toMatchObject({ error: { code: "EDIT_CONFLICT" } });
    expect((await handlers.publication(request({ version: 1, published: true }), saved.project.id)).status).toBe(409);
    expect((await (await handlers.get(request(), saved.project.id)).json()).draft.title).toBe("Newer value");
  });
  test("public associations require accepted, visible, published profiles and personal featuring", async () => {
    const saved = await create(); const id = saved.project.id;
    const invitation = await inviteContributor({ db, actorUserId: users[0], projectId: id, version: 1, profileId: profiles[1], roleId: "3d-artist" });
    await handlers.publication(request({ version: 2, published: true }), id);
    expect((await queryPublicProject(db, id))?.contributors.map(p => p.studentId)).toEqual([profiles[0]]);
    const member = await respondToInvitation({ db, actorUserId: users[1], membershipId: invitation.id, version: 1, accept: true });
    expect((await queryPublicStudentProfile(db, profiles[1]))?.projects.map(p => p.id)).toEqual([id]);
    await updateContribution({ db, actorUserId: users[1], membershipId: member.id, version: 1, contribution: { roleId: "3d-artist", statement: "My own 3D work", featured: false, publicVisible: true } });
    expect((await queryPublicStudentProfile(db, profiles[1]))?.projects).toEqual([]);
    expect((await queryPublicProject(db, id))?.contributors.find(p => p.studentId === profiles[1])?.statement).toBe("My own 3D work");
    await db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.id, profiles[1]));
    expect(await queryPublicStudentProfile(db, profiles[1])).toBeNull();
    expect((await queryPublicProject(db, id))?.contributors.map(p => p.studentId)).toEqual([profiles[0]]);
    await db.update(s.projectContributions).set({ publicVisible: false }).where(eq(s.projectContributions.membershipId, (await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.profileId, profiles[0])))[0].id));
    expect((await queryPublicProject(db, id))?.contributors).toEqual([]);
  });
});
