import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test, type BrowserContext } from "@playwright/test";
import { betterAuth } from "better-auth";
import { eq, inArray } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin = "http://127.0.0.1:3100";
test("GitHub suggestions remain editable and duplicate view/join leads through independent contributor consent", async ({ page, browser }, testInfo) => {
  test.setTimeout(100_000); const connection = createDatabase(process.env.TEST_DATABASE_URL!); const db = connection.db;
  const users: string[] = [], ids: string[] = []; let teammate: BrowserContext | undefined;
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
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
    teammate = await browser.newContext({ viewport: page.viewportSize()!, reducedMotion: "reduce" }); const maintainer = await teammate.newPage(); maintainer.on("pageerror", e => errors.push(e.message));
    const owner = await signIn(teammate,"Phase5 Maintainer"), student = await signIn(page.context(),"Phase5 Importer"); const profiles: string[] = [];
    for (const userId of [owner, student]) {
      await db.insert(s.studentAffiliations).values({ userId, institutionalEmail: `${userId}@algomau.ca`, verifiedAt: new Date() });
      const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId:userId, publicationStatus:"published", headline:"Shared XR work",studentStatus:"current",biography:"Synthetic import QA",program:"Computing" }).returning(); profiles.push(profile.id);
    }
    const existing = await maintainer.request.post("/api/v1/student/projects",{headers:{Origin:origin},data:{draft:{title:"Existing Shared Studio",description:"One existing public project",domain:"XR",repositories:[{url:"https://github.com/qa/xr-studio"}]},creatorRoleId:"xr-developer"}});
    expect(existing.status()).toBe(201); const record = await existing.json(); const id = record.project.id; ids.push(id);
    expect((await maintainer.request.post(`/api/v1/student/projects/${id}/publication`,{headers:{Origin:origin},data:{version:1,published:true}})).status()).toBe(200);
    await page.goto("/student/projects/new"); await page.getByLabel("Project title",{exact:true}).fill("My manual draft"); await page.getByLabel("Domain / type").fill("XR");
    await page.getByLabel("Public GitHub repository URL").fill("https://GitHub.com/QA/XR-Studio.git/?tab=readme#top");
    await page.getByRole("button",{name:"Review GitHub suggestions"}).click(); await expect(page.getByLabel("Suggested title")).toHaveValue("XR Studio Suggestions");
    await expect(page.getByLabel("Project title",{exact:true})).toHaveValue("My manual draft");
    await page.getByLabel("Suggested title").fill("Imported Learning Studio"); await page.getByLabel("Suggested short description").fill("I reviewed and edited these suggestions.");
    await expect(page.getByRole("main")).toHaveAttribute("data-motion",/ready|reduced|fallback/);
    await page.screenshot({path:testInfo.outputPath("github-suggestions.png"),fullPage:true});
    page.once("dialog", d => d.accept()); await page.getByRole("button",{name:"Apply reviewed suggestions"}).click();
    await expect(page.getByLabel("Project title",{exact:true})).toHaveValue("Imported Learning Studio"); await expect(page.getByLabel("Project technologies")).toHaveValue("TypeScript, CSS");
    await page.getByRole("button",{name:"Create project",exact:true}).focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading",{name:"Review possible existing projects."})).toBeVisible();
    await expect(page.getByRole("link",{name:"View Project: Existing Shared Studio"})).toHaveAttribute("href",`/projects/${id}`);
    expect(await db.select().from(s.projects).where(eq(s.projects.title,"Imported Learning Studio"))).toEqual([]);
    await page.screenshot({path:testInfo.outputPath("duplicate-warning.png"),fullPage:true});
    const popup = page.waitForEvent("popup"); await page.getByRole("link",{name:"View Project: Existing Shared Studio"}).click(); const view = await popup;
    await expect(view.getByRole("heading",{level:1,name:"Existing Shared Studio"})).toBeVisible(); await view.close();
    await expect(page.getByLabel("Project title",{exact:true})).toHaveValue("Imported Learning Studio");
    await page.getByRole("button",{name:"Request to Join: Existing Shared Studio"}).click(); await expect(page.getByRole("status").filter({hasText:"Request sent."})).toBeVisible();
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(1);
    await maintainer.goto(`/student/projects/${id}/team`); await maintainer.getByLabel("Proposed role for Phase5 Importer").selectOption("frontend-developer"); await maintainer.getByRole("button",{name:"Approve request from Phase5 Importer"}).click();
    await expect(maintainer.getByRole("status")).toHaveText("Join request approved. A private invitation awaits their acceptance.");
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(1);
    // Return to an untouched draft through the browser's private inbox after explicitly leaving it.
    page.once("dialog",d=>d.accept()); await page.goto("/student/project-invitations"); await page.getByRole("link",{name:"Review proposed-role invitation"}).click(); await page.getByRole("button",{name:"Accept invitation",exact:true}).click();
    await expect(page.getByLabel("Your standardized role")).toHaveValue("frontend-developer");
    expect((await (await page.request.get(`/api/v1/projects/${id}`)).json()).contributors).toHaveLength(2);
    for(const profileId of profiles) expect((await (await page.request.get(`/api/v1/students/${profileId}`)).json()).projects.map((p:{id:string})=>p.id)).toContain(id);
    // A distinct creation is still possible after explicit duplicate acknowledgement.
    await page.goto("/student/projects/new"); await page.getByLabel("Project title",{exact:true}).fill("Deliberately distinct studio"); await page.getByLabel("Domain / type").fill("Art");
    await page.getByRole("button",{name:"Add repository",exact:true}).click(); await page.getByLabel("Repository 1 URL").fill("https://github.com/QA/XR-Studio.git");
    await page.getByRole("button",{name:"Create project",exact:true}).click(); await page.getByRole("button",{name:"Continue with a distinct project"}).click(); await expect(page).toHaveURL(/\/student\/projects\/[^/]+\/edit/);
    const distinctId = page.url().split("/").at(-2)!; ids.push(distinctId); expect(distinctId).not.toBe(id);
    // Rate-limited import leaves manually entered information intact and usable.
    await page.goto("/student/projects/new"); await page.getByLabel("Project title",{exact:true}).fill("Manual recovery project"); await page.getByLabel("Domain / type").fill("Training"); await page.getByLabel("Short description").fill("Created without GitHub.");
    await page.getByLabel("Public GitHub repository URL").fill("https://github.com/qa/limited"); await page.getByRole("button",{name:"Review GitHub suggestions"}).click(); await expect(page.getByRole("alert").filter({hasText:"GitHub is limiting requests"})).toBeFocused();
    await expect(page.getByLabel("Project title",{exact:true})).toHaveValue("Manual recovery project"); await page.getByRole("button",{name:"Create project",exact:true}).click(); await expect(page).toHaveURL(/\/student\/projects\/[^/]+\/edit/); ids.push(page.url().split("/").at(-2)!);
    expect((await db.select().from(s.studentProfileSkills).where(eq(s.studentProfileSkills.profileId,profiles[1])))).toEqual([]);
    await page.emulateMedia({reducedMotion:"reduce"}); await page.goto(`/student/projects/${id}/team`);
    await expect(page.getByRole("main")).toHaveAttribute("data-motion",/ready|reduced|fallback/); expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({path:testInfo.outputPath("github-joined-project.png"),fullPage:true}); expect(errors).toEqual([]);
  } finally {
    if (teammate) await teammate.close();
    if(ids.length){
      await db.delete(s.projectJoinRequests).where(inArray(s.projectJoinRequests.projectId,ids)); await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId,ids));
      const members=await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId,ids)); if(members.length)await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId,members.map(m=>m.id)));
      await db.delete(s.projectMemberships).where(inArray(s.projectMemberships.projectId,ids)); await db.delete(s.projectRepositories).where(inArray(s.projectRepositories.projectId,ids)); await db.delete(s.projectLinks).where(inArray(s.projectLinks.projectId,ids)); await db.delete(s.projectMedia).where(inArray(s.projectMedia.projectId,ids)); await db.delete(s.projects).where(inArray(s.projects.id,ids));
    }
    if(users.length)await db.delete(s.authUsers).where(inArray(s.authUsers.id,users)); await connection.client.end();
  }
});
