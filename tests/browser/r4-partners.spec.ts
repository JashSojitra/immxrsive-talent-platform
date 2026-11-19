import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
const origin="http://127.0.0.1:3100";
test("R4 public 390px directory, privacy and contextual inquiry",async({page})=>{
 const c=createDatabase(process.env.TEST_DATABASE_URL!);
 try{
  const [company]=await c.db.insert(s.partnerCompanies).values({status:"published",content:{name:`R4 partner ${randomUUID()}`,website:"https://example.org",description:"Public collaboration partner",sector:"XR",location:"Ontario"}}).returning();
  const content={companyId:company.id,title:"Current public study",description:"How the study worked",outcome:"A working prototype",year:2026,date:null,status:"current" as const,visibility:"public" as const,projectIds:[],participantIds:[]};
  await c.db.insert(s.partnerCollaborations).values([{companyId:company.id,content},{companyId:company.id,content:{...content,title:"Past public study",year:2025,status:"past"}},{companyId:company.id,content:{...content,title:"SECRET LIMITED",description:"SECRET",outcome:"SECRET",visibility:"limited"}},{companyId:company.id,content:{...content,title:"SECRET PRIVATE",visibility:"private"}}]);
  await page.setViewportSize({width:390,height:844});await page.goto("/partners");await page.getByRole("link",{name:company.content.name,exact:true}).click();await expect(page.getByRole("heading",{name:"Current public study"})).toBeVisible();await expect(page.getByRole("heading",{name:"Past public study"})).toBeVisible();await expect(page.getByText("Anonymized collaboration",{exact:true})).toBeVisible();expect(await page.content()).not.toContain("SECRET");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole("link",{name:"Discuss a collaboration",exact:true}).click();await expect(page.getByRole("heading",{level:1})).toContainText(company.content.name);
  await page.getByLabel("Company name").fill("Synthetic employer");await page.getByLabel("Contact name").fill("Synthetic contact");await page.getByLabel("Contact email").fill("contact@example.test");await page.getByLabel("Inquiry description").fill("We would like to discuss a research collaboration and a student training prototype.");const submitted = page.waitForResponse(r => r.url().endsWith("/api/v1/inquiries") && r.request().method() === "POST");
  await page.getByRole("button",{name:/submit inquiry/i}).click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON()).toMatchObject({sourceType:"partner",sourceId:company.id});
  const confirmation = await response.json() as {id:string};
  expect(confirmation.id).toMatch(/^[0-9a-f-]{36}$/i);
  const status = page.getByRole("status");
  await expect(status.getByText("Inquiry received",{exact:true})).toBeVisible();
  await expect(status).toContainText(`Your inquiry about ${company.content.name} was submitted successfully. Reference ${confirmation.id}.`);
  const [stored] = await c.db.select().from(s.partnerInquiries).where(eq(s.partnerInquiries.id,confirmation.id));
  expect(stored).toMatchObject({companyId:company.id,sourceName:company.content.name,content:{companyName:"Synthetic employer",contactName:"Synthetic contact",contactEmail:"contact@example.test",description:"We would like to discuss a research collaboration and a student training prototype."}});
 }finally{await c.client.end();}
});
test("partner without an optional website keeps its portfolio and inquiry available", async ({ page }) => {
 const c = createDatabase(process.env.TEST_DATABASE_URL!);
 try {
  const [company] = await c.db.insert(s.partnerCompanies).values({ status:"published", content:{name:`Website optional ${randomUUID()}`,website:"",description:"Published partner with no website",sector:"XR",location:"Ontario"} }).returning();
  expect((await page.goto(`/partners/${company.id}`))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level:1, name:company.content.name, exact:true })).toBeVisible();
  await expect(page.getByText("Company website not listed.", { exact:true })).toBeVisible();
  await expect(page.getByRole("link", { name:"Discuss a collaboration", exact:true })).toHaveAttribute("href", `/inquiry/partner/${company.id}`);
 } finally { await c.client.end(); }
});
for(const width of [1280,768])test(`R4 staff manual draft/publish at ${width}px`,async({page})=>{
 const c=createDatabase(process.env.TEST_DATABASE_URL!);
 try{
  const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
  const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic R4 staff",email:`r4-${randomUUID()}@example.test`,password:"test-only-password-long-enough"})}));expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};
  await c.db.insert(s.studioRoles).values({userId:user.id,role:"xr_admin"});
  const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const sep=cookie.indexOf("=");await page.context().addCookies([{name:cookie.slice(0,sep),value:cookie.slice(sep+1),url:origin,httpOnly:true,sameSite:"Lax"}]);
  await page.setViewportSize({width,height:900});await page.goto("/admin/partners");await expect(page.getByRole("heading",{name:"Partnerships & review tasks"})).toBeVisible();
  const name=`R4 Manual ${randomUUID()}`;await page.getByLabel("name",{exact:true}).fill(name);await page.getByLabel("website",{exact:true}).fill(`https://company-${randomUUID()}.example.org`);await page.getByLabel("description",{exact:true}).first().fill("Manually reviewed partner description");await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByRole("status")).toContainText("Company saved");await page.getByRole("button",{name:"Publish reviewed company"}).click();await expect(page.getByRole("status")).toContainText("Company saved");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.goto("/partners");await expect(page.getByRole("link",{name,exact:true})).toBeVisible();
 }finally{await c.client.end();}
});

for (const width of [1280,768]) test(`R4 student requests require independent staff approval at ${width}px`,async({browser})=>{
 test.setTimeout(60000);
 const c=createDatabase(process.env.TEST_DATABASE_URL!);
 const student=await browser.newContext({viewport:{width:390,height:844}});
 const staff=await browser.newContext({viewport:{width,height:900}});
 const curator=await browser.newContext({viewport:{width,height:900}});
 try {
  // Same synthetic Better Auth session helper pattern as manual-project.spec.ts.
  const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
  async function account(context:typeof student,role?:"xr_admin"|"xr_curator"){
   const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic R4 reviewer",email:`r4-${randomUUID()}@example.test`,password:"test-only-password-long-enough"})}));
   expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};
   if(role)await c.db.insert(s.studioRoles).values({userId:user.id,role});
   const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const sep=cookie.indexOf("=");
   await context.addCookies([{name:cookie.slice(0,sep),value:cookie.slice(sep+1),url:origin,httpOnly:true,sameSite:"Lax"}]);return user.id;
  }
  const userId=await account(student);const reviewer=await account(staff,"xr_admin");await account(curator,"xr_curator");expect(reviewer).not.toBe(userId);
  await c.db.insert(s.studentAffiliations).values({userId,status:"verified",institutionalEmail:`${userId}@algomau.ca`,verifiedAt:new Date()});
  const projectId=randomUUID(),title=`R4 review ${randomUUID()}`;
  await c.db.insert(s.projects).values({id:projectId,title,description:"Synthetic independently reviewed project",domain:"XR",origin:"student",maintainerUserId:userId,publicationStatus:"published"});
  const [company]=await c.db.insert(s.partnerCompanies).values({status:"published",content:{name:`R4 approved partner ${randomUUID()}`,website:"",description:"Synthetic partner",sector:"XR",location:"Ontario"}}).returning();
  for(const context of [student,curator]){
   for(const action of ["companies","collaborations","import","decisions"]){
    const denied=await context.request.post(`${origin}/api/admin/partners/${action}`,{headers:{Origin:origin},data:{}});expect(denied.status()).toBe(403);expect((await denied.json()).error.message).toBeTruthy();
   }
   const p=await context.newPage();await p.goto(`${origin}/admin/partners`);await expect(p.getByRole("button",{name:"Save draft",exact:true})).toHaveCount(0);await expect(p.getByRole("button",{name:"Record staff decision"})).toHaveCount(0);
   if(context===student)await expect(p.getByRole("heading",{name:"Administrator access required"})).toBeVisible();
   else await expect(p.getByRole("heading",{name:"Partnerships & review tasks"})).toBeVisible();
  }
  const sp=await student.newPage();const rp=await staff.newPage();
  for(const kind of ["verification","association"]){
   await sp.goto(`${origin}/student/projects/${projectId}/requests`);await sp.getByLabel("Request type").selectOption(kind);
   if(kind==="association")await sp.getByLabel("Existing company").selectOption(company.id);
   await sp.getByLabel("Explanation / review note").fill(`Synthetic ${kind} evidence`);
   const submitted=sp.waitForResponse(r=>r.url().endsWith("/api/v1/student/partner-requests")&&r.request().method()==="POST");
   await sp.getByRole("button",{name:"Submit for staff review"}).click();expect((await submitted).status()).toBe(200);
   await expect(sp.getByRole("heading",{name:`${kind} — pending`,exact:true})).toBeVisible();
   const publicBefore=await student.request.get(`${origin}/projects/${projectId}`);expect(publicBefore.status()).toBe(200);
   if(kind==="verification")expect(await publicBefore.text()).not.toContain("✓ Official project verification");
   else expect(await publicBefore.text()).not.toContain(`/partners/${company.id}`);
   await rp.goto(`${origin}/admin/partners`);
   const card=rp.locator(`#${kind} article`).filter({has:rp.getByRole("heading",{name:title,exact:true})});
   await card.getByLabel("Decision note").fill("Evidence independently reviewed by synthetic staff");
   const decided=rp.waitForResponse(r=>r.url().endsWith("/api/admin/partners/decisions")&&r.request().method()==="POST");
   await card.getByRole("button",{name:"Record staff decision"}).click();expect((await decided).status()).toBe(200);
   await expect(card).toHaveCount(0);
   expect(await rp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
   await sp.reload();await expect(sp.getByRole("heading",{name:`${kind} — approved`,exact:true})).toBeVisible();
  }
  await sp.goto(`${origin}/projects/${projectId}`);await expect(sp.getByText("✓ Official project verification — approved by staff",{exact:true})).toBeVisible();await expect(sp.getByRole("link",{name:company.content.name,exact:true})).toHaveAttribute("href",`/partners/${company.id}`);
  expect(await sp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 } finally {await student.close();await staff.close();await curator.close();await c.client.end();}
});
