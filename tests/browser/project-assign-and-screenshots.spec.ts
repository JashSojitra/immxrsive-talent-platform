import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test, type BrowserContext } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin = "http://127.0.0.1:3100";
// Scoped captures exclude the sticky site header outside the captured panel.
const captureStyle = "body > header, a[href='#project-workspace'] { visibility: hidden !important; }";
test("staff credit statuses, student credit card, screenshot uploads and public lightbox", async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const c = createDatabase(process.env.TEST_DATABASE_URL!); const db = c.db; const contexts: BrowserContext[] = []; const owners: string[] = [];
  try {
    const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
    async function identity(name: string, target: BrowserContext) {
      const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ name, email: `${randomUUID()}@example.test`, password: "disposable-browser-fixture-password" }) }));
      expect(response.status).toBe(200); const { user } = await response.json(); owners.push(user.id);
      const cookie = response.headers.getSetCookie().find(v => v.split("=", 1)[0].includes("session_token"))!.split(";", 1)[0]; const split = cookie.indexOf("=");
      await target.addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
      return user as { id: string };
    }
    const staff = await identity("Fixture project administrator", page.context()); await db.insert(s.studioRoles).values({ userId: staff.id, role: "platform_super_admin" });
    const studentContext = await browser.newContext({ viewport: info.project.name === "desktop" ? { width: 1280, height: 900 } : { width: 390, height: 844 }, reducedMotion: "reduce" }); contexts.push(studentContext);
    const student = await identity("Published fixture student", studentContext);
    const verifiedEmail = `${randomUUID()}@algomau.ca`; await db.insert(s.studentAffiliations).values({ userId: student.id, institutionalEmail: verifiedEmail, verifiedAt: new Date() });
    const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: student.id, publicationStatus: "published", headline: "Test-only XR designer", studentStatus: "current" }).returning();
    const privateUser = randomUUID(); owners.push(privateUser); await db.insert(s.authUsers).values({ id: privateUser, name: "Private fixture student", email: `${privateUser}@example.test` });
    const privateEmail = `${randomUUID()}@algomau.ca`; await db.insert(s.studentAffiliations).values({ userId: privateUser, institutionalEmail: privateEmail, verifiedAt: new Date() }); await db.insert(s.studentProfiles).values({ ownerUserId: privateUser });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/admin/projects/new");
    await expect(page.locator('[data-editor-ready="true"]')).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(`Immersive project — browser fixture ${info.project.name}`);
    await page.getByLabel("Summary", { exact: true }).fill("A disposable fixture for project credits and screenshots.");
    await page.getByLabel("Full description", { exact: true }).fill("Local browser fixture only. No production content."); await page.getByLabel("Fallback narrative (required to publish)").fill("Test-only project narrative.");
    const futureEmail = `future-${randomUUID()}@algomau.ca`;
    await page.getByLabel("Bulk add credits (email, role)").fill(`${verifiedEmail}, Designer\n${privateEmail}, Developer\n${futureEmail}, Researcher`);
    await page.getByRole("button", { name: "Add pasted credits" }).click();
    for (const [i,name] of ["Published fixture student", "Private fixture student", "Future fixture student"].entries()) await page.getByLabel(`Name — credit ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole("button", { name: "Publish directly", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[a-f0-9-]{36}\/edit$/); await page.reload();
    const projectId = page.url().split('/')[5];
    const creditGroup = page.getByRole("group", { name: "Descriptive contributor credits" });
    await expect(creditGroup).toContainText("Linked to Published fixture student"); await expect(creditGroup).toContainText("Profile not public yet"); await expect(creditGroup).toContainText("Waiting for this student to join");
    await creditGroup.screenshot({ style: captureStyle, path: `test-results/admin-credit-statuses-${info.project.name}.png` });
    const adminShots = page.getByRole("region", { name: "Screenshots", exact: true });
    const file = await sharp({ create: { width: 1000, height: 650, channels: 3, background: "#582c83" } }).png().toBuffer();
    await adminShots.locator('input[type="file"]').setInputFiles([{ name: "studio-fixture.png", mimeType: "image/png", buffer: file }, { name: "detail-fixture.png", mimeType: "image/png", buffer: await sharp({ create: { width: 1000, height: 650, channels: 3, background: "#e31c79" } }).png().toBuffer() }]);
    await adminShots.getByRole("button", { name: "Upload screenshots" }).click(); await expect(adminShots.getByRole("status")).toContainText("alt description");
    await adminShots.getByLabel("Alt text for selected image 1").fill("Purple interface test graphic"); await adminShots.getByLabel("Caption for selected image 1").fill("Test-only studio overview");
    await adminShots.getByLabel("Alt text for selected image 2").fill("Pink detail test graphic"); await adminShots.getByRole("button", { name: "Upload screenshots" }).click(); await expect(adminShots.getByRole("status")).toHaveText("Screenshots uploaded.");
    await adminShots.getByRole("button", { name: "Move screenshot 2 earlier" }).focus(); await page.keyboard.press("Enter"); await expect(adminShots.getByRole("status")).toHaveText("Screenshots saved."); await expect(adminShots.getByLabel("Screenshot 1 alt text")).toHaveValue("Pink detail test graphic");
    const visitor = await browser.newContext({ viewport: info.project.name === "desktop" ? { width: 1280, height: 900 } : { width: 390, height: 844 }, reducedMotion: "reduce" }); contexts.push(visitor); const publicPage = await visitor.newPage();
    await publicPage.goto(`${origin}/projects/${projectId}`); const gallery = publicPage.getByRole("region", { name: "Project screenshots", exact: true });
    await expect(gallery.getByRole("button", { name: "Open screenshot 1: Pink detail test graphic" })).toBeVisible(); await gallery.screenshot({ path: `test-results/public-gallery-${info.project.name}.png` });
    const publicApi = await (await publicPage.request.get(`${origin}/api/v1/projects/${projectId}`)).text();
    for (const email of [verifiedEmail, privateEmail, futureEmail]) { expect(publicApi).not.toContain(email); expect(await publicPage.content()).not.toContain(email); }
    await expect(publicPage.getByRole("link", { name: /Published fixture student/ })).toHaveAttribute("href", `/students/${profile.id}`); await expect(publicPage.getByRole("link", { name: /Private fixture student/ })).toHaveCount(0);
    const open = gallery.getByRole("button", { name: "Open screenshot 1: Pink detail test graphic" }); await open.click(); const dialog = publicPage.getByRole("dialog"); await expect(dialog).toBeVisible();
    await publicPage.keyboard.press("ArrowRight"); await expect(dialog.getByRole("heading")).toHaveText("Screenshot 2 of 2"); await publicPage.keyboard.press("ArrowLeft"); await expect(dialog.getByRole("heading")).toHaveText("Screenshot 1 of 2");
    for (let i = 0; i < 5; i++) { await publicPage.keyboard.press("Tab"); expect(await dialog.evaluate(d => d.contains(document.activeElement))).toBe(true); }
    await publicPage.screenshot({ path: `test-results/public-lightbox-${info.project.name}.png` }); await publicPage.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(open).toBeFocused();
    const studentPage = await studentContext.newPage(); await studentPage.goto(`${origin}/student/dashboard`); const credits = studentPage.getByRole("region", { name: "Projects you're credited on" }); await expect(credits).toContainText("Designer"); await credits.screenshot({ style: captureStyle, path: `test-results/student-credit-card-${info.project.name}.png` });
    await studentPage.goto(`${origin}/student/projects/new`); await studentPage.getByLabel("Project title", { exact: true }).fill(`Screenshot editing fixture ${randomUUID()}`); await studentPage.getByLabel("Domain / type").fill("XR"); await studentPage.getByLabel("Short description").fill("Test-only screenshot editor project."); await studentPage.getByRole("button", { name: "Create project", exact: true }).click(); await expect(studentPage).toHaveURL(/\/student\/projects\/[a-f0-9-]{36}\/edit$/);
    const studentShots = studentPage.getByRole("region", { name: "Screenshots", exact: true }); await studentShots.locator('input[type="file"]').setInputFiles({ name: "student-fixture.png", mimeType: "image/png", buffer: file }); await studentShots.getByLabel("Alt text for selected image 1").fill("Student project test graphic"); await studentShots.getByRole("button", { name: "Upload screenshots" }).click(); await expect(studentShots.getByRole("status")).toHaveText("Screenshots uploaded."); await studentShots.screenshot({ style: captureStyle, path: `test-results/student-screenshots-editor-${info.project.name}.png` });
    expect(await studentPage.getByText(/The hosted course example/).count()).toBe(0); studentPage.once("dialog", dialog => dialog.accept()); await studentShots.getByRole("button", { name: "Delete screenshot 1" }).click(); await expect(studentShots.locator("ol li")).toHaveCount(0);
  } finally {
    for (const owner of owners) await db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.ownerUserId, owner));
    for (const context of contexts) await context.close(); await c.client.end();
  }
});
