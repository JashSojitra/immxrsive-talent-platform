import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test, type BrowserContext } from "@playwright/test";
import { betterAuth } from "better-auth";
import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin = "http://127.0.0.1:3100";
test("independent students consent, own their evidence, restore relationships and transfer maintenance", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const connection = createDatabase(process.env.TEST_DATABASE_URL!); const db = connection.db;
  const users: string[] = [], ids: string[] = []; let teammate: BrowserContext | undefined;
  const pageErrors: string[] = []; page.on("pageerror", e => pageErrors.push(e.message));
  try {
    const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
    async function signIn(context: BrowserContext, label: string) {
      const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: label, email: `project-${Date.now()}-${Math.random()}@example.test`, password: "browser-only-project-password-long-enough" }) }));
      expect(response.status).toBe(200); const { user } = await response.json() as { user: { id: string } }; users.push(user.id);
      const raw = response.headers.getSetCookie().find(cookie => cookie.split("=", 1)[0].includes("session_token"))!;
      const cookie = raw.split(";", 1)[0]; const separator = cookie.indexOf("=");
      await context.addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
      return user.id;
    }
    teammate = await browser.newContext({ viewport: page.viewportSize()!, reducedMotion: "reduce" });
    const other = await teammate.newPage(); other.on("pageerror", e => pageErrors.push(e.message));
    const a = await signIn(page.context(), "Phase4 Maintainer"); const b = await signIn(teammate, "Phase4 Contributor");
    const profiles: string[] = [];
    for (const user of [a,b]) {
      await db.insert(s.studentAffiliations).values({ userId: user, institutionalEmail: `${user}@algomau.ca`, verifiedAt: new Date() });
      const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: user, publicationStatus: "published", studentStatus: "current", headline: "Phase4 shared XR evidence", biography: "Synthetic contributor QA profile", program: "Computing" }).returning(); profiles.push(profile.id);
    }
    async function create(title: string) {
      const response = await page.request.post("/api/v1/student/projects", { headers: { Origin: origin }, data: { draft: { title, description: "A canonical shared student project", domain: "XR", technologies: ["Unity"] }, creatorRoleId: "xr-developer" } });
      expect(response.status()).toBe(201); const data = await response.json(); ids.push(data.project.id);
      expect((await page.request.post(`/api/v1/student/projects/${data.project.id}/publication`, { headers: { Origin: origin }, data: { version: 1, published: true } })).status()).toBe(200);
      return data.project.id as string;
    }
    const id = await create("Phase4 Shared Studio"); const teamUrl = `/student/projects/${id}/team`;
    await page.goto(`/student/projects/${id}/edit`); await page.getByRole("link", { name: "Contribution & team", exact: true }).click();
    await page.getByLabel("Student name or shared profile ID").fill(profiles[1]);
    await page.getByRole("button", { name: "Find students" }).click();
    await page.getByLabel("Proposed standardized role").selectOption("software-developer");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByRole("status")).toHaveText("Invitation sent. They decide whether to accept.");
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(1);
    await other.goto("/student/dashboard"); await other.getByRole("link", { name: "Project invitations", exact: true }).click();
    await other.getByRole("link", { name: "Review invitation", exact: true }).click();
    await expect(other.getByText(/featured by default/)).toBeVisible();
    await expect(other.getByText("Software Developer", { exact: true })).toBeVisible();
    await other.getByRole("button", { name: "Accept invitation", exact: true }).focus(); await other.keyboard.press("Enter");
    await expect(other.getByLabel(/Your contribution statement/)).toBeVisible();
    await other.getByLabel("Your standardized role").selectOption("ui-ux-designer");
    const statement = "I designed the spatial interface, tested interactions and made the experience legible. " + "InteractionEvidence".repeat(16);
    await other.getByLabel(/Your contribution statement/).fill(statement);
    await other.getByRole("button", { name: "Save my contribution" }).click();
    await expect(other.getByRole("status")).toHaveText("Personal contribution saved.");
    for (const profile of profiles) {
      const publicProfile = await (await page.request.get(`/api/v1/students/${profile}`)).json();
      expect(publicProfile.projects.map((p: { id: string }) => p.id)).toEqual([id]); expect(publicProfile.skills).not.toContain("Unity");
      await other.goto(`/students/${profile}`); await expect(other.getByRole("link", { name: /Phase4 Shared Studio/ })).toHaveAttribute("href", `/projects/${id}`);
    }
    await other.goto(`/projects/${id}`); await expect(other.getByText(statement, { exact: true })).toBeVisible();
    await expect(other.getByText("UI/UX Designer", { exact: true })).toBeVisible();
    await other.goto(teamUrl);
    // Real stale contribution write from another session. Browser input must survive.
    const current = await (await other.request.get(`/api/v1/student/projects/${id}/team`)).json();
    const own = current.members[0];
    expect((await page.request.patch(`/api/v1/student/project-memberships/${own.id}/contribution`, { headers: { Origin: origin }, data: { version: own.contribution.version, contribution: { roleId: "xr-developer", statement: "forged", featured: true, publicVisible: true } } })).status()).toBe(403);
    expect((await other.request.patch(`/api/v1/student/project-memberships/${own.id}/contribution`, { headers: { Origin: origin }, data: { version: own.contribution.version, contribution: { roleId: "ui-ux-designer", statement, featured: true, publicVisible: true } } })).status()).toBe(200);
    await other.getByLabel(/Your contribution statement/).fill("My unsaved words"); await other.getByRole("button", { name: "Save my contribution" }).click();
    await expect(other.getByRole("alert", { name: "Team change not saved" })).toBeFocused();
    await expect(other.getByLabel(/Your contribution statement/)).toHaveValue("My unsaved words");
    other.once("dialog", d => d.dismiss()); await other.getByRole("button", { name: "Load latest project team" }).click();
    await expect(other.getByLabel(/Your contribution statement/)).toHaveValue("My unsaved words");
    other.once("dialog", d => d.accept()); await other.getByRole("button", { name: "Load latest project team" }).click();
    await expect(other.getByLabel(/Your contribution statement/)).toHaveValue(statement);
    await other.getByLabel("Feature this project in my portfolio").uncheck(); await other.getByRole("button", { name: "Save my contribution" }).click();
    await expect(other.getByRole("status")).toHaveText("Personal contribution saved.");
    expect((await (await other.request.get(`/api/v1/students/${profiles[1]}`)).json()).projects).toEqual([]);
    expect((await (await other.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(2);
    await other.getByLabel("Allow my public project attribution").uncheck(); await other.getByRole("button", { name: "Save my contribution" }).click();
    await expect(other.getByRole("status")).toHaveText("Personal contribution saved.");
    expect((await (await other.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(1);
    await page.goto(teamUrl); await page.getByLabel("Removal reason (optional, visible to that contributor)").fill("Review shared attribution");
    page.once("dialog", d => d.accept()); await page.getByRole("button", { name: "Remove Phase4 Contributor", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Contributor removed reversibly.");
    await other.reload(); await expect(other.getByRole("heading", { name: "Your relationship was removed." })).toBeVisible();
    await expect(other.getByText("Reason: Review shared attribution")).toBeVisible();
    page.once("dialog", d => d.accept()); await page.getByRole("button", { name: "Restore Phase4 Contributor", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Contributor restored with their original evidence.");
    await other.reload(); await expect(other.getByLabel(/Your contribution statement/)).toHaveValue(statement);
    await expect(other.getByLabel("Feature this project in my portfolio")).not.toBeChecked(); await expect(other.getByLabel("Allow my public project attribution")).not.toBeChecked();
    await other.getByLabel("Feature this project in my portfolio").check(); await other.getByLabel("Allow my public project attribution").check(); await other.getByRole("button", { name: "Save my contribution" }).click();
    await expect(other.getByRole("status")).toHaveText("Personal contribution saved.");
    await db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.id, profiles[1]));
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(1);
    await db.update(s.studentProfiles).set({ publicationStatus: "published" }).where(eq(s.studentProfiles.id, profiles[1]));
    page.once("dialog", d => d.accept()); await page.getByRole("button", { name: "Offer maintenance to Phase4 Contributor", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Maintenance offered. The contributor must consent.");
    await other.reload(); await other.getByRole("button", { name: "Decline maintenance", exact: true }).click();
    await expect(other.getByRole("status")).toHaveText("Maintenance offer declined.");
    await page.reload(); page.once("dialog", d => d.accept()); await page.getByRole("button", { name: "Offer maintenance to Phase4 Contributor", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Maintenance offered. The contributor must consent.");
    await other.reload(); other.once("dialog", d => d.accept()); await other.getByRole("button", { name: "Accept maintenance", exact: true }).click();
    await expect(other.getByRole("status")).toHaveText("Maintenance accepted. The canonical project is unchanged.");
    await expect(other.getByRole("link", { name: "Edit shared project", exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByRole("link", { name: "Edit shared project", exact: true })).toHaveCount(0);
    const now = await (await other.request.get(`/api/v1/student/projects/${id}`)).json();
    expect((await page.request.patch(`/api/v1/student/projects/${id}`, { headers: { Origin: origin }, data: { version: now.project.version, draft: now.draft } })).status()).toBe(403);
    expect((await other.request.patch(`/api/v1/student/projects/${id}`, { headers: { Origin: origin }, data: { version: now.project.version, draft: { ...now.draft, title: "Phase4 Shared Studio transferred" } } })).status()).toBe(200);
    expect((await (await other.request.get(`/api/v1/projects/${id}`)).json()).id).toBe(id);
    await other.goto("/student/profile/edit");
    expect(await other.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(other.viewportSize()!.width);
    await other.getByRole("link", { name: "My Projects", exact: true }).click();
    await expect(other.getByRole("link", { name: "Phase4 Shared Studio transferred", exact: true })).toBeVisible();
    await other.goto(teamUrl);
    await expect(other.getByRole("main")).toHaveAttribute("data-motion", /ready|reduced|fallback/);
    expect(await other.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(other.viewportSize()!.width);
    await other.screenshot({ path: testInfo.outputPath("contributor-team.png"), fullPage: true });
    // Same two independent accounts, second project: decline leaves no contribution.
    const declinedId = await create("Phase4 Declined Studio");
    await page.goto(`/student/projects/${declinedId}/team`); await page.getByLabel("Student name or shared profile ID").fill(profiles[1]); await page.getByRole("button", { name: "Find students" }).click();
    await page.getByRole("button", { name: "Send invitation" }).click(); await expect(page.getByRole("status")).toHaveText("Invitation sent. They decide whether to accept.");
    await other.goto("/student/project-invitations"); await other.getByRole("link", { name: "Review invitation", exact: true }).click(); await other.getByRole("button", { name: "Decline invitation", exact: true }).click();
    await expect(other.getByRole("heading", { name: "You declined this invitation." })).toBeVisible();
    expect((await (await other.request.get(`/api/v1/projects/${declinedId}`)).json()).contributors).toHaveLength(1);
    expect((await db.select().from(s.projects).where(eq(s.projects.id, id)))).toHaveLength(1);
    expect(pageErrors).toEqual([]);
  } finally {
    if (teammate) await teammate.close();
    if (ids.length) {
      await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId, ids));
      const members = await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      if (members.length) await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId, members.map(m => m.id)));
      await db.delete(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      await db.delete(s.projectTechnologies).where(inArray(s.projectTechnologies.projectId, ids));
      await db.delete(s.projectRepositories).where(inArray(s.projectRepositories.projectId, ids));
      await db.delete(s.projectLinks).where(inArray(s.projectLinks.projectId, ids)); await db.delete(s.projectMedia).where(inArray(s.projectMedia.projectId, ids));
      await db.delete(s.projects).where(inArray(s.projects.id, ids));
    }
    if (users.length) await db.delete(s.authUsers).where(inArray(s.authUsers.id, users)); await connection.client.end();
  }
});
