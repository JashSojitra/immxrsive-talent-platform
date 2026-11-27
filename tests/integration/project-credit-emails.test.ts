import "./setup";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase } from "@/db/client";
import * as s from "@/db/schema";
import { adminCommand, adminCreate, adminDetail, adminProfileLookup } from "@/admin/service";
import { creditSessionHooks, syncSignedInCredits } from "@/admin/credit-links";
import { emptyContent } from "@/admin/policy";
import { publicAdminShowcases, queryCuratedCredits } from "@/admin/public";
import { queryPublicProject } from "@/db/queries/project-detail";
import { listPublicProjects } from "@/projects/public-directory";
import { confirmAffiliationVerification } from "@/verification/service";
import { createVerificationToken, hashVerificationToken } from "@/verification/security";
const c = createDatabase(process.env.TEST_DATABASE_URL!, 5); const db = c.db; const staff = randomUUID();
const config = { approvedDomains: new Set(["algomau.ca"]), ttlMinutes: 30, applicationBaseUrl: "https://platform.example", rateLimitSecret: "disposable-integration-secret-over-thirty-two-characters" };
const narrative = { ...emptyContent, title: "Test-only credit project", summary: "Test summary", description: "Test narrative", fallbackText: "Test fallback" };
beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); await db.insert(s.authUsers).values({ id: staff, name: "Fixture staff", email: `${staff}@example.test` }); await db.insert(s.studioRoles).values({ userId: staff, role: "xr_admin" }); });
afterAll(async () => { await c.client.end(); });
async function verify(userId: string, email: string) {
  const token = createVerificationToken();
  await db.insert(s.affiliationVerificationChallenges).values({ userId, institutionalEmail: email, tokenHash: hashVerificationToken(token), expiresAt: new Date(Date.now() + 600000) });
  await confirmAffiliationVerification({ db, userId, token, config, clientAddress: "127.0.0.1" });
}
test("future email credits keep public names, persist on verification, and follow profile visibility", async () => {
  const email = `future-${randomUUID()}@algomau.ca`;
  const credits = [{ name: "Named future student", role: "Designer", statement: "Interface work", profileId: "", institutionalEmail: email.toUpperCase() }];
  const created = await adminCreate(db, staff, { ...narrative, credits }); const id = created.project.id;
  await adminCommand(db, staff, id, { action: "publish", version: 1 });
  expect((await publicAdminShowcases(db)).some(p => p.projectId === id)).toBe(true);
  expect((await queryPublicProject(db, id))?.contributors[0]).toMatchObject({ name: "Named future student", role: "Designer", profileUrl: "" });
  expect((await adminDetail(db, staff, id)).creditStatuses).toEqual(["Waiting for this student to join"]);
  const curator = randomUUID(); await db.insert(s.authUsers).values({ id: curator, name: "Fixture curator", email: `${curator}@example.test` }); await db.insert(s.studioRoles).values({ userId: curator, role: "xr_curator" });
  expect(JSON.stringify(await adminDetail(db, curator, id)).toLowerCase()).not.toContain(email);
  expect((await db.select().from(s.adminCreditEmails).where(eq(s.adminCreditEmails.projectId, id)))[0].institutionalEmail).toBe(email);
  const user = randomUUID(); await db.insert(s.authUsers).values({ id: user, name: "Verified fixture student", email: `${user}@example.test` });
  const other = randomUUID(); await db.insert(s.authUsers).values({ id: other, name: "Other fixture", email: `${other}@example.test` }); await verify(other, `other-${randomUUID()}@algomau.ca`);
  expect(await db.select().from(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, id))).toHaveLength(0);
  await verify(user, email);
  const [profile] = await db.select().from(s.studentProfiles).where(eq(s.studentProfiles.ownerUserId, user));
  expect(profile.publicationStatus).toBe("unpublished");
  expect(await db.select().from(s.adminCreditLinks).where(and(eq(s.adminCreditLinks.projectId, id), eq(s.adminCreditLinks.profileId, profile.id)))).toHaveLength(1);
  expect((await queryCuratedCredits(db, profile.id, true)).map(p => p.projectId)).toContain(id);
  expect(await queryCuratedCredits(db, profile.id)).toEqual([]);
  expect((await adminDetail(db, staff, id)).creditStatuses).toEqual(["Profile not public yet"]);
  expect((await queryPublicProject(db, id))?.contributors[0].profileUrl).toBe("");
  await db.update(s.studentProfiles).set({ publicationStatus: "published" }).where(eq(s.studentProfiles.id, profile.id));
  expect((await queryPublicProject(db, id))?.contributors[0].profileUrl).toBe(`/students/${profile.id}`);
  expect((await adminDetail(db, staff, id)).creditStatuses).toEqual(["Linked to Verified fixture student"]);
  expect((await queryCuratedCredits(db, profile.id))[0].roles).toEqual(["Designer"]);
  await db.delete(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, id));
  expect((await queryPublicProject(db, id))?.contributors[0].profileUrl).toBe(`/students/${profile.id}`);
  expect((await queryCuratedCredits(db, profile.id))[0].projectId).toBe(id);
  await syncSignedInCredits(db, user);
  for (const result of [await queryPublicProject(db, id), await listPublicProjects(db), await publicAdminShowcases(db), await queryCuratedCredits(db, profile.id)]) expect(JSON.stringify(result).toLowerCase()).not.toContain(email);
  const [stored] = await db.select().from(s.adminProjectDetails).where(eq(s.adminProjectDetails.projectId, id));
  expect(JSON.stringify(stored)).not.toContain(email); expect(JSON.stringify((await adminDetail(db, staff, id)).events)).not.toContain(email);
  const changed = { ...narrative, credits: [{ ...credits[0], institutionalEmail: `replacement-${randomUUID()}@algomau.ca` }] };
  await adminCommand(db, staff, id, { action: "save", version: 2, content: changed });
  await syncSignedInCredits(db, user); expect(await db.select().from(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, id))).toHaveLength(0);
  await adminCommand(db, staff, id, { action: "save", version: 3, content: { ...narrative, credits } });
  expect(await db.select().from(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, id))).toHaveLength(1);
  await adminCommand(db, staff, id, { action: "save", version: 4, content: { ...narrative, credits: [{ ...credits[0], institutionalEmail: "" }] } });
  expect(await db.select().from(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, id))).toHaveLength(0);
  expect(await db.select().from(s.adminCreditEmails).where(eq(s.adminCreditEmails.projectId, id))).toHaveLength(0);
  expect((await queryPublicProject(db, id))?.contributors[0].name).toBe("Named future student");
});
test("later sign-in stores missing links idempotently through the real session hook", async () => {
  const origin = "http://localhost:3100"; const email = `${randomUUID()}@example.test`; const password = "disposable-password-long-enough";
  const auth = betterAuth({ baseURL: origin, secret: config.rateLimitSecret, database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, databaseHooks: creditSessionHooks(() => db) });
  const signup = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Late joining fixture", email, password }) }));
  expect(signup.status).toBe(200); const { user } = await signup.json(); const institutionalEmail = `later-${randomUUID()}@algomau.ca`; await verify(user.id, institutionalEmail);
  const created = await adminCreate(db, staff, { ...narrative, credits: [{ name: "Later student", role: "Developer", statement: "", profileId: "", institutionalEmail }] });
  // Model a credit added outside this session's lifecycle; the next sign-in repairs the stored link.
  await db.delete(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, created.project.id));
  for (let i = 0; i < 2; i++) {
    const login = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }));
    expect(login.status).toBe(200); expect(await db.select().from(s.adminCreditLinks).where(eq(s.adminCreditLinks.projectId, created.project.id))).toHaveLength(1);
  }
});
test("mixed team credits link independently and staff can assign private unverified profiles", async () => {
  const user = randomUUID(); await db.insert(s.authUsers).values({ id: user, name: "Private profile fixture", email: `${user}@example.test` });
  const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: user }).returning();
  expect(await adminProfileLookup(db, staff, "Private profile fixture")).toEqual([{ id: profile.id, name: "Private profile fixture", headline: "", program: "" }]);
  const created = await adminCreate(db, staff, { ...narrative, credits: [{ name: "Private team member", role: "Artist", statement: "", profileId: profile.id }, { name: "Future team member", role: "Researcher", statement: "", profileId: "", institutionalEmail: `unjoined-${randomUUID()}@algomau.ca` }] });
  await adminCommand(db, staff, created.project.id, { action: "publish", version: 1 });
  expect((await queryPublicProject(db, created.project.id))?.contributors.map(c => c.profileUrl)).toEqual(["", ""]);
  await verify(user, `private-${randomUUID()}@algomau.ca`); await db.update(s.studentProfiles).set({ publicationStatus: "published" }).where(eq(s.studentProfiles.id, profile.id));
  expect((await queryPublicProject(db, created.project.id))?.contributors.map(c => c.profileUrl)).toEqual([`/students/${profile.id}`, ""]);
  await expect(adminCreate(db, staff, { ...narrative, credits: [{ name: "Invalid domain", role: "Artist", statement: "", profileId: "", institutionalEmail: "test@example.com" }] })).rejects.toMatchObject({ code: "INVALID_CREDIT_EMAIL" });
  await expect(adminCreate(db, staff, { ...narrative, credits: [{ name: "", role: "Artist", statement: "", profileId: "", institutionalEmail: "test@algomau.ca" }] })).rejects.toThrow();
});
test("new private tables have RLS and no browser privileges", async () => {
  for (const table of ["admin_credit_emails", "project_screenshots"]) {
    const [r] = await db.execute(sql`select relrowsecurity from pg_class where oid=${`public.${table}`}::regclass`); expect(r.relrowsecurity).toBe(true);
    for (const role of ["anon", "authenticated"]) { const [r] = await db.execute(sql`select has_table_privilege(${role},${`public.${table}`},'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed`); expect(r.allowed).toBe(false); }
  }
});
