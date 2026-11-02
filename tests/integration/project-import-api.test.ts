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
import { createProjectHandlers } from "@/projects/http";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { createImportHandlers } from "@/projects/import-http";
const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const draft = { title: "XR Anatomy Lab", description: "One canonical shared record", domain: "Health", technologies: ["Unity"], repositories: [{ url: "https://github.com/example-org/xr-anatomy" }] };
suite("GitHub duplicate and join API", () => {
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
      await db.delete(s.projectJoinRequests).where(inArray(s.projectJoinRequests.projectId, ids));
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
  const ctx = (i = 0) => ({ db, actorUserId: users[i] });
  const requests = () => createImportHandlers({ database: () => db, applicationOrigin: "http://localhost", githubFetch: vi.fn().mockResolvedValueOnce(Response.json({ private: false, name: "xr-anatomy", description: "Public metadata", html_url: draft.repositories[0].url, language: "C#" })).mockResolvedValueOnce(Response.json({ "C#": 100 })), authorize: async req => { const id = req.headers.get("x-test-user"); if (!id) throw new AuthenticationRequiredError(); return { user: { id } }; } });
  function request(body?: unknown, i = 0) { return new Request("http://localhost", { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Origin: "http://localhost", ...(i >= 0 ? { "x-test-user": users[i] } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  async function create(data = draft, actor = 0, duplicateAcknowledgement?: string) { const p = await service.createProject({ ...ctx(actor), draft: data, creatorRoleId: "xr-developer", duplicateAcknowledgement }); ids.push(p.id); return p; }
  async function published() { const p = await create(); return service.setProjectPublication({ ...ctx(), projectId: p.id, version: 1, published: true }); }
  async function check(data = draft, actor = 1) { const response = await requests()(request({ draft: data }, actor), "duplicates"); expect(response.status).toBe(200); return response.json(); }
  test("all official duplicate fixtures produce distinct expected outcomes", async () => {
    const p = await published(); const cases = JSON.parse(readFileSync("Release 3 Fixtures-20261030/project_duplicate_cases.json", "utf8"));
    const exact = await check({ ...draft, title: cases[0].title, repositories: [{ url: cases[0].repository }] }); expect(exact.hasExactMatch).toBe(true); expect(exact.matches).toMatchObject([{ id: p.id, kind: "repository", canRequestJoin: true }]);
    const similarDraft = { ...draft, title: cases[1].title, repositories: [{ url: cases[1].repository }] }; const similar = await check(similarDraft); expect(similar.hasExactMatch).toBe(false); expect(similar.matches).toMatchObject([{ id: p.id, kind: "similar_title" }]);
    const art = { ...draft, title: cases[2].title, domain: cases[2].domain, repositories: [{ url: cases[2].repository }] }; expect((await check(art)).matches).toEqual([]);
    const distinct = await create(art,1); expect(distinct.id).not.toBe(p.id);
    expect((await create(similarDraft,1)).id).not.toBe(p.id);
  });
  test("normalized multiple repository matches require account-bound acknowledgement and retain stable IDs", async () => {
    const p = await published(); const candidate = { ...draft, repositories: [{ url: "https://github.com/other-org/another" }, { url: "https://GitHub.com/EXAMPLE-ORG/XR-ANATOMY.git/?tab=readme#top" }] };
    const warning = await check(candidate); expect(warning.matches[0].id).toBe(p.id);
    const denied = await handlers.create(request({ draft: candidate, creatorRoleId: "xr-developer" },1)); expect(denied.status).toBe(409); expect((await denied.json()).error.code).toBe("DUPLICATE_WARNING");
    await expect(create(candidate,2,warning.acknowledgement)).rejects.toMatchObject({ code: "DUPLICATE_WARNING" });
    const allowed = await create(candidate,1,warning.acknowledgement); expect(allowed.id).not.toBe(p.id);
    await service.updateProject({ ...ctx(1), projectId: allowed.id, version: 1, draft: { ...candidate, repositories: [] } }); expect((await service.getProjectEditorData({ ...ctx(1), projectId: allowed.id })).project.id).toBe(allowed.id);
  });
  test("concurrent same-repository creates serialize and only one proceeds without fresh confirmation", async () => {
    const results = await Promise.allSettled([create(draft,0),create(draft,1)]); expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "DUPLICATE_WARNING", status: 409 } });
    expect(await db.select().from(s.projectRepositories).where(eq(s.projectRepositories.normalizedKey,draft.repositories[0].url))).toHaveLength(1);
  });
  test("changed candidate sets invalidate previous acknowledgement without revealing private projects", async () => {
    const hidden = await create(); const warning = await check(); const encoded = JSON.stringify(warning);
    expect(warning.hasExactMatch).toBe(true); expect(warning.matches).toEqual([]); expect(encoded).not.toContain(hidden.id); expect(encoded).not.toContain(draft.title); expect(encoded).not.toContain(users[0]); expect(encoded).not.toContain(profiles[0]);
    await service.setProjectPublication({ ...ctx(), projectId: hidden.id, version: 1, published: true });
    await expect(create(draft,1,warning.acknowledgement)).rejects.toMatchObject({ code: "DUPLICATE_WARNING" });
  });
  test("public join requests need maintainer approval and then independent invitation acceptance", async () => {
    const p = await published(); const api = requests();
    expect((await api(request({},1),"join",p.id)).status).toBe(200);
    expect((await api(request({},1),"join",p.id)).status).toBe(409);
    expect((await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.profileId,profiles[1])))).toEqual([]);
    const team = await service.getProjectTeam({ ...ctx(), projectId:p.id }); const r = team.joinRequests[0];
    expect((await api(request({version:r.version,projectVersion:team.project.version,approve:true,roleId:"software-developer"},2),"respond",r.id)).status).toBe(403);
    expect((await api(request({version:r.version,projectVersion:team.project.version,approve:true,roleId:"software-developer"}),"respond",r.id)).status).toBe(200);
    const [m] = await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.profileId,profiles[1])); expect(m.state).toBe("pending");
    expect((await queryPublicProject(db,p.id))?.contributors).toHaveLength(1);
    await service.respondToInvitation({ ...ctx(1), membershipId:m.id, version:1, accept:true });
    expect((await queryPublicProject(db,p.id))?.contributors).toHaveLength(2);
    expect((await queryPublicStudentProfile(db,profiles[1]))?.projects).toMatchObject([{id:p.id}]);
    expect((await api(request(undefined,1),"requests")).headers.get("cache-control")).toBe("private, no-store");
  });
  test("join decline/stale/invalid role/replay and unpublished/legacy/unverified targets fail closed", async () => {
    const p = await published(); const api = requests(); await api(request({},1),"join",p.id);
    const t = await service.getProjectTeam({ ...ctx(), projectId:p.id }); const r = t.joinRequests[0];
    expect((await api(request({version:1,projectVersion:999,approve:true,roleId:"xr-developer"}),"respond",r.id)).status).toBe(409);
    expect((await api(request({version:1,projectVersion:t.project.version,approve:true,roleId:"invalid"}),"respond",r.id)).status).toBe(422);
    expect((await api(request({version:1,projectVersion:t.project.version,approve:false}),"respond",r.id)).status).toBe(200);
    expect((await api(request({version:1,projectVersion:t.project.version,approve:false}),"respond",r.id)).status).toBe(409);
    await service.setProjectPublication({ ...ctx(),projectId:p.id,version:t.project.version+1,published:false });
    expect((await api(request({},2),"join",p.id)).status).toBe(404);
    expect((await api(request({},2),"join","P01")).status).toBe(404);
    expect((await api(request({},3),"join",p.id)).status).toBe(403);
    expect((await api(request({},-1),"join",p.id)).status).toBe(401);
  });
  test("deterministic GitHub HTTP import stays suggestion-only with strict auth/body/origin checks", async () => {
    const api = requests(); const response = await api(request({url:draft.repositories[0].url}),"import"); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ title:"xr-anatomy",technologies:["C#"] });
    expect(await db.select().from(s.projects).where(eq(s.projects.title,"xr-anatomy"))).toEqual([]);
    expect((await api(request({url:draft.repositories[0].url},3),"import")).status).toBe(403);
    expect((await api(request({url:draft.repositories[0].url,actorUserId:users[1]}),"import")).status).toBe(422);
    const evil = new Request("http://localhost",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://evil.example","x-test-user":users[0]},body:JSON.stringify({url:draft.repositories[0].url})});
    expect((await api(evil,"import")).status).toBe(403);
  });
  test("legacy fixture repository assets warn without granting legacy ownership or join access", async () => {
    const warning = await check({ ...draft, repositories:[{url:"https://github.com/EXAMPLE-ORG/P02.git"}] });
    expect(warning.hasExactMatch).toBe(true); expect(warning.matches).toContainEqual(expect.objectContaining({id:"P02",kind:"repository",canRequestJoin:false}));
    expect((await requests()(request({},1),"join","P02")).status).toBe(404);
  });
  test("new request table denies client roles and validates state and revision", async () => {
    expect((await db.execute(sql`select relrowsecurity from pg_class where oid='public.project_join_requests'::regclass`))[0].relrowsecurity).toBe(true);
    for(const role of ["anon","authenticated"]) expect((await db.execute(sql`select has_table_privilege(${role},'public.project_join_requests','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed`))[0].allowed).toBe(false);
    expect(await db.execute(sql`select * from pg_policies where tablename='project_join_requests'`)).toHaveLength(0);
    const p = await published(); await expect(db.insert(s.projectJoinRequests).values({projectId:p.id,profileId:profiles[1],state:"approved"})).rejects.toMatchObject({cause:{code:"23514"}});
  });
});
