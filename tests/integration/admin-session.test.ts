import "./setup";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
// Replace configuration only. Session validation and the admin HTTP/service
// boundaries remain real, backed by this file's isolated disposable database.
vi.mock("@/auth/auth", () => ({ isGitHubAuthConfigured: true, getAuth: vi.fn() }));
import { getAuth } from "@/auth/auth";
import { requireAuthenticatedRequestUser } from "@/auth/server";
import { createDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { createAdminHandler } from "@/admin/http";
import { emptyContent } from "@/admin/policy";

const connection = createDatabase(process.env.TEST_DATABASE_URL!);
const { db } = connection;
const origin = "http://localhost:3100";
const handler = createAdminHandler({ authorize: requireAuthenticatedRequestUser, database: () => db, origin });
function syntheticAuth() {
  return betterAuth({ baseURL: origin, secret: "synthetic-admin-session-secret-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: schema.authUsers, session: schema.authSessions, account: schema.authAccounts, verification: schema.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
}
let auth: ReturnType<typeof syntheticAuth>;
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  auth = syntheticAuth();
  // Better Auth encodes the exact provider configuration in its generic type;
  // this test instance intentionally substitutes local password sign-in for OAuth.
  vi.mocked(getAuth).mockReturnValue(auth as unknown as ReturnType<typeof getAuth>);
});
afterAll(() => connection.client.end());

test("real signed sessions supply the sole actor; role and session revocation are immediate", async () => {
  const signUp = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Synthetic staff account", email: `${randomUUID()}@example.test`, password: "synthetic-test-only-password-long-enough" }) }));
  expect(signUp.status).toBe(200);
  const { user } = await signUp.json() as { user: { id: string } };
  const cookie = signUp.headers.getSetCookie().find(c => c.split("=", 1)[0].includes("session_token"))!.split(";", 1)[0];
  const request = (body?: unknown, session = cookie) => new Request(`${origin}/api/admin/projects`, { method: body ? "POST" : "GET", headers: { Cookie: session, Origin: origin, "Content-Type": "application/json", "x-user-id": "forged-super-admin", "x-role": "platform_super_admin" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  expect((await handler(request(), "list")).status).toBe(403);
  await db.insert(schema.studioRoles).values({ userId: user.id, role: "xr_admin" });
  const content = { ...emptyContent, title: "No student dependencies", summary: "Synthetic summary", description: "Synthetic narrative", fallbackText: "Synthetic alternative", credits: [{ name: "Manual creator", role: "Designer", statement: "Descriptive credit", profileId: "" }] };
  expect((await handler(request({ content, actor: "forged-super-admin" }), "create")).status).toBe(422);
  const created = await handler(request({ content }), "create");
  expect(created.status).toBe(201);
  const data = await created.json();
  expect(data.detail.createdBy).toBe(user.id);
  expect((await handler(request({ action: "publish", version: 1 }), "command", data.project.id)).status).toBe(200);
  expect(await db.select().from(schema.studentProfiles)).toHaveLength(0);
  expect(await db.select().from(schema.studentAffiliations)).toHaveLength(0);
  expect(await db.select().from(schema.projectMemberships)).toHaveLength(0);
  expect(await db.select().from(schema.studioSubmissions)).toHaveLength(0);
  expect(await db.select().from(schema.authUsers)).toHaveLength(1);
  const forged = `${cookie.slice(0, cookie.indexOf("="))}=unsigned-token`;
  expect((await handler(request(undefined, forged), "list")).status).toBe(401);
  await db.delete(schema.studioRoles).where(eq(schema.studioRoles.userId, user.id));
  expect((await handler(request({ action: "archive", version: 2 }), "command", data.project.id)).status).toBe(403);
  expect((await handler(request(), "detail", data.project.id)).status).toBe(403);
  await db.insert(schema.studioRoles).values({ userId: user.id, role: "xr_admin" });
  await db.delete(schema.authSessions).where(eq(schema.authSessions.userId, user.id));
  expect((await handler(request(), "list")).status).toBe(401);
});
