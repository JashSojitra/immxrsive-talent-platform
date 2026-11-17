import { randomUUID } from "node:crypto";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin = "http://127.0.0.1:3100";
test("anonymous administrator access and forged requests are denied", async ({ page, request }) => {
  await page.goto("/admin"); await expect(page).toHaveURL(/\/admin\/sign-in/); await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
  for (const path of ["/api/admin/projects", "/api/admin/access", "/api/admin/activity", "/api/admin/identity"]) {
    const response = await request.get(path); expect(response.status()).toBe(401); expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
test("staff import, configure, credit, preview and publish without student account", async ({ page }, info) => {
  test.setTimeout(90000);
  const c = createDatabase(process.env.TEST_DATABASE_URL!); const db = c.db;
  try {
    const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
    const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: "Synthetic Administrator", email: `admin-${randomUUID()}@example.test`, password: "test-only-admin-password-long-enough" }) }));
    expect(response.status).toBe(200); const { user } = await response.json() as { user: { id: string } };
    const cookie = response.headers.getSetCookie().find(v => v.split("=", 1)[0].includes("session_token"))!.split(";", 1)[0]; const separator = cookie.indexOf("=");
    await page.context().addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator+1), url: origin, httpOnly: true, sameSite: "Lax" }]);
    await page.goto("/admin"); await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
    // Synthetic role setup exists only in the guarded disposable browser test database.
    await db.insert(s.studioRoles).values({ userId: user.id, role: "platform_super_admin" });
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/admin/projects/new");
    await expect(page.getByRole("heading", { level: 1, name: "Create a project", exact: true })).toBeVisible();
    await expect(page.locator("[data-editor-ready]")).toHaveAttribute("data-editor-ready", "true");
    // goto can finish before the streamed editor hydrates. Once ready, start at
    // the document, without selecting any link or changing the real tab order.
    await page.locator("body").evaluate(body => {
      const previous = body.getAttribute("tabindex");
      body.setAttribute("tabindex", "-1");
      body.focus();
      if (previous === null) body.removeAttribute("tabindex");
      else body.setAttribute("tabindex", previous);
    });
    await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to administration" })).toBeFocused();
    await page.keyboard.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
    await page.keyboard.press("Tab"); await expect(page.getByLabel("Public GitHub repository URL")).toBeFocused();
    await page.getByLabel("Public GitHub repository URL").fill("https://github.com/qa/xr-studio");
    await page.getByRole("button", { name: "Fetch repository suggestions" }).click();
    await page.getByRole("button", { name: "Apply suggestions to empty fields" }).click();
    await expect(page.getByLabel("Summary", { exact: true })).toHaveValue("Public repository metadata for deterministic QA.");
    await expect(page.getByLabel("Full description", { exact: true })).toHaveValue("Public repository metadata for deterministic QA.");
    await expect(page.getByLabel("Technologies (comma separated)")).toHaveValue("TypeScript, CSS");
    await page.getByLabel("Original GitHub repository").fill(`https://github.com/synthetic/admin-${randomUUID()}`);
    const title = `Administrator experience ${randomUUID().slice(0,8)}`;
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Fallback narrative (required to publish)").fill("Synthetic fallback description of the experience.");
    await page.getByLabel("Experience mode").selectOption("embed"); await page.getByLabel("Live experience URL (HTTPS)").fill("https://demo.example.com/experience");
    await page.getByRole("button", { name: "Add contributor credit" }).click();
    await page.getByLabel("Name — credit 1").fill("Descriptive creator"); await page.getByLabel("Project role — credit 1").fill("Developer");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\/edit$/); const id = page.url().split("/").at(-2)!;
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);
    await page.getByRole("link", { name: "Preview saved project", exact: true }).click();
    await expect(page.getByText("Private preview — saved project")).toBeVisible(); await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(await page.locator("iframe").count()).toBe(0);
    await page.route("https://demo.example.com/**", route => route.fulfill({ status: 200, contentType: "text/html", body: "<p>Synthetic experience loaded</p>" }));
    await page.getByRole("button", { name: "Launch embedded experience" }).click();
    await expect(page.locator("iframe")).toHaveAttribute("sandbox", "allow-scripts");
    await expect(page.frameLocator("iframe").getByText("Synthetic experience loaded")).toBeVisible();
    await page.getByRole("button", { name: "Close experience" }).click();
    await expect(page.getByRole("button", { name: "Launch embedded experience" })).toBeFocused();
    await page.unroute("https://demo.example.com/**");
    await page.route("https://demo.example.com/**", route => route.fulfill({ status: 200, headers: { "X-Frame-Options": "DENY" }, contentType: "text/html", body: "<p>Blocked synthetic frame</p>" }));
    await page.getByRole("button", { name: "Launch embedded experience" }).click();
    await expect(page.getByText("Synthetic fallback description of the experience.")).toBeVisible();
    await page.getByRole("button", { name: "Close experience" }).click();
    await page.unroute("https://demo.example.com/**");
    await page.route("https://demo.example.com/**", route => route.abort("failed"));
    await page.getByRole("button", { name: "Launch embedded experience" }).click();
    await expect(page.getByText("Synthetic fallback description of the experience.")).toBeVisible();
    await page.getByRole("link", { name: "Return to editor", exact: true }).click();
    await page.getByRole("button", { name: "Publish directly", exact: true }).click(); await expect(page.getByRole("status")).toContainText("published");
    const publicResponse = await page.request.get(`/api/v1/projects/${id}`); expect(publicResponse.status()).toBe(200); const data = await publicResponse.json();
    expect(data.contributors[0]).toMatchObject({ name: "Descriptive creator", profileUrl: "" }); expect(JSON.stringify(data)).not.toContain(user.id);
    expect(await db.select().from(s.studentProfiles).where(eq(s.studentProfiles.ownerUserId, user.id))).toHaveLength(0);
    expect(await db.select().from(s.projectMemberships).where(eq(s.projectMemberships.projectId, id))).toHaveLength(0);
    await page.goto("/showcase"); await page.getByLabel("Search administrator projects").fill(title); await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
    const targetResponse = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: "Synthetic Curator", email: `curator-${randomUUID()}@example.test`, password: "test-only-curator-password-long-enough" }) }));
    expect(targetResponse.status).toBe(200); const target = await targetResponse.json() as { user: { id: string } };
    await page.goto("/admin/settings/access"); await page.getByLabel("Target internal account ID").fill(target.user.id);
    await page.getByLabel("New role").selectOption("xr_curator"); await page.getByLabel("Reason / approved change reference").fill("Synthetic approved curator grant");
    await page.getByRole("button", { name: "Save access change" }).click(); await expect(page.getByText("Current role: xr_curator", { exact: true })).toBeVisible();
    expect((await db.select().from(s.studioRoles).where(eq(s.studioRoles.userId, target.user.id)))[0].role).toBe("xr_curator");
    await page.getByLabel("New role").selectOption(""); await page.getByLabel("Reason / approved change reference").fill("Synthetic approved curator revocation");
    await page.getByRole("button", { name: "Save access change" }).click(); await expect(page.getByText("Current role: No staff role", { exact: true })).toBeVisible();
    await page.goto(`/admin/projects/${id}/edit`); await page.getByRole("button", { name: "Archive saved project" }).click(); await expect(page.getByRole("status")).toContainText("archived");
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);
    await page.getByRole("button", { name: "Restore as private draft" }).click(); await expect(page.getByRole("status")).toContainText("draft");
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("admin-project-restored.png"), fullPage: true });
    // Revoke while an editor is open, then verify the server rejects its next operation.
    await db.delete(s.studioRoles).where(eq(s.studioRoles.userId, user.id));
    const denied = await page.request.post(`/api/admin/projects/${id}`, { headers: { Origin: origin }, data: { action: "publish", version: 4 } }); expect(denied.status()).toBe(403);
  } finally { await c.client.end(); }
});
