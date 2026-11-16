import "./setup";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import { adminCreditLinks, adminEvents, adminProjectDetails, authUsers, projectMemberships, projects, studentAffiliations, studentProfiles, studioRoles } from "@/db/schema";
import { accessList, adminActivity, adminCommand, adminCreate, adminDetail, adminDuplicates, adminIdentity, adminList, changeAccess } from "@/admin/service";
import { emptyContent } from "@/admin/policy";
import { publicAdminShowcases } from "@/admin/public";
import { createContextualInquiry } from "@/db/queries/inquiry";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { queryTalentDirectory } from "@/db/queries/talent";
import { parseTalentQuery } from "@/validation/talent-query";
import { createAdminHandler } from "@/admin/http";
import { AuthenticationRequiredError } from "@/auth/server";
const content = { ...emptyContent, title: "Synthetic independent XR", summary: "A public narrative", description: "Complete project story", fallbackText: "Alternative project narrative", credits: [{ name: "Manual name", role: "Designer", statement: "Concept work", profileId: "" }] };
describe("administrator portal on disposable PostgreSQL 17", () => {
  let db: Database; let close: () => Promise<void>; let superId: string; let adminId: string; let curatorId: string; let studentId: string;
  beforeAll(async () => { const c = createDatabase(process.env.TEST_DATABASE_URL!, 5); db = c.db; close = () => c.client.end(); const [version] = await db.execute(sql`SHOW server_version_num`); expect(Number(version.server_version_num)).toBeGreaterThanOrEqual(170000); expect(Number(version.server_version_num)).toBeLessThan(180000); await migrate(db, { migrationsFolder: "drizzle" }); });
  afterAll(async () => close?.());
  beforeEach(async () => {
    [superId, adminId, curatorId, studentId] = Array.from({ length: 4 }, () => randomUUID());
    for (const id of [superId, adminId, curatorId, studentId]) await db.insert(authUsers).values({ id, name: "Synthetic staff", email: `${id}@example.test` });
    await db.insert(studioRoles).values([{ userId: superId, role: "platform_super_admin" }, { userId: adminId, role: "xr_admin" }, { userId: curatorId, role: "xr_curator" }]);
  });
  const create = () => adminCreate(db, adminId, content);
  const act = async (id: string, action: string, extra = {}, actor = adminId) => {
    const { project } = await adminDetail(db, actor, id); return adminCommand(db, actor, id, { action, version: project.version, ...extra });
  };
  test("manual create and direct publication create no student account/membership/approval", async () => {
    const created = await create(); const id = created.project.id;
    expect(created.project).toMatchObject({ origin: "admin", managementMode: "ADMIN_MANAGED", maintainerUserId: null, publicationStatus: "unpublished" });
    expect(await queryPublicProject(db, id)).toBeNull();
    const published = await act(id, "publish");
    expect(published.project.id).toBe(id); expect((await queryPublicProject(db, id))?.contributors[0]).toMatchObject({ name: "Manual name", profileUrl: "" });
    expect(await db.select().from(projectMemberships).where(eq(projectMemberships.projectId, id))).toHaveLength(0);
    expect((await publicAdminShowcases(db)).some(p => p.projectId === id)).toBe(true);
    expect((await adminDetail(db, adminId, id)).events.map(e => e.action).sort()).toEqual(["create", "publish"]);
  });
  test("project inquiries reference published canonical admin projects only", async () => {
    const { project } = await create();
    const input = { sourceType: "project" as const, sourceId: project.id, companyName: "Synthetic organization", contactName: "Synthetic contact", contactEmail: "contact@example.test", description: "Review this synthetic demonstration", website: "" };
    expect(await createContextualInquiry(db, input)).toBeNull();
    await act(project.id, "publish"); expect(await createContextualInquiry(db, input)).toMatchObject({ id: expect.any(String) });
    await act(project.id, "archive"); expect(await createContextualInquiry(db, input)).toBeNull();
  });
  test("student and curator cannot create, mutate or escalate access", async () => {
    const { project } = await create();
    for (const actor of [studentId, curatorId]) {
      await expect(adminCreate(db, actor, content)).rejects.toMatchObject({ status: 403 });
      await expect(adminCommand(db, actor, project.id, { action: "publish", version: 1 })).rejects.toMatchObject({ status: 403 });
      await expect(changeAccess(db, actor, { subject: actor, role: "platform_super_admin", expectedRole: actor === curatorId ? "xr_curator" : null, reason: "Forged" })).rejects.toMatchObject({ status: 403 });
    }
    await expect(adminDetail(db, studentId, project.id)).rejects.toMatchObject({ status: 403 });
    expect((await adminDetail(db, curatorId, project.id)).role).toBe("xr_curator");
    await expect(accessList(db, adminId)).rejects.toMatchObject({ status: 403 });
  });
  test("published edits, unpublish, archive and restore keep canonical identity and privacy", async () => {
    const { project } = await create(); const id = project.id;
    await act(id, "publish"); await act(id, "save", { content: { ...content, title: "Updated live title", demoMode: "external", liveUrl: "https://example.com/adapted" } });
    expect((await queryPublicProject(db, id))?.title).toBe("Updated live title");
    await act(id, "unpublish"); expect(await queryPublicProject(db, id)).toBeNull();
    await act(id, "archive"); expect((await publicAdminShowcases(db)).some(p => p.projectId === id)).toBe(false);
    await expect(act(id, "publish")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await act(id, "restore"); expect((await adminDetail(db, adminId, id)).detail.lifecycle).toBe("draft");
    expect(await queryPublicProject(db, id)).toBeNull(); await act(id, "publish"); expect((await queryPublicProject(db, id))?.id).toBe(id);
  });
  test("staff cannot seize student projects or alter immutable ownership/provenance", async () => {
    const id = randomUUID(); await db.insert(projects).values({ id, title: "Student", description: "Private", domain: "XR", origin: "student", maintainerUserId: studentId });
    await expect(adminCommand(db, superId, id, { action: "archive", version: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(adminDetail(db, adminId, id)).rejects.toMatchObject({ status: 404 });
    await expect(db.update(projects).set({ managementMode: "ADMIN_MANAGED", origin: "admin", maintainerUserId: null }).where(eq(projects.id, id))).rejects.toThrow();
    const created = await create();
    await expect(db.update(adminProjectDetails).set({ createdBy: superId }).where(eq(adminProjectDetails.projectId, created.project.id))).rejects.toThrow();
  });
  test("technical validation rejects unsafe demos and publication without fallback", async () => {
    await expect(adminCreate(db, adminId, { ...content, liveUrl: "javascript:alert(1)" })).rejects.toThrow();
    const handler = createAdminHandler({ authorize: async () => ({ id: adminId }), database: () => db });
    expect((await handler(request({ content: { ...content, startDate: "0000-01-01" } }), "create")).status).toBe(422);
    const { project } = await adminCreate(db, adminId, { ...content, fallbackText: "" });
    await expect(act(project.id, "publish")).rejects.toMatchObject({ code: "PUBLICATION_VALIDATION" });
    expect((await adminDetail(db, adminId, project.id)).events).toHaveLength(1);
  });
  test("duplicate repositories are detected under concurrent creation", async () => {
    const originalRepository = `https://github.com/synthetic/r${randomUUID()}`;
    const results = await Promise.allSettled([adminCreate(db, adminId, { ...content, originalRepository }), adminCreate(db, superId, { ...content, originalRepository })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "DUPLICATE_REPOSITORY" } });
  });
  test("stale concurrent edits commit one version and one audit event", async () => {
    const { project } = await create();
    const results = await Promise.allSettled([adminCommand(db, adminId, project.id, { action: "save", version: 1, content: { ...content, title: "First" } }), adminCommand(db, superId, project.id, { action: "save", version: 1, content: { ...content, title: "Second" } })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "EDIT_CONFLICT" } });
    const d = await adminDetail(db, adminId, project.id); expect(d.project.version).toBe(2); expect(d.events).toHaveLength(2);
  });
  test("revoked role is denied immediately on open-editor save and private reads", async () => {
    const { project } = await create();
    await changeAccess(db, superId, { subject: adminId, role: null, expectedRole: "xr_admin", reason: "Synthetic revocation" });
    await expect(adminCommand(db, adminId, project.id, { action: "publish", version: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(adminDetail(db, adminId, project.id)).rejects.toMatchObject({ status: 403 });
    await expect(adminList(db, adminId)).rejects.toMatchObject({ status: 403 });
    await expect(adminActivity(db, adminId)).rejects.toMatchObject({ status: 403 });
  });
  test("role changes are audited and stale assignments rejected", async () => {
    await changeAccess(db, superId, { subject: studentId, role: "xr_curator", expectedRole: null, reason: "Authorized synthetic operator" });
    expect((await adminIdentity(db, studentId)).role).toBe("xr_curator");
    await expect(changeAccess(db, superId, { subject: studentId, role: "xr_admin", expectedRole: null, reason: "Stale" })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    expect((await adminActivity(db, superId)).filter(e => e.actorUserId === superId && e.action === "role_assignment")).toHaveLength(1);
  });
  test("concurrent self-revocations preserve a last super administrator", async () => {
    // Other test-created super admins remain, so isolate this invariant in its own transaction with temporary roles removed via operational DML.
    await db.delete(studioRoles).where(and(eq(studioRoles.role, "platform_super_admin"), sql`${studioRoles.userId} <> ${superId}`));
    await changeAccess(db, superId, { subject: studentId, role: "platform_super_admin", expectedRole: null, reason: "Second synthetic super" });
    const revoke = (actor: string) => changeAccess(db, actor, { subject: actor, role: null, expectedRole: "platform_super_admin", reason: "Concurrent self revocation" });
    const results = await Promise.allSettled([revoke(superId), revoke(studentId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "LAST_SUPER_ADMIN" } });
    expect(await db.select().from(studioRoles).where(eq(studioRoles.role, "platform_super_admin"))).toHaveLength(1);
  });
  test("audit cannot be edited, deleted or truncated and browser roles have no effective grants", async () => {
    const { project } = await create();
    await expect(db.update(adminEvents).set({ note: "Forged" }).where(eq(adminEvents.projectId, project.id))).rejects.toThrow();
    await expect(db.delete(adminEvents).where(eq(adminEvents.projectId, project.id))).rejects.toThrow();
    await expect(db.execute(sql`TRUNCATE public.admin_events`)).rejects.toThrow();
    for (const table of ["admin_events", "admin_project_details", "admin_credit_links"]) {
      const [row] = await db.execute(sql`SELECT relrowsecurity FROM pg_class WHERE oid = ${`public.${table}`}::regclass`); expect(row.relrowsecurity).toBe(true);
      for (const role of ["anon", "authenticated"]) for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
        const [grant] = await db.execute(sql`SELECT has_table_privilege(${role}, ${`public.${table}`}, ${privilege}) AS allowed`); expect(grant.allowed).toBe(false);
      }
    }
  });
  test("linked profiles becoming private remove public links without blocking admin lifecycle", async () => {
    await db.insert(studentAffiliations).values({ userId: studentId, institutionalEmail: `${studentId}@algomau.ca`, status: "verified", verifiedAt: new Date() });
    const [profile] = await db.insert(studentProfiles).values({ ownerUserId: studentId, publicationStatus: "published", studentStatus: "current", headline: "Synthetic", biography: "Synthetic" }).returning();
    const credits = [{ ...content.credits[0], profileId: profile.id }]; const { project } = await adminCreate(db, adminId, { ...content, credits });
    await act(project.id, "publish"); expect((await queryPublicProject(db, project.id))?.contributors[0].profileUrl).toContain(profile.id);
    const profileProjection = await queryPublicStudentProfile(db, profile.id);
    expect(profileProjection?.projects).toEqual([]); expect(profileProjection?.skills).toEqual([]);
    const directory = await queryTalentDirectory(db, parseTalentQuery(new URLSearchParams(), new Set()));
    expect(directory.items.find(p => p.id === profile.id)).toMatchObject({ projectEvidenceCount: 0, skills: [] });
    await db.update(studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(studentProfiles.id, profile.id));
    expect((await queryPublicProject(db, project.id))?.contributors[0]).toMatchObject({ name: "Manual name", profileUrl: "" });
    expect(JSON.stringify(await queryPublicProject(db, project.id))).not.toContain(profile.id);
    await act(project.id, "save", { content: { ...content, credits, title: "Still administratively controlled" } });
    await act(project.id, "archive"); await act(project.id, "restore"); await act(project.id, "publish");
    expect(await db.select().from(adminCreditLinks).where(eq(adminCreditLinks.projectId, project.id))).toHaveLength(1);
  });
  test("case-insensitive profile IDs cannot turn optional credits into student publication gates", async () => {
    await db.insert(studentAffiliations).values({ userId: studentId, institutionalEmail: `${studentId}@algomau.ca`, status: "verified", verifiedAt: new Date() });
    const [profile] = await db.insert(studentProfiles).values({ ownerUserId: studentId, publicationStatus: "published", studentStatus: "current" }).returning();
    const credits = [{ ...content.credits[0], profileId: profile.id.toUpperCase() }];
    const { project } = await adminCreate(db, adminId, { ...content, credits });
    // Also cover an already-saved pre-repair presentation using an uppercase UUID.
    await db.update(adminProjectDetails).set({ content: { ...content, credits } }).where(eq(adminProjectDetails.projectId, project.id));
    await act(project.id, "publish");
    const publicLink = (await queryPublicProject(db, project.id))?.contributors[0].profileUrl;
    await db.update(studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(studentProfiles.id, profile.id));
    await act(project.id, "archive"); await act(project.id, "restore"); await act(project.id, "publish");
    const projection = await queryPublicProject(db, project.id);
    expect(publicLink).toBe(`/students/${profile.id}`);
    expect(projection?.contributors[0]).toMatchObject({ name: "Manual name", profileUrl: "" });
    expect(JSON.stringify(projection).toLowerCase()).not.toContain(profile.id);
  });
  const request = (body: unknown, origin = "https://platform.example") => new Request("https://platform.example/api/admin/projects", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  test("API derives actor from session, rejects forged actor/role and enforces origin", async () => {
    const handler = createAdminHandler({ authorize: async () => ({ id: adminId }), database: () => db, origin: "https://platform.example" });
    expect((await handler(request({ content, actor: superId }), "create")).status).toBe(422);
    expect((await handler(request({ content }, "https://evil.example"), "create")).status).toBe(403);
    const created = await handler(request({ content }), "create"); expect(created.status).toBe(201); const data = await created.json();
    expect(data.detail.createdBy).toBe(adminId); expect(created.headers.get("cache-control")).toContain("no-store");
    expect((await handler(request({ action: "publish", version: 1, role: "platform_super_admin" }), "command", data.project.id)).status).toBe(422);
    const anonymous = createAdminHandler({ authorize: async () => { throw new AuthenticationRequiredError(); }, database: () => db });
    expect((await anonymous(new Request("https://platform.example/api/admin/projects"), "list")).status).toBe(401);
  });
  test("lifecycle APIs reject replacement content atomically", async () => {
    const { project } = await create(); await act(project.id, "publish");
    const handler = createAdminHandler({ authorize: async () => ({ id: adminId }), database: () => db });
    for (const action of ["unpublish", "archive", "restore"]) {
      const before = await adminDetail(db, adminId, project.id);
      const response = await handler(request({ action, version: before.project.version, content: { ...content, title: "Unintended replacement" } }), "command", project.id);
      expect(response.status).toBe(422);
      const after = await adminDetail(db, adminId, project.id);
      expect(after).toEqual(before);
    }
  });
  test("public API, metadata, discovery and duplicate results track every lifecycle state", async () => {
    const { GET } = await import("@/app/api/v1/projects/[projectId]/route");
    const { generateMetadata } = await import("@/app/projects/[projectId]/page");
    const { project } = await create(); const id = project.id;
    const context = { params: Promise.resolve({ projectId: id }) };
    for (const action of [null, "publish", "unpublish", "publish", "archive", "restore", "publish"]) {
      if (action) await act(id, action);
      const visible = action === "publish";
      const response = await GET(new Request(`https://platform.example/api/v1/projects/${id}`), context);
      expect(response.status).toBe(visible ? 200 : 404);
      expect(response.headers.get("cache-control")).toContain("no-store");
      const metadata = await generateMetadata(context);
      expect(metadata.title).toBe(visible ? content.title : "Project not available");
      expect((await publicAdminShowcases(db)).some(p => p.projectId === id)).toBe(visible);
      const payload = JSON.stringify(await response.json());
      if (visible) {
        for (const secret of [adminId, "createdBy", "actorUserId", "snapshot", "profileId"]) expect(payload).not.toContain(secret);
      } else expect(payload).not.toContain(content.title);
    }
    const privateStudent = randomUUID();
    await db.insert(projects).values({ id: privateStudent, title: "Unpublished private student title", description: "Private narrative", domain: "XR", origin: "student", maintainerUserId: studentId });
    expect(await adminDuplicates(db, adminId, "", "Unpublished private student title")).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: privateStudent })]));
  });
  test("database guards reject memberships, orphan provenance and inconsistent publication", async () => {
    const { project } = await create();
    const [profile] = await db.insert(studentProfiles).values({ ownerUserId: studentId }).returning();
    const rejectedByGuard = (message: string) => ({ cause: { code: "P0001", message } });
    await expect(db.insert(projectMemberships).values({ projectId: project.id, profileId: profile.id, proposedRoleId: "software-developer", invitedByUserId: adminId })).rejects.toMatchObject(rejectedByGuard("Admin credits cannot create student memberships"));
    await expect(db.update(projects).set({ publicationStatus: "published" }).where(eq(projects.id, project.id))).rejects.toMatchObject(rejectedByGuard("Admin publication and lifecycle must agree"));
    await expect(db.insert(projects).values({ id: randomUUID(), title: "Orphan", description: "", domain: "XR", origin: "admin", managementMode: "ADMIN_MANAGED" })).rejects.toMatchObject(rejectedByGuard("Admin publication and lifecycle must agree"));
    await expect(db.insert(adminProjectDetails).values({ projectId: "missing", createdBy: adminId, content })).rejects.toMatchObject(rejectedByGuard("An independent admin project is required"));
  });
  test.each(["anon", "authenticated"])("%s cannot read private tables or call privileged functions", async role => {
    await create();
    for (const statement of [sql`SELECT * FROM public.admin_project_details`, sql`SELECT * FROM public.admin_events`, sql`SELECT * FROM public.admin_credit_links`, sql`SELECT public.assign_studio_role(${superId}, ${studentId}, 'xr_admin', 'forged')`]) {
      await expect(db.transaction(async tx => { await tx.execute(sql.raw(`SET LOCAL ROLE ${role}`)); await tx.execute(statement); })).rejects.toMatchObject({ cause: { code: "42501", message: expect.stringContaining("permission denied") } });
    }
    expect((await adminIdentity(db, adminId)).role).toBe("xr_admin");
  });
  test("import API returns editable suggestions and exact duplicate warnings", async () => {
    const originalRepository = `https://github.com/synthetic/intake-${randomUUID()}`;
    await adminCreate(db, adminId, { ...content, originalRepository });
    const fetcher = vi.fn().mockImplementation(async (url: string) => Response.json(url.endsWith("/languages") ? { JavaScript: 10 } : { private: false, name: "Intake", description: "Synthetic", html_url: originalRepository, language: "JavaScript" }));
    const handler = createAdminHandler({ authorize: async () => ({ id: adminId }), database: () => db, fetcher });
    const response = await handler(request({ repositoryUrl: originalRepository }), "import"); expect(response.status).toBe(200); const result = await response.json(); expect(result.duplicates[0]).toMatchObject({ exact: true, adminManaged: true });
  });
  test.each(["read", "write"] as const)("private %s waits for an in-flight role revocation and observes denial", async kind => {
    const { project } = await create(); const actor = kind === "write" ? adminId : curatorId; let release!: () => void; let ready!: () => void;
    const gate = new Promise<void>(r => { release = r; }); const locked = new Promise<void>(r => { ready = r; });
    const revoking = db.transaction(async tx => { await tx.execute(sql`LOCK TABLE public.studio_roles IN EXCLUSIVE MODE`); await tx.delete(studioRoles).where(eq(studioRoles.userId, actor)); ready(); await gate; });
    await Promise.race([locked, revoking]); let settled = false;
    const reading = (kind === "read" ? adminDetail(db, actor, project.id) : adminCommand(db, actor, project.id, { action: "publish", version: 1 })).then(value => ({ value }), error => ({ error })).finally(() => { settled = true; });
    try {
      const deadline = Date.now() + 5000; let waiting = false;
      while (!settled && Date.now() < deadline) { const [row] = await db.execute(sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query ILIKE '%studio_roles%') AS waiting`); if (row.waiting) { waiting = true; break; } await new Promise(r => setTimeout(r, 20)); }
      expect(waiting).toBe(true);
    } finally { release(); await revoking; await reading; }
    expect(await reading).toMatchObject({ error: { status: 403 } });
  });
  test.each(["read", "write"] as const)("private %s keeps authorization locked until its history operation finishes", async kind => {
    const { project } = await create(); let release!: () => void; let ready!: () => void;
    const gate = new Promise<void>(r => { release = r; }); const locked = new Promise<void>(r => { ready = r; });
    const blocker = db.transaction(async tx => { await tx.execute(sql`LOCK TABLE public.admin_events IN ACCESS EXCLUSIVE MODE`); ready(); await gate; });
    await Promise.race([locked, blocker]);
    const actor = kind === "read" ? curatorId : adminId;
    const reading = (kind === "read" ? adminDetail(db, actor, project.id) : adminCommand(db, actor, project.id, { action: "publish", version: 1 })).then(value => ({ value }), error => ({ error }));
    let revoking: Promise<unknown> | undefined;
    async function waitFor(pattern: string) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const [row] = await db.execute(sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query ILIKE ${pattern}) AS waiting`);
        if (row.waiting) return true; await new Promise(r => setTimeout(r, 20));
      }
      return false;
    }
    try {
      expect(await waitFor(kind === "read" ? '%from "admin_events"%' : '%insert into "admin_events"%')).toBe(true);
      revoking = changeAccess(db, superId, { subject: actor, expectedRole: kind === "read" ? "xr_curator" : "xr_admin", role: null, reason: "Synthetic concurrent revoke" });
      expect(await waitFor('%LOCK TABLE public.studio_roles%')).toBe(true);
    } finally { release(); await Promise.allSettled([blocker, reading, ...(revoking ? [revoking] : [])]); }
    expect(await reading).not.toHaveProperty("error");
    await expect(adminDetail(db, actor, project.id)).rejects.toMatchObject({ status: 403 });
  });

});
