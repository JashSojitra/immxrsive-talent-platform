import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin="http://127.0.0.1:3100";
test("staff publishes an event, public discovery works, and a story needs student approval",async({page},info)=>{
  test.setTimeout(90000); const c=createDatabase(process.env.TEST_DATABASE_URL!);let fixtureUserId:string|undefined;
  try {
    const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
    const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic Updates Editor",email:`updates-${randomUUID()}@example.test`,password:"test-only-updates-password-long-enough"})}));
    expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};fixtureUserId=user.id;
    const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const split=cookie.indexOf("=");
    await page.context().addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),url:origin,httpOnly:true,sameSite:"Lax"}]);
    await c.db.insert(s.studioRoles).values({userId:user.id,role:"platform_super_admin"});
    await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/admin/updates/new");
    const title=`Synthetic event ${randomUUID()}`;
    const cover=page.getByRole("group",{name:"Cover image",exact:true});
    await cover.locator('input[type="file"]').setInputFiles({name:"synthetic-cover.png",mimeType:"image/png",buffer:await sharp({create:{width:800,height:450,channels:3,background:"#582c83"}}).png().toBuffer()});
    await cover.getByRole("button",{name:"Upload image",exact:true}).click();await expect(cover.getByRole("status")).toHaveText("Image saved.");await page.getByLabel("Cover alt text").fill("Test fixture: a plain purple cover");
    await page.getByLabel("Title",{exact:true}).fill(title);await page.getByRole("combobox",{name:"Category",exact:true}).selectOption("event");await page.getByLabel("Excerpt (up to 200 characters)").fill("Test-only event announcement.");await page.getByLabel("Author display name").fill("Synthetic Updates Editor");await page.getByLabel("Body (Markdown)").fill("## Test event\n\nThis content is a browser test fixture.");await page.getByLabel("Event name").fill("Synthetic test gathering");await page.getByLabel("Event date").fill("2026-11-26");await page.getByRole("button",{name:"Publish",exact:true}).click();await expect(page.getByRole("status").first()).toContainText("published");
    await page.goto("/updates?category=event");await expect(page.getByRole("link",{name:title,exact:true})).toBeVisible();const card=page.getByRole("article").filter({has:page.getByRole("heading",{name:title,exact:true})});await expect(card.locator('img[src^="/media/"]')).toBeVisible();const coverBox=await card.locator('a[aria-hidden="true"]').boundingBox();expect(coverBox!.width/coverBox!.height).toBeCloseTo(1.6,1);expect(await card.getByRole("heading").getByRole("link").evaluate(e=>getComputedStyle(e).textDecorationLine)).toBe("none");const href=await page.getByRole("link",{name:title,exact:true}).getAttribute("href");
    await page.screenshot({path:`test-results/updates-${info.project.name}.png`,fullPage:true});await page.goto(href!);await expect(page.getByRole("heading",{level:1,name:title})).toBeVisible();await expect(page.getByRole("heading",{name:"Event details"})).toBeVisible();await page.screenshot({path:`test-results/article-${info.project.name}.png`,fullPage:true});
    expect(await (await page.request.get("/sitemap.xml")).text()).toContain(href);expect(await (await page.request.get("/updates/rss.xml")).text()).toContain(title);
    await page.goto("/");await expect(page.getByRole("heading",{level:3,name:title,exact:true})).toBeVisible();await page.screenshot({path:`test-results/home-published-${info.project.name}.png`,fullPage:true});
    const [profile]=await c.db.insert(s.studentProfiles).values({ownerUserId:user.id,publicationStatus:"published",headline:"Test headline",program:"Test program",studentStatus:"current"}).returning();
    await page.goto("/admin/updates/new");await page.getByLabel("Title",{exact:true}).fill(`Synthetic story ${randomUUID()}`);await page.getByRole("combobox",{name:"Category",exact:true}).selectOption("student_success");await page.getByLabel("Student profile ID").fill(profile.id);await page.getByLabel("Excerpt (up to 200 characters)").fill("Test-only student story.");await page.getByLabel("Author display name").fill("Synthetic Updates Editor");await page.getByLabel("Body (Markdown)").fill("A test-only story requiring approval.");await page.getByRole("button",{name:"Publish",exact:true}).click();await expect(page.getByRole("status").first()).toContainText("approve");
    await page.getByRole("button",{name:"Request student approval"}).click();await expect(page.getByRole("status").first()).toContainText("in_review");
    await expect(page).toHaveURL(/\/admin\/updates\/[a-f0-9-]{36}$/);
    const storyId=page.url().split("/").pop()!;const [story]=await c.db.select().from(s.articles).where(eq(s.articles.id,storyId));expect(story.studentApprovedAt).toBeNull();expect(story.status).toBe("in_review");
    await page.goto("/student/dashboard");await page.getByText(story.title,{exact:true}).click();await expect(page.getByText("A test-only story requiring approval.",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Approve",exact:true}).click();await expect(page.getByText("No stories are waiting for your approval.")).toBeVisible();
    await page.goto(`/admin/updates/${story.id}`);await page.getByRole("button",{name:"Publish",exact:true}).click();await expect(page.getByRole("status").first()).toContainText("published");
    await page.goto(`/updates/${story.slug}`);await expect(page.getByRole("link",{name:"View portfolio",exact:true})).toHaveAttribute("href",`/students/${profile.id}`);await page.getByRole("link",{name:"View portfolio",exact:true}).click();await expect(page.getByRole("link",{name:`Featured story: ${story.title}`})).toHaveAttribute("href",`/updates/${story.slug}`);
    await page.goto("/");await expect(page.getByRole("list",{name:"Student stories"}).getByRole("link",{name:"Read the story"})).toBeVisible();await page.screenshot({path:`test-results/home-published-${info.project.name}.png`,fullPage:true});
  } finally {if(fixtureUserId) await c.db.update(s.studentProfiles).set({publicationStatus:"unpublished"}).where(eq(s.studentProfiles.ownerUserId,fixtureUserId));await c.client.end();}
});
