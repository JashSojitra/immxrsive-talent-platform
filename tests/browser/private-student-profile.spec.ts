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
    await page.getByRole("textbox", { name: "Public location", exact: true })
      .fill("Sault Ste. Marie, ON");
    await page.getByLabel("Program").fill("Computer Science");
    await page.getByLabel("Student status").selectOption("current");
    await page.getByRole("checkbox", { name: "Unity" }).check();
    await page.getByRole("checkbox", { name: "Internship" }).check();
    const create = page.getByRole("button", { name: "Create private draft" });
    await create.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Private draft saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Professional headline"))
      .toHaveValue("Browser-only private XR profile");
    await page.getByLabel("Professional headline").fill("Browser private XR profile updated");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Private draft saved.")).toBeVisible();

    await page.getByLabel("PDF resume").setInputFiles(
      "data/fixtures/r2/resume_clean_single_column.pdf",
    );
    await page.getByRole("button", { name: "Review resume" }).click();
    await expect.poll(() => page.locator("textarea").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLTextAreaElement).value))).toContain(
      "BSc Computer Science - Algoma University",
    );
    await expect.poll(() => page.locator("textarea").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLTextAreaElement).value))).toContain(
      "XR Lab Assistant - Built and tested immersive training prototypes.",
    );
    const applyResume = page.getByRole("button", { name: "Apply approved changes" });
    await applyResume.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Approved resume candidates were saved to your private draft.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Education entry 1"))
      .toHaveValue("BSc Computer Science - Algoma University");
    await expect(page.getByLabel("Experience entry 1"))
      .toHaveValue("XR Lab Assistant - Built and tested immersive training prototypes.");

    const publicSearch = await page.request.get(
      "/api/v1/talent?q=%22Browser%20private%20XR%20profile%20updated%22",
    );
    expect(publicSearch.status()).toBe(200);
    expect(await publicSearch.json()).toMatchObject({ items: [], count: 0 });

    await page.getByRole("radio", { name: /Editorial/ }).check();
    await page.getByRole("radio", { name: /Topographic contours/ }).check();
    const moveSkillsUp = page.getByRole("button", { name: "Move Skills up" });
    await moveSkillsUp.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("checkbox", { name: /^Show availability/ }).check();
    await page.getByRole("checkbox", { name: /^Show location/ }).check();
    await page.getByRole("checkbox", { name: /^Show education/ }).check();
    await page.getByRole("checkbox", { name: /^Show experience/ }).check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Private draft saved.")).toBeVisible();

    await page.getByRole("link", { name: "Preview saved public profile" }).click();
    await expect(page.getByText("Private preview — not public")).toBeVisible();
    await expect(page.locator("main#profile-content")).toHaveAttribute("data-preset", "editorial");
    await expect(page.locator('[data-media="contours"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browser Profile Student", exact: true }))
      .toBeVisible();
    await expect(page.getByText("Sault Ste. Marie, ON")).toBeVisible();
    await expect(page.getByText("BSc Computer Science - Algoma University")).toBeVisible();
    const previewHeadingIds = await page.getByRole("heading", { level: 2 })
      .evaluateAll((headings) => headings.map((heading) => heading.id));
    expect(previewHeadingIds.indexOf("capabilities-title"))
      .toBeLessThan(previewHeadingIds.indexOf("about-title"));
    const privateResponse = await page.request.get("/api/v1/student/profile/me");
    const privateBody = await privateResponse.json() as { profile: { id: string } };
    const publicId = privateBody.profile.id;
    expect((await page.request.get(`/api/v1/students/${publicId}`)).status()).toBe(404);
    await page.getByRole("link", { name: "Return to editor" }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Publish profile" }).click();
    await expect(page.getByText("Profile published. It is now available in public discovery."))
      .toBeVisible();
    const publishedSearch = await page.request.get(
      "/api/v1/talent?q=%22Browser%20private%20XR%20profile%20updated%22",
    );
    expect(await publishedSearch.json()).toMatchObject({
      items: [expect.objectContaining({ id: publicId })], count: 1,
    });
    await page.goto(`/students/${publicId}`);
    await expect(page.locator("main#profile-content")).toHaveAttribute("data-preset", "editorial");
    await expect(page.locator('[data-media="contours"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browser Profile Student", exact: true }))
      .toBeVisible();
    await expect(page.getByRole("link", { name: /employer inquiry for browser profile student/i }))
      .toHaveAttribute("href", `/inquiry/student/${publicId}`);
    await expect(page.getByText(/No canonical project evidence is connected/)).toBeVisible();
    await page.getByRole("link", { name: /employer inquiry for browser profile student/i }).click();
    await expect(page.getByRole("heading", {
      level: 1, name: "Browser Profile Student", exact: true,
    })).toBeVisible();
    await expect(page.getByRole("form", { name: /employer inquiry about browser profile student/i }))
      .toBeVisible();
    await expect(page.getByLabel(/inquiry description/i))
      .toHaveValue(/Browser private XR profile updated/);
    const contextId = page.getByText(publicId, { exact: true });
    const candidateName = page.getByRole("heading", {
      level: 1, name: "Browser Profile Student", exact: true,
    });
    await expect(contextId).toBeVisible();
    await expect.poll(async () => {
      const [idBox, nameBox] = await Promise.all([
        contextId.boundingBox(),
        candidateName.boundingBox(),
      ]);
      if (!idBox || !nameBox) return false;
      const separatedHorizontally = idBox.x + idBox.width <= nameBox.x;
      const separatedVertically = idBox.y + idBox.height <= nameBox.y;
      return separatedHorizontally || separatedVertically;
    }).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    await page.goBack();
    await expect(page).toHaveURL(`/students/${publicId}`);

    await page.goto("/student/profile/edit");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Unpublish profile" }).click();
    await expect(page.getByText("Profile unpublished. Your maintained private data is preserved."))
      .toBeVisible();
    expect((await page.request.get(`/api/v1/students/${publicId}`)).status()).toBe(404);
    const unpublishedSearch = await page.request.get(
      "/api/v1/talent?q=%22Browser%20private%20XR%20profile%20updated%22",
    );
    expect(await unpublishedSearch.json()).toMatchObject({ items: [], count: 0 });
    await expect(page.getByLabel("Education entry 1"))
      .toHaveValue("BSc Computer Science - Algoma University");
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
