import "./setup";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import { authUsers, projects, studioEvents, studioRoles, studioSubmissions } from "@/db/schema";
import { publicShowcases, studioCommand, studioDetail, studioList } from "@/studio/service";
const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const content = { title: "XR showcase", summary: "Owner-authored showcase", mediaUrl: "", demoUrl: "" };
suite("XR Studio disposable database boundaries", () => {
  let db: Database; let close: () => Promise<void>; let owner: string; let other: string; let curator: string; let admin: string; let id: string;
  beforeAll(async () => { const c = createDatabase(target!, 5); db = c.db; close = () => c.client.end(); await migrate(db, { migrationsFolder: "drizzle" }); });
  beforeEach(async () => {
    [owner, other, curator, admin, id] = Array.from({ length: 5 }, () => randomUUID());
    for (const user of [owner, other, curator, admin]) await db.insert(authUsers).values({ id: user, name: "Synthetic XR test", email: `${user}@example.test` });
    await db.insert(studioRoles).values([{ userId: curator, role: "xr_curator" }, { userId: admin, role: "xr_admin" }]);
    await db.insert(projects).values({ id, title: "Canonical", description: "Unchanged", domain: "XR", origin: "student", maintainerUserId: owner, publicationStatus: "published" });
  });
  // Append-only evidence is intentionally retained in the verified disposable target.
  afterAll(async () => close?.());
  const act = async (actor: string, action: string, extra = {}) => {
    const [s] = await db.select().from(studioSubmissions).where(eq(studioSubmissions.projectId, id));
    return studioCommand(db, actor, id, { action, version: s?.version ?? 1, note: "Synthetic review reason", ...extra });
  };
  const submit = () => act(owner, "submit", { content });
  async function approved() { await submit(); await act(curator, "review"); await act(curator, "approve"); }
  test("default users have no staff access; staff cannot read unsubmitted drafts", async () => {
    await expect(studioList(db, other, true)).rejects.toMatchObject({ status: 403 });
    await expect(studioDetail(db, admin, id)).rejects.toMatchObject({ status: 404 });
    await expect(act(other, "submit", { content })).rejects.toMatchObject({ status: 404 });
  });
  test("submission remains private to owner and assigned staff", async () => {
    await submit(); await expect(studioDetail(db, other, id)).rejects.toMatchObject({ status: 404 });
    expect((await studioDetail(db, curator, id)).submission?.state).toBe("submitted");
    expect((await publicShowcases(db)).some(r => r.projectId === id)).toBe(false);
  });
  test("curator and owner cannot publish; admin can publish approved owner content", async () => {
    await approved(); await expect(act(curator, "publish")).rejects.toMatchObject({ status: 403 });
    await expect(act(owner, "publish")).rejects.toMatchObject({ status: 403 });
    await act(admin, "publish"); expect((await publicShowcases(db)).some(r => r.projectId === id)).toBe(true);
  });
  test("suggestions invalidate both approvals and staff cannot forge owner consent", async () => {
    await approved(); await act(curator, "suggest", { content: { ...content, title: "Staff suggestion" } });
    await expect(act(admin, "accept")).rejects.toMatchObject({ status: 403 });
    await act(curator, "approve"); await expect(act(admin, "publish")).rejects.toMatchObject({ code: "OWNER_APPROVAL_REQUIRED" });
    await act(owner, "accept"); await act(admin, "publish");
    expect((await db.select().from(projects).where(eq(projects.id, id)))[0]).toMatchObject({ title: "Canonical", version: 1 });
  });
  test("withdrawal hides published content and disallows review until owner resubmits", async () => {
    await approved(); await act(admin, "publish"); await act(owner, "withdraw");
    expect((await publicShowcases(db)).some(r => r.projectId === id)).toBe(false);
    await expect(act(admin, "publish")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await act(owner, "resubmit", { content }); expect((await studioDetail(db, owner, id)).submission?.state).toBe("submitted");
  });
  test("stale revisions and invalid transitions roll back without audit writes", async () => {
    await submit(); await act(curator, "review");
    const before = (await studioDetail(db, owner, id)).history.length;
    await expect(studioCommand(db, curator, id, { action: "approve", version: 1 })).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    expect((await studioDetail(db, owner, id)).history).toHaveLength(before);
  });
  test("project edits and maintenance transfers hide stale approval", async () => {
    await approved(); await act(admin, "publish");
    await db.update(projects).set({ version: 2, maintainerUserId: other }).where(eq(projects.id, id));
    expect((await publicShowcases(db)).some(r => r.projectId === id)).toBe(false);
    await expect(act(owner, "accept")).rejects.toMatchObject({ status: 404 });
    await act(other, "accept"); await act(admin, "publish");
  });
  test("moderation requires reason and preserves owner-visible history and records", async () => {
    await approved(); await act(admin, "publish");
    await expect(act(admin, "moderate", { note: "" })).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    await act(admin, "moderate"); const d = await studioDetail(db, owner, id);
    expect(d.submission?.published).toBe(false); expect(d.history[0]).toMatchObject({ action: "moderate", actorUserId: admin });
    await expect(db.update(studioEvents).set({ note: "tampered" }).where(eq(studioEvents.projectId, id))).rejects.toThrow();
  });
  test("changes requested and rejection can be answered only by owner resubmission", async () => {
    await submit(); await act(curator, "review"); await act(curator, "request_changes");
    await expect(act(curator, "resubmit", { content })).rejects.toMatchObject({ status: 403 });
    await act(owner, "resubmit", { content }); await act(curator, "review"); await act(curator, "reject"); await act(owner, "resubmit", { content });
  });
  test("RLS and privilege revocations cover every new table", async () => {
    const rows = await db.execute(sql`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('studio_roles','studio_submissions','studio_events')`);
    expect(rows).toHaveLength(3); for (const row of rows) expect(row.relrowsecurity).toBe(true);
    const [r] = await db.execute(sql`SELECT has_table_privilege('anon','public.studio_roles','SELECT') AS allowed`); expect(r.allowed).toBe(false);
  });
  test("concurrent edits commit exactly one revision and one audit event", async () => {
    await submit();
    const before = (await studioDetail(db, owner, id)).history.length;
    const commands = await Promise.allSettled([
      studioCommand(db, curator, id, { action: "review", version: 1 }),
      studioCommand(db, admin, id, { action: "review", version: 1 }),
    ]);
    expect(commands.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const rejected = commands.find(r => r.status === "rejected");
    expect(rejected).toMatchObject({ status: "rejected", reason: { code: "EDIT_CONFLICT" } });
    expect((await studioDetail(db, owner, id)).history).toHaveLength(before + 1);
  });
  test("revoked staff cannot read or mutate a submitted project", async () => {
    await submit();
    await db.delete(studioRoles).where(eq(studioRoles.userId, curator));
    await expect(studioDetail(db, curator, id)).rejects.toMatchObject({ status: 404 });
    await expect(act(curator, "review")).rejects.toMatchObject({ status: 404 });
    await expect(studioList(db, curator, true)).rejects.toMatchObject({ status: 403 });
  });
  // Hold a real uncommitted authorization change, then verify the read waits
  // on PostgreSQL's lock before observing the committed loss of access.
  async function assertReadWaitsForAuthorizationChange(change: (tx: Parameters<Parameters<Database["transaction"]>[0]>[0]) => Promise<unknown>, read: () => Promise<unknown>, status: number) {
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { locked = resolve; });
    const changing = db.transaction(async tx => {
      await change(tx);
      locked();
      await gate;
    });
    // Avoid an unhandled rejection if setup fails before signaling readiness.
    await Promise.race([ready, changing]);
    let settled = false;
    const reading = read().then(value => ({ value }), error => ({ error })).finally(() => { settled = true; });
    try {
      let waiting = false;
      const deadline = Date.now() + 5000;
      while (!settled && Date.now() < deadline) {
        const [row] = await db.execute(sql`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query ILIKE '%for share%'
        ) AS waiting`);
        if (row.waiting) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
    } finally {
      release();
      await changing;
      // Always collect the reader before database teardown, even on failure.
      await reading;
    }
    expect(await reading).toMatchObject({ error: { status } });
  }
  test("detail reads serialize with an in-flight ownership transfer", async () => {
    await submit();
    await assertReadWaitsForAuthorizationChange(
      tx => tx.update(projects).set({ maintainerUserId: other, version: 2 }).where(eq(projects.id, id)),
      () => studioDetail(db, owner, id), 404,
    );
  });
  test.each(["detail", "queue"])("%s reads serialize with an in-flight staff revocation", async kind => {
    await submit();
    await assertReadWaitsForAuthorizationChange(
      tx => tx.delete(studioRoles).where(eq(studioRoles.userId, curator)),
      () => kind === "detail" ? studioDetail(db, curator, id) : studioList(db, curator, true),
      kind === "detail" ? 404 : 403,
    );
  });
  // Reverse the audit's writer-first races: pause the protected data query,
  // then prove the authorization-changing writer waits until that read ends.
  async function assertAuthorizationHeldThroughRead(kind: "owner" | "detail" | "queue") {
    await submit();
    let release!: () => void;
    let locked!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { locked = resolve; });
    const table = kind === "queue" ? "studio_submissions" : "studio_events";
    const blocking = db.transaction(async tx => {
      await tx.execute(sql`LOCK TABLE ${sql.identifier(table)} IN ACCESS EXCLUSIVE MODE`);
      locked();
      await gate;
    });
    await Promise.race([ready, blocking]);
    const actor = kind === "owner" ? owner : curator;
    const reading = (kind === "queue" ? studioList(db, actor, true) : studioDetail(db, actor, id))
      .then(value => ({ value }), error => ({ error }));
    let changing: Promise<{ value: unknown } | { error: unknown }> | undefined;
    async function waitForQuery(pattern: string) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const [row] = await db.execute(sql`SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
          AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'
          AND query ILIKE ${pattern}
        ) AS waiting`);
        if (row.waiting) return true;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      return false;
    }
    try {
      // History/queue retrieval has started, after the authorization reads.
      expect(await waitForQuery(`%from "${table}"%`)).toBe(true);
      const change = kind === "owner"
        ? db.update(projects).set({ maintainerUserId: other, version: 2 }).where(eq(projects.id, id))
        : db.delete(studioRoles).where(eq(studioRoles.userId, curator));
      changing = Promise.resolve(change).then(value => ({ value }), error => ({ error }));
      expect(await waitForQuery(kind === "owner" ? '%update "projects"%' : '%delete from "studio_roles"%')).toBe(true);
    } finally {
      release();
      await Promise.allSettled([blocking, reading, ...(changing ? [changing] : [])]);
    }
    expect(await reading).not.toHaveProperty("error");
    expect(await changing).not.toHaveProperty("error");
    await expect(kind === "queue" ? studioList(db, actor, true) : studioDetail(db, actor, id))
      .rejects.toMatchObject({ status: kind === "queue" ? 403 : 404 });
  }
  test.each(["owner", "detail", "queue"] as const)("%s authorization stays locked through private data retrieval", async kind => {
    await assertAuthorizationHeldThroughRead(kind);
  });
  test("audit deletion and truncation are blocked even on a disposable database", async () => {
    await submit();
    await expect(db.delete(studioEvents).where(eq(studioEvents.projectId, id))).rejects.toThrow();
    await expect(db.execute(sql`TRUNCATE public.studio_events`)).rejects.toThrow();
    expect((await studioDetail(db, owner, id)).history).toHaveLength(1);
  });
  test("role assignment requires super admin, logs changes and preserves the last super admin", async () => {
    await db.update(studioRoles).set({ role: "platform_super_admin" }).where(eq(studioRoles.userId, admin));
    await expect(db.execute(sql`SELECT public.assign_studio_role(${curator}, ${other}, 'xr_admin', 'Unauthorized')`)).rejects.toThrow();
    await db.execute(sql`SELECT public.assign_studio_role(${admin}, ${other}, 'xr_curator', 'Synthetic grant')`);
    expect((await studioList(db, other, true))).toBeDefined();
    await db.execute(sql`SELECT public.assign_studio_role(${admin}, ${other}, NULL, 'Synthetic revocation')`);
    await expect(studioList(db, other, true)).rejects.toMatchObject({ status: 403 });
    await expect(db.execute(sql`SELECT public.assign_studio_role(${admin}, ${admin}, NULL, 'Last admin')`)).rejects.toThrow();
    const events = await db.select().from(studioEvents).where(eq(studioEvents.actorUserId, admin));
    expect(events.filter(e => e.action === "role_assignment")).toHaveLength(2);
  });
  test("browser roles have no table or operational function privileges", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const table of ["studio_roles", "studio_submissions", "studio_events"]) {
        for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
          const [row] = await db.execute(sql`SELECT has_table_privilege(${role}, ${`public.${table}`}, ${privilege}) AS allowed`);
          expect(row.allowed).toBe(false);
        }
      }
      const [row] = await db.execute(sql`SELECT has_function_privilege(${role}, 'public.assign_studio_role(text,text,text,text)', 'EXECUTE') AS allowed`);
      expect(row.allowed).toBe(false);
    }
  });

});
