import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin="http://127.0.0.1:3100";
test("staff publishes an event, public discovery works, and a story needs student approval",async({page},info)=>{
  test.setTimeout(90000); const c=createDatabase(process.env.TEST_DATABASE_URL!);
  try {
    const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
    const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic Updates Editor",email:`updates-${randomUUID()}@example.test`,password:"test-only-updates-password-long-enough"})}));
    expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};
    const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const split=cookie.indexOf("=");
    await page.context().addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),url:origin,httpOnly:true,sameSite:"Lax"}]);
    await c.db.insert(s.studioRoles).values({userId:user.id,role:"platform_super_admin"});
    await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/admin/updates/new");
    const title=`Synthetic event ${randomUUID()}`;
    await page.getByLabel("Title",{exact:true}).fill(title);await page.getByRole("combobox",{name:"Category",exact:true}).selectOption("event");await page.getByLabel("Excerpt (up to 200 characters)").fill("Test-only event announcement.");await page.getByLabel("Author display name").fill("Synthetic Updates Editor");await page.getByLabel("Body (Markdown)").fill("## Test event\n\nThis content is a browser test fixture.");await page.getByLabel("Event name").fill("Synthetic test gathering");await page.getByLabel("Event date").fill("2026-11-26");await page.getByRole("button",{name:"Publish",exact:true}).click();await expect(page.getByRole("status").first()).toContainText("published");
    await page.goto("/updates?category=event");await expect(page.getByRole("link",{name:title,exact:true})).toBeVisible();const href=await page.getByRole("link",{name:title,exact:true}).getAttribute("href");
    await page.screenshot({path:`test-results/updates-${info.project.name}.png`,fullPage:true});await page.goto(href!);await expect(page.getByRole("heading",{level:1,name:title})).toBeVisible();await expect(page.getByRole("heading",{name:"Event details"})).toBeVisible();await page.screenshot({path:`test-results/article-${info.project.name}.png`,fullPage:true});
    expect(await (await page.request.get("/sitemap.xml")).text()).toContain(href);expect(await (await page.request.get("/updates/rss.xml")).text()).toContain(title);
    const [profile]=await c.db.insert(s.studentProfiles).values({ownerUserId:user.id,publicationStatus:"published",headline:"Test headline",program:"Test program",studentStatus:"current"}).returning();
    await page.goto("/admin/updates/new");await page.getByLabel("Title",{exact:true}).fill(`Synthetic story ${randomUUID()}`);await page.getByRole("combobox",{name:"Category",exact:true}).selectOption("student_success");await page.getByLabel("Student profile ID").fill(profile.id);await page.getByLabel("Excerpt (up to 200 characters)").fill("Test-only student story.");await page.getByLabel("Author display name").fill("Synthetic Updates Editor");await page.getByLabel("Body (Markdown)").fill("A test-only story requiring approval.");await page.getByRole("button",{name:"Publish",exact:true}).click();await expect(page.getByRole("status").first()).toContainText("approve");
    await page.getByRole("button",{name:"Request student approval"}).click();await expect(page.getByRole("status").first()).toContainText("in_review");
    await expect(page).toHaveURL(/\/admin\/updates\/[a-f0-9-]{36}$/);
    const storyId=page.url().split("/").pop()!;const [story]=await c.db.select().from(s.articles).where(eq(s.articles.id,storyId));expect(story.studentApprovedAt).toBeNull();expect(story.status).toBe("in_review");
  } finally {await c.client.end();}
});
