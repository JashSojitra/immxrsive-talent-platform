import { createHash, randomBytes } from "node:crypto";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";

import { createDatabase } from "../../src/db/client";
import {
  affiliationVerificationChallenges,
  affiliationVerificationRateLimits,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  studentAffiliations,
} from "../../src/db/schema";

const applicationOrigin = "http://127.0.0.1:3100";
const browserAuthSecret = "browser-test-secret-with-at-least-thirty-two-characters";

test("authenticated student confirms a single-use affiliation link", async ({ page }) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required for browser verification.");
  const connection = createDatabase(databaseUrl);
  const email = `browser-${Date.now()}-${test.info().project.name}@example.test`;
  let userId: string | undefined;

  try {
    const testAuth = betterAuth({
      baseURL: applicationOrigin,
      secret: browserAuthSecret,
      database: drizzleAdapter(connection.db, {
        provider: "pg",
        schema: {
          user: authUsers,
          session: authSessions,
          account: authAccounts,
          verification: authVerifications,
        },
      }),
      emailAndPassword: { enabled: true },
      advanced: { cookiePrefix: "immxrsive" },
    });
    const signUp = await testAuth.handler(new Request(`${applicationOrigin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: applicationOrigin,
      },
      body: JSON.stringify({
        name: "Browser Verification Student",
        email,
        password: "browser-only-test-password-with-sufficient-length",
      }),
    }));
    expect(signUp.status).toBe(200);
    const signUpBody = await signUp.json() as { user: { id: string } };
    userId = signUpBody.user.id;
    const sessionCookie = signUp.headers.getSetCookie()
      .map(parseCookie)
      .find((cookie) => cookie.name.includes("session_token"));
    if (!sessionCookie) throw new Error("Better Auth did not return a session cookie.");
    await page.context().addCookies([{
      ...sessionCookie,
      url: applicationOrigin,
      httpOnly: true,
      sameSite: "Lax",
    }]);

    const rawToken = randomBytes(32).toString("base64url");
    await connection.db.insert(affiliationVerificationChallenges).values({
      userId,
      institutionalEmail: "browser.student@algomau.ca",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });

    await page.goto(`/student/verify?token=${rawToken}`);
    await expect(page.getByRole("heading", { name: /verify your.*algoma connection/i })).toBeVisible();
    const verifyButton = page.getByRole("button", { name: "Verify affiliation" });
    await verifyButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Affiliation confirmed")).toBeVisible();
    await expect(page.getByText("browser.student@algomau.ca")).toBeVisible();

    await page.goto("/student/dashboard");
    await expect(page.getByText("Algoma affiliation verified")).toBeVisible();
    await expect(page.getByText("browser.student@algomau.ca")).toBeVisible();

    const replay = await page.request.post("/api/v1/student/verification/confirm", {
      data: { token: rawToken },
    });
    expect(replay.status()).toBe(409);
    expect(await replay.json()).toMatchObject({ error: { code: "USED_TOKEN" } });

    if (test.info().project.name === "mobile-390") {
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(390);
    }
  } finally {
    if (userId) {
      await connection.db.delete(affiliationVerificationChallenges)
        .where(eq(affiliationVerificationChallenges.userId, userId));
      await connection.db.delete(studentAffiliations)
        .where(eq(studentAffiliations.userId, userId));
      await connection.db.delete(authUsers).where(eq(authUsers.id, userId));
    }
    await connection.db.delete(affiliationVerificationRateLimits);
    await connection.client.end();
  }
});

function parseCookie(value: string) {
  const firstSegment = value.split(";", 1)[0];
  const separator = firstSegment.indexOf("=");
  return {
    name: firstSegment.slice(0, separator),
    value: firstSegment.slice(separator + 1),
  };
}
