import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AuthenticationRequiredError } from "@/auth/server";
import { createVerificationRequestHandler } from "@/app/api/v1/student/verification/request/route";
import type { Database } from "@/db/client";
import { createDatabase } from "@/db/client";
import type { VerificationMailer, VerificationEmail } from "@/email/affiliation-verification";
import {
  affiliationVerificationChallenges,
  affiliationVerificationRateLimits,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  studentAffiliations,
} from "@/db/schema";
import type { AffiliationVerificationConfig } from "@/verification/config";
import {
  confirmAffiliationVerification,
  getStudentVerificationStatus,
  requestAffiliationVerification,
} from "@/verification/service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const config: AffiliationVerificationConfig = {
  approvedDomains: new Set(["algomau.ca"]),
  ttlMinutes: 30,
  applicationBaseUrl: "https://talent.example.test",
  rateLimitSecret: "integration-rate-limit-secret-at-least-32-characters",
};

describeWithDatabase("student affiliation verification", () => {
  let db: Database;
  let closeDatabase: (() => Promise<void>) | undefined;
  let deliveries: VerificationEmail[];
  let mailer: VerificationMailer;

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");
    const connection = createDatabase(testDatabaseUrl);
    db = connection.db;
    closeDatabase = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await clearVerificationData(db);
    deliveries = [];
    mailer = {
      async sendVerificationEmail(message) {
        deliveries.push(message);
      },
    };
  });

  afterAll(async () => {
    await clearVerificationData(db);
    await closeDatabase?.();
  });

  test("stores only a token hash and atomically verifies once", async () => {
    const userId = await createUser(db, "first");
    await requestAffiliationVerification({
      db, userId, email: " First.Student@AlgomaU.ca ", mailer, config,
    });
    expect(deliveries).toHaveLength(1);
    const token = tokenFrom(deliveries[0]);
    const [stored] = await db.select().from(affiliationVerificationChallenges);
    expect(stored.institutionalEmail).toBe("first.student@algomau.ca");
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toContain(token);

    const verified = await confirmAffiliationVerification({
      db, userId, token, clientAddress: "203.0.113.10", config,
    });
    expect(verified).toMatchObject({
      status: "verified",
      institutionalEmail: "first.student@algomau.ca",
    });
    expect(await getStudentVerificationStatus(db, userId)).toMatchObject({
      status: "verified",
      institutionalEmail: "first.student@algomau.ca",
    });
    await expect(confirmAffiliationVerification({
      db, userId, token, clientAddress: "203.0.113.11", config,
    })).rejects.toMatchObject({ code: "USED_TOKEN" });
  });

  test("rejects wrong-account, expired, and superseded links without claiming identity", async () => {
    const ownerId = await createUser(db, "owner");
    const otherId = await createUser(db, "other");
    await requestAffiliationVerification({
      db, userId: ownerId, email: "owner@algomau.ca", mailer, config,
    });
    const firstToken = tokenFrom(deliveries[0]);

    await expect(confirmAffiliationVerification({
      db, userId: otherId, token: firstToken, clientAddress: "203.0.113.20", config,
    })).rejects.toMatchObject({ code: "INVALID_TOKEN" });

    await requestAffiliationVerification({
      db, userId: ownerId, email: "owner@algomau.ca", mailer, config,
    });
    await expect(confirmAffiliationVerification({
      db, userId: ownerId, token: firstToken, clientAddress: "203.0.113.21", config,
    })).rejects.toMatchObject({ code: "INVALID_TOKEN" });

    const secondToken = tokenFrom(deliveries[1]);
    await expect(confirmAffiliationVerification({
      db,
      userId: ownerId,
      token: secondToken,
      clientAddress: "203.0.113.22",
      config,
      now: new Date(Date.now() + 31 * 60_000),
    })).rejects.toMatchObject({ code: "EXPIRED_TOKEN" });
    expect(await getStudentVerificationStatus(db, ownerId)).toMatchObject({ status: "unverified" });
  });

  test("prevents a verified university email from being claimed by another account", async () => {
    const firstId = await createUser(db, "claim-one");
    const secondId = await createUser(db, "claim-two");
    await requestAffiliationVerification({
      db, userId: firstId, email: "shared@algomau.ca", mailer, config,
    });
    await confirmAffiliationVerification({
      db,
      userId: firstId,
      token: tokenFrom(deliveries[0]),
      clientAddress: "203.0.113.30",
      config,
    });
    await expect(requestAffiliationVerification({
      db, userId: secondId, email: "shared@algomau.ca", mailer, config,
    })).rejects.toMatchObject({ code: "EMAIL_UNAVAILABLE" });
  });

  test("rate limits repeated requests by internal user across addresses", async () => {
    const userId = await createUser(db, "limited");
    for (let index = 0; index < 3; index += 1) {
      await requestAffiliationVerification({
        db,
        userId,
        email: `limited${index}@algomau.ca`,
        mailer,
        config,
      });
    }
    await expect(requestAffiliationVerification({
      db, userId, email: "limited4@algomau.ca", mailer, config,
    })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  test("rate limits invalid confirmations by user and network address", async () => {
    const userId = await createUser(db, "invalid-limit");
    for (let index = 0; index < 8; index += 1) {
      await expect(confirmAffiliationVerification({
        db,
        userId,
        token: `${String(index).padStart(2, "0")}${"A".repeat(41)}`,
        clientAddress: "203.0.113.40",
        config,
      })).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    }
    await expect(confirmAffiliationVerification({
      db,
      userId,
      token: `99${"A".repeat(41)}`,
      clientAddress: "203.0.113.40",
      config,
    })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  test("API fails closed when unauthenticated and does not invoke storage", async () => {
    const database = vi.fn(() => db);
    const handler = createVerificationRequestHandler({
      authenticate: async () => { throw new AuthenticationRequiredError(); },
      database,
      mailer: () => mailer,
    });
    const response = await handler(new Request(
      "https://talent.example.test/api/v1/student/verification/request",
      { method: "POST", body: JSON.stringify({ email: "student@algomau.ca" }) },
    ));
    expect(response.status).toBe(401);
    expect(database).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("student@algomau.ca");
  });

  test("does not report delivery success when the provider is unconfigured", async () => {
    const userId = await createUser(db, "no-mailer");
    const handler = createVerificationRequestHandler({
      authenticate: async () => ({ id: userId }),
      database: () => db,
      mailer: () => null,
    });
    const response = await handler(new Request(
      "https://talent.example.test/api/v1/student/verification/request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@algomau.ca" }),
      },
    ));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "EMAIL_NOT_CONFIGURED" } });
  });
});

function tokenFrom(delivery: VerificationEmail | undefined) {
  if (!delivery) throw new Error("Expected a verification delivery.");
  const token = new URL(delivery.verifyUrl).searchParams.get("token");
  if (!token) throw new Error("Expected a verification token.");
  return token;
}

async function createUser(db: Database, label: string) {
  const id = randomUUID();
  await db.insert(authUsers).values({
    id,
    name: label,
    email: `${label}-${id}@example.test`,
  });
  return id;
}

async function clearVerificationData(db: Database) {
  await db.delete(affiliationVerificationChallenges);
  await db.delete(affiliationVerificationRateLimits);
  await db.delete(studentAffiliations);
  await db.delete(authVerifications);
  await db.delete(authSessions);
  await db.delete(authAccounts);
  await db.delete(authUsers);
  await db.execute(sql`select 1`);
}
