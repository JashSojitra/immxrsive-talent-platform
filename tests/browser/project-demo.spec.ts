import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test, type BrowserContext } from "@playwright/test";
import { betterAuth } from "better-auth";
import { inArray } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin="http://127.0.0.1:3100";
test("official playable fixture interacts inside an isolated frame while fallback and navigation survive failures",async({page},testInfo)=>{
  test.setTimeout(140_000);const connection=createDatabase(process.env.TEST_DATABASE_URL!);const db=connection.db;const users:string[]=[],ids:string[]=[];const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
    const auth = betterAuth({ baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters", database: drizzleAdapter(db, { provider: "pg", schema: { user: s.authUsers, session: s.authSessions, account: s.authAccounts, verification: s.authVerifications } }), emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" } });
    async function signIn(context: BrowserContext, label: string) {
      const response = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ name: label, email: `project-${Date.now()}-${Math.random()}@example.test`, password: "browser-only-project-password-long-enough" }) }));
      expect(response.status).toBe(200); const { user } = await response.json() as { user: { id: string } }; users.push(user.id);
      const raw = response.headers.getSetCookie().find(cookie => cookie.split("=", 1)[0].includes("session_token"))!;
      const cookie = raw.split(";", 1)[0]; const separator = cookie.indexOf("=");
      await context.addCookies([{ name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
      return user.id;
    }
    const userId=await signIn(page.context(),"Phase6 Demo Student");
    await db.insert(s.studentAffiliations).values({userId,institutionalEmail:`${userId}@algomau.ca`,verifiedAt:new Date()});
    const [profile]=await db.insert(s.studentProfiles).values({ownerUserId:userId,publicationStatus:"published",headline:"Demonstrating playable evidence",studentStatus:"current",biography:"Synthetic demo QA",program:"Computing"}).returning();
    const baseMedia=[{kind:"playable",url:"/fixtures/r3/working_demo.html",label:"Course interactive demo"},{kind:"video",url:"https://qa.github.io/video.mp4",label:"Video walkthrough",altText:"Video narration of the project"},{kind:"source",url:"https://github.com/example/demo",label:"Project source"},{kind:"fallback_image",url:"/fixtures/r3/fallback.svg",label:"Course fallback",altText:"Alternate evidence for the interactive course fixture"},{kind:"fallback_link",url:"https://example.com/evidence",label:"Written evidence"}];
    const created=await page.request.post("/api/v1/student/projects",{headers:{Origin:origin},data:{draft:{title:"R3 Demo and Fallback QA",description:"Playable fixture with independent resilient evidence",domain:"XR",technologies:["HTML","JavaScript"],media:baseMedia},creatorRoleId:"xr-developer"}});
    expect(created.status()).toBe(201);const initial=await created.json();const id=initial.project.id;ids.push(id);
    expect((await page.request.post(`/api/v1/student/projects/${id}/publication`,{headers:{Origin:origin},data:{version:1,published:true}})).status()).toBe(200);
    const fixtureResponse=await page.request.get("/fixtures/r3/working_demo.html");expect(fixtureResponse.status()).toBe(200);expect(fixtureResponse.headers()["content-security-policy"]).toContain("sandbox allow-scripts");expect(fixtureResponse.headers()["content-security-policy"]).not.toContain("allow-same-origin");
    expect((await page.request.get("/fixtures/r3/fallback.svg")).status()).toBe(200);
    let demoRequests=0;page.on("request",r=>{if(r.url().endsWith("/fixtures/r3/working_demo.html"))demoRequests++;});
    await page.goto(`/projects/${id}`);await expect(page.getByRole("heading",{name:"R3 Demo and Fallback QA",exact:true})).toBeVisible();
    expect(page.frames()).toHaveLength(1);expect(demoRequests).toBe(0);await expect(page.getByRole("link",{name:/View Source/})).toHaveAttribute("href","https://github.com/example/demo");
    const play=page.getByRole("button",{name:"Play Demo / Launch Experience",exact:true});await play.focus();await page.keyboard.press("Enter");
    const iframe=page.getByTitle("R3 Demo and Fallback QA playable demo");await expect(iframe).toHaveAttribute("sandbox","allow-scripts");await expect(iframe).toHaveAttribute("referrerpolicy","no-referrer");
    const embedded=page.frameLocator('iframe[title="R3 Demo and Fallback QA playable demo"]');await embedded.getByRole("button",{name:"Interact",exact:true}).focus();await page.keyboard.press("Enter");await expect(embedded.locator("#status")).toHaveText("Interactions: 1");await embedded.getByRole("button",{name:"Interact",exact:true}).click();await expect(embedded.locator("#status")).toHaveText("Interactions: 2");
    expect(await iframe.evaluate((element)=>{try{return (element as HTMLIFrameElement).contentWindow!.document.body.textContent;}catch{return "parent-access-denied";}})).toBe("parent-access-denied");
    await expect(page.getByRole("status").filter({hasText:"does not confirm the demo works"})).toBeVisible();
    await page.getByRole("button",{name:"Retry demo",exact:true}).click();await expect(embedded.locator("#status")).toHaveText("Ready.");
    await page.getByRole("button",{name:"Stop / Close demo",exact:true}).click();await expect(iframe).toHaveCount(0);await expect(play).toBeFocused();
    await page.getByRole("button",{name:"View Fallback",exact:true}).click();const fallback=page.getByAltText("Alternate evidence for the interactive course fixture");await expect(fallback).toBeVisible();expect(await fallback.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.route("https://qa.github.io/video.mp4",route=>route.abort("failed"));await page.getByRole("button",{name:"Watch Demo",exact:true}).click();await expect(page.getByRole("link",{name:"Open video evidence 1 (new tab)"})).toBeVisible();
    const video=page.locator("video");await expect(video).toHaveAttribute("preload","none");await expect(video).not.toHaveAttribute("autoplay","");await page.getByRole("button",{name:"Close video evidence",exact:true}).click();
    // Each failure uses a safe external HTTPS URL and browser transport control,
    // never a production request or a server-side probe.
    async function replaceMedia(media:unknown){const current=await(await page.request.get(`/api/v1/student/projects/${id}`)).json();expect((await page.request.patch(`/api/v1/student/projects/${id}`,{headers:{Origin:origin},data:{version:current.project.version,draft:{...current.draft,media}}})).status()).toBe(200);await page.goto(`/projects/${id}`);}
    await page.route("https://qa.github.io/unavailable",route=>route.abort("namenotresolved"));await replaceMedia([{...baseMedia[0],url:"https://qa.github.io/unavailable"},baseMedia[3]]);await play.click();await expect(page.getByRole("link",{name:/Open Externally/})).toHaveAttribute("href","https://qa.github.io/unavailable");await expect(page.getByRole("heading",{name:"R3 Demo and Fallback QA",exact:true})).toBeVisible();await expect(page.getByAltText("Alternate evidence for the interactive course fixture")).toBeVisible();await page.getByRole("button",{name:"Stop / Close demo",exact:true}).click();
    await page.route("https://qa.github.io/blocked",route=>route.fulfill({status:200,contentType:"text/html",headers:{"X-Frame-Options":"DENY","Content-Security-Policy":"frame-ancestors 'none'"},body:"<!doctype html><h1>Forbidden frame sentinel</h1>"}));
    await replaceMedia([{...baseMedia[0],url:"https://qa.github.io/blocked"},baseMedia[3]]);await play.click();await expect(page.getByRole("link",{name:/Open Externally/})).toBeVisible();
    await expect(page.frameLocator('iframe').getByRole("heading",{name:"Forbidden frame sentinel"})).toHaveCount(0);
    await expect(page.getByRole("status").filter({hasText:/does not confirm|Loading the demo/})).toBeVisible();await page.getByRole("button",{name:"Stop / Close demo",exact:true}).click();
    await page.route("https://qa.github.io/slow",async route=>{await new Promise(resolve=>setTimeout(resolve,12_000));await route.fulfill({contentType:"text/html",body:"<!doctype html><h1>Late response</h1>"}).catch(()=>{});});
    await replaceMedia([{...baseMedia[0],url:"https://qa.github.io/slow"},baseMedia[3]]);await play.click();await expect(page.getByRole("status").filter({hasText:"may be slow"})).toBeVisible({timeout:11_500});await page.getByRole("button",{name:"Stop / Close demo",exact:true}).click();await expect(page.locator("iframe")).toHaveCount(0);
    await page.route("https://qa.github.io/missing.svg",route=>route.fulfill({status:404,contentType:"text/plain",body:"Missing"}));await replaceMedia([{...baseMedia[3],url:"https://qa.github.io/missing.svg"}]);await page.getByRole("button",{name:"View Fallback",exact:true}).click();await expect(page.getByText(/fallback media could not be displayed/)).toBeVisible();await expect(page.getByRole("link",{name:/Open fallback evidence/})).toBeVisible();
    await expect(page.getByText("XR Developer",{exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Talent",exact:true})).toBeVisible();
    await page.emulateMedia({reducedMotion:"reduce"});await replaceMedia(baseMedia);await expect(page.getByRole("main")).toHaveAttribute("data-motion","reduced");
    await page.getByRole("button",{name:"View Fallback",exact:true}).click();await expect(page.getByAltText("Alternate evidence for the interactive course fixture")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({path:testInfo.outputPath("demo-fallback.png"),fullPage:true});await testInfo.attach("disposable-qa-project",{body:JSON.stringify({id,title:"R3 Demo and Fallback QA",url:`/projects/${id}`,playable:"/fixtures/r3/working_demo.html",fallback:"/fixtures/r3/fallback.svg"}),contentType:"application/json"});
    await page.goto(`/students/${profile.id}`);await expect(page.getByRole("link",{name:/R3 Demo and Fallback QA/})).toHaveAttribute("href",`/projects/${id}`);
    const current=await(await page.request.get(`/api/v1/student/projects/${id}`)).json();expect((await page.request.post(`/api/v1/student/projects/${id}/publication`,{headers:{Origin:origin},data:{version:current.project.version,published:false}})).status()).toBe(200);
    expect((await page.request.get(`/api/v1/projects/${id}`)).status()).toBe(404);const hidden=await(await page.request.get(`/projects/${id}`)).text();expect(hidden).not.toContain("working_demo.html");expect(hidden).not.toContain("Alternate evidence for the interactive course fixture");expect(hidden).toContain("noindex");expect((await(await page.request.get(`/api/v1/students/${profile.id}`)).json()).projects).toEqual([]);
    expect(errors).toEqual([]);
  }finally{
    if(ids.length){await db.delete(s.projectJoinRequests).where(inArray(s.projectJoinRequests.projectId,ids));await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId,ids));const members=await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId,ids));if(members.length)await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId,members.map(m=>m.id)));await db.delete(s.projectMemberships).where(inArray(s.projectMemberships.projectId,ids));await db.delete(s.projectMedia).where(inArray(s.projectMedia.projectId,ids));await db.delete(s.projectRepositories).where(inArray(s.projectRepositories.projectId,ids));await db.delete(s.projectLinks).where(inArray(s.projectLinks.projectId,ids));await db.delete(s.projects).where(inArray(s.projects.id,ids));}
    if(users.length)await db.delete(s.authUsers).where(inArray(s.authUsers.id,users));await connection.client.end();
  }
});
