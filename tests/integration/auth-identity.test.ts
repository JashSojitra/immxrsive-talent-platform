import { randomUUID } from "node:crypto";

import "./setup";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { betterAuth } from "better-auth";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { createDatabase, type Database } from "@/db/client";
import { findInternalUserByProviderAccount } from "@/db/queries/auth-identity";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";

vi.mock("server-only", () => ({}));

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("authentication identity and session integration", () => {
  let db: Database;
  let closeDatabase: (() => Promise<void>) | undefined;
  let testAuth: { handler: (request: Request) => Promise<Response> };

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await clearAuthData(db);

    testAuth = betterAuth({
      baseURL: "http://localhost:3000",
      secret: "integration-test-secret-with-at-least-thirty-two-characters",
      database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
          user: authUsers,
          session: authSessions,
          account: authAccounts,
          verification: authVerifications,
        },
      }),
      emailAndPassword: { enabled: true },
    });
  });

  afterAll(async () => {
    await clearAuthData(db);
    await closeDatabase?.();
  });

  test("repeat provider lookup survives a GitHub username change", async () => {
    const userId = randomUUID();
    await db.insert(authUsers).values({
      id: userId,
      name: "Original GitHub Name",
      email: "stable-github-user@example.test",
      emailVerified: true,
    });
    await db.insert(authAccounts).values({
      id: randomUUID(),
      providerId: "github",
      accountId: "987654321",
      userId,
    });

    expect(await findInternalUserByProviderAccount(db, "github", "987654321"))
      .toMatchObject({ id: userId, name: "Original GitHub Name" });

    await db.update(authUsers).set({ name: "Renamed GitHub User" })
      .where(eq(authUsers.id, userId));

    expect(await findInternalUserByProviderAccount(db, "github", "987654321"))
      .toMatchObject({ id: userId, name: "Renamed GitHub User" });
  });

  test("database rejects a duplicate provider and immutable provider account ID", async () => {
    const firstUser = randomUUID();
    const secondUser = randomUUID();
    await db.insert(authUsers).values([
      { id: firstUser, name: "First", email: `${firstUser}@example.test` },
      { id: secondUser, name: "Second", email: `${secondUser}@example.test` },
    ]);
    await db.insert(authAccounts).values({
      id: randomUUID(), providerId: "github", accountId: "duplicate-id", userId: firstUser,
    });

    await expect(db.insert(authAccounts).values({
      id: randomUUID(), providerId: "github", accountId: "duplicate-id", userId: secondUser,
    })).rejects.toThrow();
  });

  test("database-backed sessions sign out and do not expose credentials", async () => {
    const signUpResponse = await testAuth.handler(authRequest("/sign-up/email", {
      name: "Session Student",
      email: "session-student@example.test",
      password: "correct-horse-battery-staple",
    }));
    expect(signUpResponse.status).toBe(200);
    const cookie = responseCookie(signUpResponse);
    expect(cookie).toContain("session_token");

    const sessionResponse = await testAuth.handler(authRequest("/get-session", undefined, cookie, "GET"));
    expect(sessionResponse.status).toBe(200);
    const sessionBody = await sessionResponse.json();
    expect(sessionBody.user).toMatchObject({ email: "session-student@example.test" });
    const serializedSession = JSON.stringify(sessionBody);
    expect(serializedSession).not.toContain("correct-horse-battery-staple");
    expect(serializedSession).not.toContain("accessToken");
    expect(serializedSession).not.toContain("refreshToken");

    const signOutResponse = await testAuth.handler(authRequest("/sign-out", {}, cookie));
    expect(signOutResponse.status).toBe(200);

    const signedOutSession = await testAuth.handler(authRequest("/get-session", undefined, cookie, "GET"));
    expect(await signedOutSession.json()).toBeNull();
  });

  test("production GitHub start flow emits only the intended scope and no secret", async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_SECRET = "production-config-test-secret-at-least-thirty-two";
    process.env.GITHUB_CLIENT_ID = "public-test-client-id";
    process.env.GITHUB_CLIENT_SECRET = "server-only-test-client-secret";

    const { getAuth } = await import("@/auth/auth");
    const response = await getAuth().handler(authRequest("/sign-in/social", {
      provider: "github",
      callbackURL: "/student/dashboard",
    }));
    expect(response.status).toBe(200);
    const body = await response.json() as { url: string };
    const providerURL = new URL(body.url);
    expect(providerURL.searchParams.get("scope")).toBe("user:email");
    expect(body.url).not.toContain("repo");
    expect(JSON.stringify(body)).not.toContain("server-only-test-client-secret");
  });

  test("an unauthenticated session lookup fails closed", async () => {
    const response = await testAuth.handler(authRequest("/get-session", undefined, undefined, "GET"));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});

function authRequest(
  path: string,
  body?: unknown,
  cookie?: string,
  method = "POST",
) {
  const headers = new Headers({ Origin: "http://localhost:3000" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function responseCookie(response: Response) {
  return response.headers.getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
}

async function clearAuthData(db: Database) {
  await db.delete(authVerifications);
  await db.delete(authSessions);
  await db.delete(authAccounts);
  await db.delete(authUsers);
  await db.execute(sql`select 1`);
}
