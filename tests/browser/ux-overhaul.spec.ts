import { randomUUID } from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";

const origin = "http://127.0.0.1:3100";
const cases = [
  { name: "unverified student", verified: false, role: null, maintainer: false },
  { name: "verified student", verified: true, role: null, maintainer: false },
  { name: "verified student maintainer", verified: true, role: null, maintainer: true },
  { name: "staff curator", verified: false, role: "xr_curator", maintainer: false },
  { name: "XR admin", verified: false, role: "xr_admin", maintainer: false },
  { name: "platform super admin", verified: false, role: "platform_super_admin", maintainer: false },
  { name: "verified student and platform super admin", verified: true, role: "platform_super_admin", maintainer: true },
] as const;

for (const account of cases) {
  test(`workspace navigation preserves independent capabilities: ${account.name}`, async ({ page }) => {
    const connection = createDatabase(process.env.TEST_DATABASE_URL!);
    const db = connection.db;
    try {
      const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
      const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: `Synthetic ${account.name}`, email: `ux-${randomUUID()}@example.test`, password: "browser-only-ux-password-long-enough" }) }));
      expect(response.status).toBe(200);
      const { user } = await response.json() as { user: { id: string } };
      const cookie = response.headers.getSetCookie().find(value => value.split("=", 1)[0].includes("session_token"))!.split(";", 1)[0];
      const separator = cookie.indexOf("=");
      await page.context().addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
      if (account.role) await db.insert(s.studioRoles).values({ userId: user.id, role: account.role });
      let profileId: string | undefined;
      if (account.verified) {
        await db.insert(s.studentAffiliations).values({ userId: user.id, institutionalEmail: `${user.id}@algomau.ca`, verifiedAt: new Date() });
        const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: user.id, headline: "Synthetic UX portfolio", biography: "Private local test portfolio.", publicationStatus: "unpublished", studentStatus: "current" }).returning();
        profileId = profile.id;
      }
      let projectId: string | undefined;
      if (account.maintainer) {
        const created = await page.request.post("/api/v1/student/projects", { headers: { Origin: origin }, data: { creatorRoleId: "xr-developer", draft: { title: `Private UX work ${randomUUID()}`, description: "Synthetic private project to verify that switching workspaces preserves ownership.", domain: "XR" } } });
        expect(created.status()).toBe(201);
        projectId = (await created.json()).project.id;
      }
      await page.goto("/talent");
      const header = page.getByRole("banner");
      const menu = header.getByRole("button", { name: /menu/i });
      if (await menu.isVisible()) await menu.click();
      const navigation = await page.getByRole("dialog").isVisible() ? page.getByRole("dialog") : header;
      if (account.verified) await expect(navigation.getByRole("link", { name: "Student Dashboard", exact: true })).toBeVisible();
      else await expect(navigation.getByRole("link", { name: "Student Dashboard", exact: true })).toHaveCount(0);
      if (account.role) await expect(navigation.getByRole("link", { name: "Admin Dashboard", exact: true })).toBeVisible();
      else await expect(navigation.getByRole("link", { name: "Admin Dashboard", exact: true })).toHaveCount(0);
      if (await page.getByRole("dialog").isVisible()) await page.keyboard.press("Escape");
      const profileResponse = await page.request.get("/api/v1/student/profile/me");
      expect(profileResponse.status()).toBe(account.verified ? 200 : 403);
      const adminResponse = await page.request.get("/api/admin/identity");
      expect(adminResponse.status()).toBe(account.role ? 200 : 403);
      const accessResponse = await page.request.get("/api/admin/access");
      expect(accessResponse.status()).toBe(account.role === "platform_super_admin" ? 200 : 403);
      if (account.role) {
        await page.goto("/admin");
        await expect(page).not.toHaveURL(/sign-in/);
        await expect(page.getByRole("main")).toBeVisible();
      }
      if (account.verified) {
        await page.goto("/student/dashboard");
        await expect(page.getByRole("heading", { name: "My profile", exact: true })).toBeVisible();
        const [saved] = await db.select().from(s.studentProfiles).where(eq(s.studentProfiles.ownerUserId, user.id));
        expect(saved.id).toBe(profileId);
        expect(saved.publicationStatus).toBe("unpublished");
      }
      if (projectId) {
        const [saved] = await db.select().from(s.projects).where(eq(s.projects.id, projectId));
        expect(saved.maintainerUserId).toBe(user.id);
        expect(saved.publicationStatus).toBe("unpublished");
        expect((await page.request.get(`/api/v1/projects/${projectId}`)).status()).toBe(404);
      }
    } finally { await connection.client.end(); }
  });
}


test("public discovery remains usable at mobile, tablet and desktop widths", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/", "/talent", "/projects", "/showcase", "/partners", "/contact"]) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} at ${width}`).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBeLessThanOrEqual(width);
    }
    await testInfo.attach(`inquiries-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  }
  expect(errors).toEqual([]);
});


test("mobile navigation contains keyboard focus, exposes destinations and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/talent");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Explore ImmXrsive" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Talent", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(dialog.getByRole("link", { name: "Staff / Admin Portal", exact: true })).toHaveAttribute("href", "/admin");
  for (let step = 0; step < 14; step++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("project GET filters combine technology, discipline and collection with clear recovery", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "Industrial Safety VR Trainer", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Campus Service Request Platform", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search projects" }).fill("Unity");
  await page.getByRole("button", { name: "Find projects", exact: true }).click();
  await expect(page).toHaveURL(/q=Unity/);
  await expect(page.getByRole("link", { name: "Industrial Safety VR Trainer", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Campus Service Request Platform", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Discipline", exact: true }).selectOption("Training / Simulation");
  await page.getByRole("combobox", { name: "Project collection", exact: true }).selectOption("STUDENT_MANAGED");
  await page.getByRole("button", { name: "Find projects", exact: true }).click();
  let params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("Unity");
  expect(params.get("domain")).toBe("Training / Simulation");
  expect(params.get("managed")).toBe("STUDENT_MANAGED");
  await expect(page.getByRole("link", { name: "Industrial Safety VR Trainer", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Museum Quest Experience", exact: true })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search projects" }).fill("Industrial Safety VR Trainer");
  await page.getByRole("combobox", { name: "Project collection", exact: true }).selectOption("ADMIN_MANAGED");
  await page.getByRole("button", { name: "Find projects", exact: true }).click();
  params = new URL(page.url()).searchParams;
  expect(params.get("managed")).toBe("ADMIN_MANAGED");
  await expect(page.getByRole("heading", { name: "No projects match these filters.", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Industrial Safety VR Trainer", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Clear filters", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("searchbox", { name: "Search projects" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Discipline", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Project collection", exact: true })).toHaveValue("");
  await expect(page.getByRole("link", { name: "Campus Service Request Platform", exact: true })).toBeVisible();
});

test("homepage talent action and developer credit remain accessible and secure", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Developed by Jash Sojitra");
  for (const [label, href] of [["Jash Sojitra on GitHub", "https://github.com/JashSojitra"], ["Jash Sojitra on LinkedIn", "https://www.linkedin.com/in/jashsojitra/"]]) {
    const link = footer.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /\bnoopener\b/);
    await expect(link).toHaveAttribute("rel", /\bnoreferrer\b/);
  }
  await page.getByRole("main").getByRole("link", { name: "Discover talent", exact: true }).click();
  await expect(page).toHaveURL(/\/talent$/);
  await expect(page.getByRole("searchbox", { name: "Search talent", exact: true })).toBeVisible();
});
