import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test, type BrowserContext } from "@playwright/test";
import { betterAuth } from "better-auth";
import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
import { importFixtureData } from "../../src/fixtures/import";
import { loadFixtureSource } from "../../src/fixtures/load";
import { validateFixtureData } from "../../src/fixtures/schema";

const origin = "http://127.0.0.1:3100";
test("verified student manually creates, previews, resolves conflicts and publishes canonical evidence", async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  const connection = createDatabase(process.env.TEST_DATABASE_URL!);
  const db = connection.db; const users: string[] = []; let id: string | undefined; let outsider: BrowserContext | undefined;
  const consoleErrors: string[] = [];
  page.on("pageerror", error => consoleErrors.push(error.message));
  try {
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));
    const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
    async function signIn(context: BrowserContext, label: string) {
      const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: label, email: `project-${Date.now()}-${Math.random()}@example.test`, password: "browser-only-project-password-long-enough" }) }));
      expect(response.status).toBe(200); const { user } = await response.json() as { user: { id: string } }; users.push(user.id);
      const raw = response.headers.getSetCookie().find(cookie => cookie.split("=", 1)[0].includes("session_token"))!;
      const cookie = raw.split(";", 1)[0]; const separator = cookie.indexOf("=");
      await context.addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
      return user.id;
    }
    const anon = await browser.newContext();
    expect((await anon.request.post(`${origin}/api/v1/student/projects`, { headers: { Origin: origin }, data: { draft: {} } })).status()).toBe(401);
    await anon.close();
    const userId = await signIn(page.context(), "Phase3 Browser Student");
    await page.goto("/student/projects/new"); await expect(page).toHaveURL(/\/student\/verify/);
    expect((await page.request.post("/api/v1/student/projects", { headers: { Origin: origin }, data: { draft: {} } })).status()).toBe(403);
    await db.insert(s.studentAffiliations).values({ userId, institutionalEmail: `${userId}@algomau.ca`, verifiedAt: new Date() });
    const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: userId, publicationStatus: "published", studentStatus: "current", headline: "Building XR evidence", biography: "A synthetic portfolio for project browser QA.", program: "Computing" }).returning();
    const [skill] = await db.select().from(s.skills).where(eq(s.skills.name, "Unity"));
    await db.insert(s.studentProfileSkills).values({ profileId: profile.id, skillId: skill.id, displayOrder: 0 });
    await page.goto("/student/dashboard"); await page.getByRole("link", { name: "My Projects", exact: true }).click();
    await page.getByRole("link", { name: "Add Project", exact: true }).click();
    await page.getByLabel("Project title", { exact: true }).fill("Spatial Learning Studio");
    await page.getByLabel("Short description").fill("An interactive spatial-learning prototype with a clear record of the work.");
    await page.getByLabel("Domain / type").fill("Training / Simulation");
    await page.getByRole("combobox", { name: "Project status", exact: true }).selectOption("completed");
    await page.getByLabel("Project date (optional)").fill("2026-10-31");
    await page.getByLabel("Your contributor role").selectOption("xr-developer");
    await page.getByLabel("Project technologies").fill("Unity, Blender");
    for (let i = 1; i <= 2; i++) { await page.getByRole("button", { name: "Add repository", exact: true }).click(); await page.getByLabel(`Repository ${i} URL`).fill(`https://github.com/example-org/studio-${i}`); }
    await page.getByRole("button", { name: "Add public link", exact: true }).click();
    await page.getByLabel("Public link 1 label").fill("Project site"); await page.getByLabel("Public link 1 URL").fill("https://example.com/studio");
    for (const [index, kind, label] of [[1, "video", "Studio walkthrough"], [2, "fallback_link", "Fallback evidence"]] as const) {
      await page.getByRole("button", { name: "Add media link", exact: true }).click();
      await page.getByLabel(`Media ${index} type`).selectOption(kind); await page.getByLabel(`Media ${index} label`).fill(label);
      await page.getByLabel(`Media ${index} URL`).fill(`https://example.com/${kind}`);
    }
    const created = page.waitForResponse(r => r.url().endsWith("/api/v1/student/projects") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Create project", exact: true }).focus(); await page.keyboard.press("Enter");
    const response = await created; expect(response.status()).toBe(201);
    const body = await response.json(); id = body.project.id;
    await expect(page).toHaveURL(`${origin}/student/projects/${id}/edit`);
    await expect(page.getByLabel("Project title", { exact: true })).toHaveValue("Spatial Learning Studio");
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/projects/${id}?preview=true`)).status()).toBe(404);
    const privateResponse = await page.request.get(`/projects/${id}`);
    expect(privateResponse.status()).toBe(404);
    const unavailable = await privateResponse.text();
    expect(unavailable).toContain("noindex"); expect(unavailable).not.toContain("Spatial Learning Studio");
    expect(unavailable).not.toContain("An interactive spatial-learning prototype");
    await page.goto(`/projects/${id}`); await expect(page.getByRole("heading", { name: /Project\s+not available/i })).toBeVisible();
    await page.goto(`/student/projects/${id}/edit`);
    expect((await (await page.request.get(`/api/v1/students/${profile.id}`)).json()).projects).toEqual([]);
    await page.getByRole("link", { name: "Preview saved project" }).click();
    await expect(page.getByText("Private preview — saved project", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Spatial Learning Studio" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.getByRole("link", { name: "Return to editor" }).click();

    const current = await (await page.request.get(`/api/v1/student/projects/${id}`)).json();
    expect((await page.request.patch(`/api/v1/student/projects/${id}`, { headers: { Origin: origin }, data: { version: current.project.version, draft: { ...current.draft, title: "Saved in another session" } } })).status()).toBe(200);
    await page.getByLabel("Project title", { exact: true }).fill("My unsaved project title");
    await page.getByRole("button", { name: "Save project", exact: true }).click();
    await expect(page.getByRole("alert", { name: /This project changed|Project not saved/ })).toContainText("changed in another session");
    await expect(page.getByRole("alert", { name: /This project changed|Project not saved/ })).toBeFocused();
    await expect(page.getByLabel("Project title", { exact: true })).toHaveValue("My unsaved project title");
    await expect(page.getByRole("button", { name: "Publish project", exact: true })).toBeDisabled();
    page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Load latest saved project" }).click();
    await expect(page.getByLabel("Project title", { exact: true })).toHaveValue("My unsaved project title");
    page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Load latest saved project" }).click();
    await expect(page.getByLabel("Project title", { exact: true })).toHaveValue("Saved in another session");
    await page.getByLabel("Project title", { exact: true }).fill("Spatial Learning Studio — finished");
    await page.route(`**/api/v1/student/projects/${id}`, route => route.request().method() === "PATCH" ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Temporary test failure" } }) }) : route.continue());
    await page.getByRole("button", { name: "Save project", exact: true }).click(); await expect(page.getByRole("alert", { name: /This project changed|Project not saved/ })).toContainText("Temporary test failure");
    await expect(page.getByLabel("Project title", { exact: true })).toHaveValue("Spatial Learning Studio — finished");
    await page.unroute(`**/api/v1/student/projects/${id}`);
    await page.getByLabel("Repository 1 URL").fill("https://github.com/example-org/new-source");
    await page.getByRole("button", { name: "Remove repository 2", exact: true }).click();
    await page.getByRole("button", { name: "Save project", exact: true }).click(); await expect(page.getByRole("status")).toHaveText("Project saved.");
    await page.getByRole("button", { name: "Remove repository 1", exact: true }).click();
    await page.getByRole("button", { name: "Save project", exact: true }).click(); await expect(page.getByRole("status")).toHaveText("Project saved.");
    expect((await (await page.request.get(`/api/v1/student/projects/${id}`)).json()).draft.repositories).toEqual([]);
    page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Publish project", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Project published.");
    await page.getByRole("link", { name: "View public project", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Spatial Learning Studio — finished" })).toBeVisible();
    await expect(page.getByText("XR Developer", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fallback evidence/ })).toBeVisible();
    await expect(page.getByRole("main")).toHaveAttribute("data-motion", /ready|reduced|fallback/);
    await expect(page.locator("#project-title")).toHaveCSS("opacity", "1");
    const index = await page.locator("[data-project-index] strong").boundingBox(); const heading = await page.locator("h1").boundingBox();
    expect(Boolean(index && heading && (index.x + index.width <= heading.x || index.y + index.height <= heading.y))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    for (const section of await page.locator("[data-project-section]").all()) {
      await section.scrollIntoViewIfNeeded();
      await expect(section.locator("[data-project-reveal]").last()).toHaveCSS("opacity", "1");
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("public-project.png"), fullPage: true });
    const publicBody = await (await page.request.get(`/api/v1/projects/${id}`)).json(); expect(publicBody.id).toBe(id);
    expect(publicBody.contributors).toMatchObject([{ studentId: profile.id, role: "XR Developer" }]);
    expect(JSON.stringify(publicBody)).not.toContain(userId);
    await page.goto(`/students/${profile.id}`); await expect(page.getByRole("link", { name: "View project Spatial Learning Studio — finished", exact: true })).toHaveAttribute("href", `/projects/${id}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    const directory = await (await page.request.get("/api/v1/talent?q=Phase3%20Browser%20Student")).json(); expect(directory.items.find((item: { id: string }) => item.id === profile.id).projectEvidenceCount).toBe(1);
    expect((await (await page.request.get(`/api/v1/students/${profile.id}`)).json()).skills).toEqual(["Unity"]);
    await db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.id, profile.id));
    expect((await page.request.get(`/api/v1/students/${profile.id}`)).status()).toBe(404);
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toEqual([]);
    await db.update(s.studentProfiles).set({ publicationStatus: "published" }).where(eq(s.studentProfiles.id, profile.id));

    outsider = await browser.newContext(); const otherId = await signIn(outsider, "Other Project Student");
    await db.insert(s.studentAffiliations).values({ userId: otherId, institutionalEmail: `${otherId}@algomau.ca`, verifiedAt: new Date() });
    await db.insert(s.studentProfiles).values({ ownerUserId: otherId });
    expect((await outsider.request.patch(`${origin}/api/v1/student/projects/${id}`, { headers: { Origin: origin }, data: { version: 1, draft: body.draft } })).status()).toBe(403);
    expect((await outsider.request.get(`${origin}/api/v1/student/projects/${id}`)).status()).toBe(403);
    const deniedPreview = await (await outsider.request.get(`${origin}/student/projects/${id}/preview`)).text();
    expect(deniedPreview).toContain("noindex"); expect(deniedPreview).not.toContain("Spatial Learning Studio");
    expect(deniedPreview).toContain("This private project is not available to your account.");
    await outsider.close(); outsider = undefined;
    await page.goto(`/student/projects/${id}/edit`); await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload();
    await expect(page.getByRole("form", { name: "Project editor" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveAttribute("data-motion", "reduced");
    await page.getByLabel("Project title", { exact: true }).focus(); await expect(page.getByLabel("Project title", { exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("project-editor.png"), fullPage: true });
    page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Unpublish project", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Project unpublished");
    expect((await page.request.get(`/projects/${id}`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);
    expect((await (await page.request.get(`/api/v1/students/${profile.id}`)).json()).projects).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await outsider?.close();
    if (id) {
      await db.delete(s.projectMaintainerTransfers).where(eq(s.projectMaintainerTransfers.projectId, id));
      const members = await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.projectId, id));
      if (members.length) await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId, members.map(m => m.id)));
      await db.delete(s.projectMemberships).where(eq(s.projectMemberships.projectId, id));
      await db.delete(s.projectRepositories).where(eq(s.projectRepositories.projectId, id)); await db.delete(s.projectLinks).where(eq(s.projectLinks.projectId, id)); await db.delete(s.projectMedia).where(eq(s.projectMedia.projectId, id));
      await db.delete(s.inquiries).where(eq(s.inquiries.projectId, id)); await db.delete(s.projects).where(eq(s.projects.id, id));
    }
    if (users.length) await db.delete(s.authUsers).where(inArray(s.authUsers.id, users));
    await connection.client.end();
  }
});
