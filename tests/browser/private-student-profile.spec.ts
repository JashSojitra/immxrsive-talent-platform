import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";

import { createDatabase } from "../../src/db/client";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  studentAffiliations,
} from "../../src/db/schema";
import { importFixtureData } from "../../src/fixtures/import";
import { loadFixtureSource } from "../../src/fixtures/load";
import { validateFixtureData } from "../../src/fixtures/schema";

const applicationOrigin = "http://127.0.0.1:3100";
const browserAuthSecret = "browser-test-secret-with-at-least-thirty-two-characters";

test("verified student creates and returns to a private profile draft", async ({ page }) => {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required for browser profile tests.");
  const connection = createDatabase(databaseUrl);
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const email = `profile-${suffix}@example.test`;
  let userId: string | undefined;

  try {
    await importFixtureData(connection.db, validateFixtureData(await loadFixtureSource()));
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
      headers: { "Content-Type": "application/json", Origin: applicationOrigin },
      body: JSON.stringify({
        name: "Browser Profile Student",
        email,
        password: "browser-only-test-password-with-sufficient-length",
      }),
    }));
    expect(signUp.status).toBe(200);
    const body = await signUp.json() as { user: { id: string } };
    userId = body.user.id;
    await connection.db.insert(studentAffiliations).values({
      userId,
      institutionalEmail: `profile-${suffix}@algomau.ca`,
      verifiedAt: new Date(),
    });
    const sessionCookie = signUp.headers.getSetCookie().map(parseCookie)
      .find((cookie) => cookie.name.includes("session_token"));
    if (!sessionCookie) throw new Error("Better Auth did not return a session cookie.");
    await page.context().addCookies([{
      ...sessionCookie, url: applicationOrigin, httpOnly: true, sameSite: "Lax",
    }]);

    await page.goto("/student/profile/edit");
    await expect(page.getByRole("heading", { name: "Shape your professional profile." })).toBeVisible();
    await page.getByLabel("Professional headline").fill("Browser-only private XR profile");
    await page.getByLabel("Biography").fill("A private profile draft created by the browser suite.");
    await page.getByLabel("Public location").fill("Sault Ste. Marie, ON");
    await page.getByRole("checkbox", { name: "Unity" }).check();
    await page.getByRole("checkbox", { name: "Internship" }).check();
    const create = page.getByRole("button", { name: "Create private draft" });
    await create.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("Private draft saved");

    await page.reload();
    await expect(page.getByLabel("Professional headline"))
      .toHaveValue("Browser-only private XR profile");
    await page.getByLabel("Professional headline").fill("Browser private XR profile updated");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Private draft saved");

    const publicSearch = await page.request.get(
      "/api/v1/talent?q=%22Browser%20private%20XR%20profile%20updated%22",
    );
    expect(publicSearch.status()).toBe(200);
    expect(await publicSearch.json()).toMatchObject({ items: [], count: 0 });
    if (test.info().project.name === "mobile-390") {
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(390);
    }
  } finally {
    if (userId) await connection.db.delete(authUsers).where(eq(authUsers.id, userId));
    await connection.client.end();
  }
});

function parseCookie(value: string) {
  const firstSegment = value.split(";", 1)[0];
  const separator = firstSegment.indexOf("=");
  return { name: firstSegment.slice(0, separator), value: firstSegment.slice(separator + 1) };
}
