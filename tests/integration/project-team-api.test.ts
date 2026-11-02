import "./setup";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AuthenticationRequiredError } from "@/auth/server";
import { createDatabase, type Database } from "@/db/client";
import * as s from "@/db/schema";
import * as service from "@/projects/service";
import { createTeamHandlers } from "@/projects/team-http";
import { createProjectHandlers } from "@/projects/http";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const draft = { title: "Shared API project", description: "One canonical shared record", domain: "XR", technologies: ["Unity"] };
suite("project team private HTTP journey", () => {
  let db: Database; let close: () => Promise<void>;
  let ids: string[], users: string[], profiles: string[];
  let handlers: ReturnType<typeof createProjectHandlers>;
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
    for (let i = 0; i < 4; i++) {
      const id = randomUUID(); users.push(id);
      await db.insert(s.authUsers).values({ id, name: `Phase3 Student ${i}`, email: `${id}@example.test` });
      if (i < 3) await db.insert(s.studentAffiliations).values({ userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date() });
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
  const team = () => createTeamHandlers({ database: () => db, applicationOrigin: "http://localhost", authorize: async req => {
    const id = req.headers.get("x-test-user"); if (!id) throw new AuthenticationRequiredError(); return { user: { id } };
  } });
  const ctx = (i = 0) => ({ db, actorUserId: users[i] });
  function request(body?: unknown, i = 0, origin = "http://localhost") {
    return new Request("http://localhost/api/v1/student/projects", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Origin: origin, ...(i >= 0 ? { "x-test-user": users[i] } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  async function create() { const p = await service.createProject({ ...ctx(), draft, creatorRoleId: "xr-developer" }); ids.push(p.id); return p; }
  async function state(id: string, i = 0) { return (await team()(request(undefined, i), "team", id)).json(); }
  async function invite(id: string, i = 1) {
    const current = await state(id); const response = await team()(request({ version: current.project.version, profileId: profiles[i], roleId: "software-developer" }), "invite", id);
    expect(response.status).toBe(200); return (await state(id)).members.find((m: { profileId: string }) => m.profileId === profiles[i]);
  }
  async function accept(id: string, i = 1) { const m = await invite(id, i); expect((await team()(request({ version: m.version, accept: true }, i), "response", m.id)).status).toBe(200); return m; }
  test("private inbox and pending/declined roles never imply public acceptance", async () => {
    const p = await create(); await service.setProjectPublication({ ...ctx(), projectId: p.id, version: 1, published: true });
    const m = await invite(p.id);
    const inbox = await team()(request(undefined, 1), "inbox"); expect(inbox.headers.get("cache-control")).toBe("private, no-store");
    expect((await inbox.json()).projects).toMatchObject([{ id: p.id, state: "pending", proposedRole: "Software Developer" }]);
    expect((await queryPublicProject(db, p.id))?.contributors).toHaveLength(1);
    expect((await team()(request({ version: 1, accept: true }, 2), "response", m.id)).status).toBe(403);
    expect((await team()(request({ version: 1, accept: false }, 1), "response", m.id)).status).toBe(200);
    expect((await team()(request({ version: 1, accept: true }, 1), "response", m.id)).status).toBe(409);
    expect((await queryPublicProject(db, p.id))?.contributors).toHaveLength(1);
    expect((await db.select().from(s.projectContributions).where(eq(s.projectContributions.membershipId, m.id)))).toEqual([]);
  });
  test("eligible search excludes private/unverified directories and invitations reject unverified targets", async () => {
    const p = await create(); await db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.id, profiles[1]));
    const search = (q: string, actor = 0) => team()(new Request(`http://localhost?q=${encodeURIComponent(q)}`, { headers: { "x-test-user": users[actor] } }), "candidates", p.id);
    expect((await (await search("Phase3 Student")).json()).students.map((r: { id: string }) => r.id)).toEqual([profiles[2]]);
    expect((await (await search(profiles[1])).json()).students).toMatchObject([{ id: profiles[1] }]);
    expect((await search("Phase3", 1)).status).toBe(403);
    expect((await team()(request({ version: 1, profileId: profiles[3], roleId: "xr-developer" }), "invite", p.id)).status).toBe(404);
    const m = await invite(p.id); expect(m.state).toBe("pending");
    expect((await team()(request({ version: 2, profileId: profiles[1], roleId: "xr-developer" }), "invite", p.id)).status).toBe(409);
  });
  test("two accepted profiles share one URL and only the contributor controls their evidence", async () => {
    const p = await create(); const m = await accept(p.id);
    let current = await state(p.id, 1); expect(current.members).toHaveLength(1); expect(JSON.stringify(current)).not.toContain(users[0]);
    const contribution = { roleId: "ui-ux-designer", statement: "I designed the spatial interface.", featured: true, publicVisible: true };
    expect((await team()(request({ version: 1, contribution }), "contribution", m.id)).status).toBe(403);
    expect((await team()(request({ version: 1, contribution }, 1), "contribution", m.id)).status).toBe(200);
    expect((await team()(request({ version: 1, contribution: { ...contribution, statement: "stale" } }, 1), "contribution", m.id)).status).toBe(409);
    current = await state(p.id); await service.setProjectPublication({ ...ctx(), projectId: p.id, version: current.project.version, published: true });
    for (const profile of profiles.slice(0,2)) expect((await queryPublicStudentProfile(db, profile))?.projects).toMatchObject([{ id: p.id }]);
    expect((await queryPublicProject(db, p.id))?.contributors.find(c => c.studentId === profiles[1])).toMatchObject({ role: "UI/UX Designer", statement: contribution.statement });
    expect((await team()(request({ version: 2, contribution: { ...contribution, featured: false } }, 1), "contribution", m.id)).status).toBe(200);
    expect((await queryPublicStudentProfile(db, profiles[1]))?.projects).toEqual([]);
    expect((await queryPublicProject(db, p.id))?.contributors).toHaveLength(2);
    expect((await team()(request({ version: 3, contribution: { ...contribution, publicVisible: false } }, 1), "contribution", m.id)).status).toBe(200);
    expect((await queryPublicProject(db, p.id))?.contributors).toHaveLength(1);
    expect((await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.id, m.id)))[0].state).toBe("accepted");
    expect((await db.select().from(s.studentProfileSkills).where(eq(s.studentProfileSkills.profileId, profiles[1])))).toEqual([]);
  });
  test("soft removal and restore preserve contribution, original acceptance, ID and visibility", async () => {
    const p = await create(); const m = await accept(p.id); const before = (await state(p.id)).members.find((r: { id: string }) => r.id === m.id);
    expect((await team()(request({ version: 2, reason: "Review attribution" }, 2), "removal", m.id)).status).toBe(403);
    expect((await team()(request({ version: 2, reason: "Review attribution" }), "removal", m.id)).status).toBe(200);
    const removed = await state(p.id, 1); expect(removed.members[0]).toMatchObject({ id: m.id, state: "removed", removalReason: "Review attribution", contribution: before.contribution });
    expect((await team()(request({ version: 1, contribution: { roleId: "xr-developer", statement: "x", featured: true, publicVisible: true } }, 1), "contribution", m.id)).status).toBe(409);
    expect((await team()(request({ version: 3 }), "restore", m.id)).status).toBe(200);
    const restored = (await state(p.id, 1)).members[0]; expect(restored).toMatchObject({ id: m.id, state: "accepted", contribution: before.contribution }); expect(restored.restoredAt).toBeTruthy();
    const own = (await state(p.id)).ownMembershipId;
    expect((await team()(request({ version: 1 }), "removal", own)).status).toBe(409);
  });
  test("transfer requires recipient consent and invalidates outgoing maintainer authority", async () => {
    const p = await create(); const m = await accept(p.id); let current = await state(p.id);
    expect((await team()(request({ version: current.project.version, targetMembershipId: m.id }), "offer", p.id)).status).toBe(200);
    let offer = (await state(p.id,1)).transfers[0];
    expect((await team()(request({ accept: true }, 2), "transfer", offer.id)).status).toBe(403);
    expect((await team()(request({ accept: false }, 1), "transfer", offer.id)).status).toBe(200);
    current = await state(p.id); await team()(request({ version: current.project.version, targetMembershipId: m.id }), "offer", p.id);
    offer = (await state(p.id,1)).transfers.find((t: { state: string }) => t.state === "pending");
    expect((await team()(request({ accept: true }, 1), "transfer", offer.id)).status).toBe(200);
    const now = await state(p.id,1); expect(now.project.id).toBe(p.id); expect(now.isMaintainer).toBe(true);
    expect((await handlers.edit(request({ version: now.project.version, draft }), p.id)).status).toBe(403);
    expect((await team()(request({ version: now.project.version, profileId: profiles[2], roleId: "xr-developer" }), "invite", p.id)).status).toBe(403);
    expect((await team()(request({ accept: true },1), "transfer", offer.id)).status).toBe(409);
  });
  test("stale transfer cannot be accepted but can be declined; replacement cancels prior offer", async () => {
    const p = await create(); const m = await accept(p.id); let current = await state(p.id);
    await team()(request({ version: current.project.version, targetMembershipId: m.id }), "offer", p.id);
    const offer = (await state(p.id,1)).transfers[0]; current = await state(p.id);
    await service.updateProject({ ...ctx(), projectId: p.id, version: current.project.version, draft });
    expect((await team()(request({ accept: true },1), "transfer", offer.id)).status).toBe(409);
    expect((await team()(request({ accept: false },1), "transfer", offer.id)).status).toBe(200);
    current = await state(p.id); await team()(request({ version: current.project.version, targetMembershipId: m.id }), "offer", p.id);
    const pending = (await state(p.id)).transfers.find((t: { state: string }) => t.state === "pending");
    current = await state(p.id); await team()(request({ version: current.project.version, targetMembershipId: m.id }), "offer", p.id);
    expect((await team()(request({ accept: true },1), "transfer", pending.id)).status).toBe(409);
  });
  test("strict schemas, cross-site, anonymous, unverified and outsider requests fail closed", async () => {
    const p = await create();
    for (const [i,status] of [[-1,401],[3,403],[2,403]]) {
      expect((await team()(request(undefined,i), "team", p.id)).status).toBe(status);
      expect((await team()(request({ version: 1, profileId: profiles[1], roleId: "xr-developer" },i), "invite", p.id)).status).toBe(status);
    }
    expect((await team()(request({ version: 1, profileId: profiles[1], roleId: "xr-developer" },0,"https://evil.example"), "invite", p.id)).status).toBe(403);
    expect((await team()(request({ version: 1, profileId: profiles[1], roleId: "xr-developer", actorUserId: users[2] }), "invite", p.id)).status).toBe(422);
    expect((await team()(request(), "team", "P01")).status).toBe(404);
  });
});
