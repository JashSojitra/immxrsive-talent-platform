import "./setup";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import * as s from "@/db/schema";
import * as service from "@/projects/service";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
import { queryPublicProject } from "@/db/queries/project-detail";
import { createContextualInquiry } from "@/db/queries/inquiry";

const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const draft = { title: "Canonical project", description: "Shared description", domain: "XR", technologies: ["Unity"] };
const own = { roleId: "xr-developer", statement: "My contribution", featured: true, publicVisible: true };
suite("shared project domain and database security", () => {
  let db: Database;
  let close: () => Promise<void>;
  let users: string[], profiles: string[], ids: string[];
  beforeAll(async () => {
    const connection = createDatabase(target!, 5); db = connection.db; close = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
  });
  beforeEach(async () => {
    users = []; profiles = []; ids = [];
    for (let i = 0; i < 4; i++) {
      const id = randomUUID(); users.push(id);
      await db.insert(s.authUsers).values({ id, name: `Student ${i}`, email: `${id}@example.test` });
      if (i < 3) await db.insert(s.studentAffiliations).values({ userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date() });
      const [p] = await db.insert(s.studentProfiles).values({ ownerUserId: id }).returning(); profiles.push(p.id);
    }
  });
  afterEach(async () => {
    if (ids.length) {
      await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId, ids));
      const memberships = await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      if (memberships.length) await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId, memberships.map(m => m.id)));
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
  const ctx = (i = 0) => ({ db, actorUserId: users[i] });
  async function create(extra = {}) {
    const p = await service.createProject({ ...ctx(), draft: { ...draft, ...extra }, creatorRoleId: "software-developer" }); ids.push(p.id); return p;
  }
  async function current(id: string) { const [p] = await db.select().from(s.projects).where(eq(s.projects.id, id)); return p; }
  async function invite(id: string, i = 1) { return service.inviteContributor({ ...ctx(), projectId: id, version: (await current(id)).version, profileId: profiles[i], roleId: "xr-developer" }); }
  async function accepted(id: string, i = 1) { const m = await invite(id, i); return service.respondToInvitation({ ...ctx(i), membershipId: m.id, version: m.version, accept: true }); }

  test("roles match the official fixture exactly and legacy labels are not rewritten", async () => {
    const roles = await db.select().from(s.projectRoles).orderBy(s.projectRoles.displayOrder);
    expect(roles.map(r => r.name)).toEqual(JSON.parse(readFileSync("Release 3 Fixtures-20261030/standard_roles.json", "utf8")));
    expect(roles).toHaveLength(12);
  });
  test("creation is atomic, private, creator-maintained and accepted without changing personal skills", async () => {
    const p = await create();
    expect(p).toMatchObject({ origin: "student", publicationStatus: "unpublished", maintainerUserId: users[0], version: 1 });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    const [m] = await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.projectId, p.id));
    expect(m).toMatchObject({ state: "accepted", profileId: profiles[0] });
    expect(await db.select().from(s.studentProfileSkills).where(eq(s.studentProfileSkills.profileId, profiles[0]))).toEqual([]);
    expect(await queryPublicProject(db, p.id)).toBeNull();
    expect(await createContextualInquiry(db, { sourceType: "project", sourceId: p.id, companyName: "Company", contactName: "Contact", contactEmail: "contact@example.test", description: "A private project must not accept an inquiry.", website: "" })).toBeNull();
  });
  test("invalid role, forged fields and unverified creation fail without partial projects", async () => {
    for (const options of [{ ...ctx(3), creatorRoleId: "xr-developer", draft }, { ...ctx(), creatorRoleId: "forged", draft }, { ...ctx(), creatorRoleId: "xr-developer", draft: { ...draft, maintainerUserId: users[1] } }]) await expect(service.createProject(options)).rejects.toBeInstanceOf(service.ProjectError);
    expect(await db.select().from(s.projects).where(eq(s.projects.maintainerUserId, users[0]))).toEqual([]);
    await expect(service.createProject({ db, actorUserId: "", draft, creatorRoleId: "xr-developer" })).rejects.toMatchObject({ status: 401 });
  });
  test("only maintainer edits shared fields; repositories disconnect without changing identity", async () => {
    const p = await create({ repositories: [{ url: "https://github.com/org/a" }, { url: "https://github.com/org/b" }] });
    const m = await accepted(p.id);
    await expect(service.updateProject({ ...ctx(1), projectId: p.id, version: (await current(p.id)).version, draft })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const updated = await service.updateProject({ ...ctx(), projectId: p.id, version: (await current(p.id)).version, draft: { ...draft, title: "Renamed" } });
    expect(updated.id).toBe(p.id);
    expect(await db.select().from(s.projectRepositories).where(eq(s.projectRepositories.projectId, p.id))).toEqual([]);
    expect((await service.getProjectWorkspace({ ...ctx(1), projectId: p.id })).memberships.map(x => x.id)).toEqual([m.id]);
    await expect(service.getProjectWorkspace({ ...ctx(2), projectId: p.id })).rejects.toMatchObject({ status: 403 });
  });
  test("published project remains accessible, unpublication hides it", async () => {
    const p = await create();
    const published = await service.setProjectPublication({ ...ctx(), projectId: p.id, version: p.version, published: true });
    expect((await queryPublicProject(db, p.id))?.id).toBe(p.id);
    await service.setProjectPublication({ ...ctx(), projectId: p.id, version: published.version, published: false });
    expect(await queryPublicProject(db, p.id)).toBeNull();
  });
  test("invitations are recipient-only, proposed-role-bearing and never accepted silently", async () => {
    const p = await create(); const m = await invite(p.id);
    expect(m).toMatchObject({ state: "pending", proposedRoleId: "xr-developer", acceptedAt: null });
    expect(await db.select().from(s.projectContributions).where(eq(s.projectContributions.membershipId, m.id))).toEqual([]);
    await expect(service.respondToInvitation({ ...ctx(2), membershipId: m.id, version: 1, accept: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await service.getProjectWorkspace({ ...ctx(1), projectId: p.id })).memberships).toHaveLength(1);
    const accepted = await service.respondToInvitation({ ...ctx(1), membershipId: m.id, version: 1, accept: true });
    expect(accepted.state).toBe("accepted");
    await expect(service.respondToInvitation({ ...ctx(1), membershipId: m.id, version: 1, accept: true })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    await expect(invite(p.id)).rejects.toMatchObject({ code: "MEMBERSHIP_EXISTS" });
  });
  test("declined invitations retain history but cannot become contributions", async () => {
    const p = await create(); const m = await invite(p.id);
    const declined = await service.respondToInvitation({ ...ctx(1), membershipId: m.id, version: 1, accept: false });
    expect(declined).toMatchObject({ state: "declined", acceptedAt: null });
    await expect(service.updateContribution({ ...ctx(1), membershipId: m.id, version: 1, contribution: own })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
  test("contributor alone owns statement/role/visibility; hiding does not remove acceptance", async () => {
    const p = await create(); const m = await accepted(p.id);
    await expect(service.updateContribution({ ...ctx(), membershipId: m.id, version: 1, contribution: own })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const c = await service.updateContribution({ ...ctx(1), membershipId: m.id, version: 1, contribution: { ...own, featured: false, publicVisible: false } });
    expect(c).toMatchObject({ statement: own.statement, featured: false, publicVisible: false, version: 2 });
    const [row] = await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.id, m.id)); expect(row.state).toBe("accepted");
    await expect(service.updateContribution({ ...ctx(1), membershipId: m.id, version: 1, contribution: own })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
  });
  test("soft removal and restoration retain relationship ID, acceptance and personal data", async () => {
    const p = await create(); const m = await accepted(p.id);
    const c = await service.updateContribution({ ...ctx(1), membershipId: m.id, version: 1, contribution: { ...own, featured: false } });
    await expect(service.setMembershipRemoved({ ...ctx(2), membershipId: m.id, version: m.version, removed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const removed = await service.setMembershipRemoved({ ...ctx(), membershipId: m.id, version: m.version, removed: true, reason: "Review request" });
    expect(removed).toMatchObject({ id: m.id, state: "removed", acceptedAt: m.acceptedAt, removedByUserId: users[0] });
    await expect(service.updateContribution({ ...ctx(1), membershipId: m.id, version: c.version, contribution: own })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const restored = await service.setMembershipRemoved({ ...ctx(), membershipId: m.id, version: removed.version, removed: false });
    expect(restored).toMatchObject({ id: m.id, state: "accepted", acceptedAt: m.acceptedAt, removedAt: removed.removedAt });
    expect((await db.select().from(s.projectContributions).where(eq(s.projectContributions.membershipId, m.id)))[0]).toEqual(c);
  });
  test("current maintainer cannot remove their own accepted relationship", async () => {
    const p = await create(); const [m] = await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.projectId, p.id));
    await expect(service.setMembershipRemoved({ ...ctx(), membershipId: m.id, version: 1, removed: true })).rejects.toMatchObject({ code: "MAINTAINER_REQUIRED" });
  });
  test("transfer requires accepted target and consent, preserves ID, revokes old edit authority", async () => {
    const p = await create(); const pending = await invite(p.id);
    await expect(service.offerMaintainerTransfer({ ...ctx(), projectId: p.id, version: (await current(p.id)).version, targetMembershipId: pending.id })).rejects.toMatchObject({ code: "INVALID_TRANSFER" });
    const m = await service.respondToInvitation({ ...ctx(1), membershipId: pending.id, version: 1, accept: true });
    const offer = await service.offerMaintainerTransfer({ ...ctx(), projectId: p.id, version: (await current(p.id)).version, targetMembershipId: m.id });
    expect((await current(p.id)).maintainerUserId).toBe(users[0]);
    await expect(service.respondToMaintainerTransfer({ ...ctx(2), transferId: offer.id, accept: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const transferred = await service.respondToMaintainerTransfer({ ...ctx(1), transferId: offer.id, accept: true });
    expect(transferred).toMatchObject({ id: p.id, maintainerUserId: users[1] });
    await expect(service.updateProject({ ...ctx(), projectId: p.id, version: transferred.version, draft })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.respondToMaintainerTransfer({ ...ctx(1), transferId: offer.id, accept: true })).rejects.toMatchObject({ code: "INVALID_TRANSFER" });
  });
  test("edits after transfer offer invalidate stale transfer, and decline preserves maintainer", async () => {
    const p = await create(); const m = await accepted(p.id);
    const offer = await service.offerMaintainerTransfer({ ...ctx(), projectId: p.id, version: (await current(p.id)).version, targetMembershipId: m.id });
    const changed = await service.updateProject({ ...ctx(), projectId: p.id, version: (await current(p.id)).version, draft });
    await expect(service.respondToMaintainerTransfer({ ...ctx(1), transferId: offer.id, accept: true })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    const next = await service.offerMaintainerTransfer({ ...ctx(), projectId: p.id, version: changed.version, targetMembershipId: m.id });
    expect((await service.respondToMaintainerTransfer({ ...ctx(1), transferId: next.id, accept: false })).maintainerUserId).toBe(users[0]);
  });
  test("concurrent stale shared saves have one winner and atomic child collections", async () => {
    const p = await create();
    const results = await Promise.allSettled(["A", "B"].map(x => service.updateProject({ ...ctx(), projectId: p.id, version: p.version, draft: { ...draft, title: x, technologies: [x], repositories: [{ url: `https://example.com/${x}` }] } })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(r => r.status === "rejected") as PromiseRejectedResult; expect(rejected.reason).toMatchObject({ code: "EDIT_CONFLICT", status: 409 });
    const updated = await current(p.id);
    expect(updated.version).toBe(2);
    expect((await db.select().from(s.projectTechnologies).where(eq(s.projectTechnologies.projectId, p.id))).map(t => t.technologyName)).toEqual([updated.title]);
    expect((await db.select().from(s.projectRepositories).where(eq(s.projectRepositories.projectId, p.id)))[0].url).toBe(`https://example.com/${updated.title}`);
  });
  test("legacy ownership fails closed and fixture reimport skips colliding user-managed projects", async () => {
    const fixtures = validateFixtureData(await loadFixtureSource()); await importFixtureData(db, fixtures);
    await expect(service.updateProject({ ...ctx(), projectId: "P01", version: 1, draft })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const p = await create({ repositories: [{ url: "https://github.com/org/real" }] });
    const custom = structuredClone(fixtures); custom.projects[0].id = p.id;
    for (const student of custom.students) student.project_ids = student.project_ids.map(id => id === "P01" ? p.id : id);
    const before = await service.getProjectWorkspace({ ...ctx(), projectId: p.id });
    await importFixtureData(db, validateFixtureData(custom));
    expect(await service.getProjectWorkspace({ ...ctx(), projectId: p.id })).toEqual(before);
    expect((await current("P01")).maintainerUserId).toBeNull();
  });
  test("typed media and repository identity are independent, and duplicate primary media fail", async () => {
    const p = await create({ projectDate: "2026-10-30", projectStatus: "completed", media: s.PROJECT_MEDIA_KINDS.map(kind => ({ kind, label: kind, url: "https://example.com/evidence" })) });
    expect((await service.getProjectWorkspace({ ...ctx(), projectId: p.id })).media.map(m => m.kind).sort()).toEqual([...s.PROJECT_MEDIA_KINDS].sort());
    await expect(db.insert(s.projectMedia).values({ projectId: p.id, kind: "playable", url: "https://example.com/other", label: "Another", displayOrder: 7 })).rejects.toMatchObject({ cause: { code: "23505" } });
  });
  test("all new tables deny direct client privileges with RLS and no permissive policies", async () => {
    const names = ["project_roles", "project_repositories", "project_links", "project_memberships", "project_contributions", "project_maintainer_transfers", "project_media"];
    for (const table of names) {
      const rows = await db.execute(sql`select relrowsecurity from pg_class where oid = ${`public.${table}`}::regclass`);
      expect(rows[0].relrowsecurity).toBe(true);
      for (const role of ["anon", "authenticated"]) {
        const rights = await db.execute(sql`select has_table_privilege(${role}, ${`public.${table}`}, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed`);
        expect(rights[0].allowed).toBe(false);
      }
      expect(await db.execute(sql`select * from pg_policies where schemaname='public' and tablename=${table}`)).toHaveLength(0);
    }
  });
  test("database rejects invalid origin-owner, state and revision values", async () => {
    const p = await create();
    await expect(db.update(s.projects).set({ version: 0 }).where(eq(s.projects.id, p.id))).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(db.update(s.projects).set({ maintainerUserId: null }).where(eq(s.projects.id, p.id))).rejects.toMatchObject({ cause: { code: "23514" } });
    const m = await invite(p.id);
    await expect(db.update(s.projectMemberships).set({ state: "accepted" }).where(eq(s.projectMemberships.id, m.id))).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(db.update(s.projectMemberships).set({ state: "removed" }).where(eq(s.projectMemberships.id, m.id))).rejects.toMatchObject({ cause: { code: "23514" } });
    expect(await db.select().from(s.projectMemberships).where(and(eq(s.projectMemberships.id, m.id), eq(s.projectMemberships.state, "pending")))).toHaveLength(1);
  });
});
