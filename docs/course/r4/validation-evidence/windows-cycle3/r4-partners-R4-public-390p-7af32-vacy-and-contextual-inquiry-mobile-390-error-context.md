# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: r4-partners.spec.ts >> R4 public 390px directory, privacy and contextual inquiry
- Location: tests\browser\r4-partners.spec.ts:8:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/inquiry submitted/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/inquiry submitted/i) with timeout 5000ms
  - waiting for getByText(/inquiry submitted/i)

```

```yaml
- main:
  - link "Skip to inquiry form":
    - /url: "#inquiry-form"
  - link "NOT ImmXrsive talent directory home":
    - /url: /talent
    - img "NOT ImmXrsive"
  - navigation "Primary navigation":
    - link "Partner":
      - /url: /partners/7bbcb98e-96a7-4b68-b573-4a3e69692d27
    - text: Inquiry
  - region "R4 partner 9fa85fc5-adfa-4d51-b64b-dc482e3fc008":
    - text: Employer inquiry
    - strong: 7bbcb98e-96a7-4b68-b573-4a3e69692d27
    - paragraph: Inquiry about
    - heading "R4 partner 9fa85fc5-adfa-4d51-b64b-dc482e3fc008" [level=1]
    - paragraph: Industry collaboration inquiry
    - paragraph: Context locked to this partner. The form cannot redirect the inquiry elsewhere.
  - region "Start the conversation.":
    - paragraph: 01 / Your inquiry
    - heading "Start the conversation." [level=2]:
      - text: Start the
      - emphasis: conversation.
    - paragraph: Four fields, no account required. Required fields are marked in their labels.
    - status:
      - paragraph: Inquiry received
      - heading "Thank you for reaching out." [level=2]
      - paragraph: Your inquiry about R4 partner 9fa85fc5-adfa-4d51-b64b-dc482e3fc008 was submitted successfully. Reference 50fd3204-2669-402f-a562-4c67c8d440eb.
- complementary "Project status": Independent student-built course project. Not an official ImmXrsive or Algoma University service.
- alert: NOT ImmXrsive Talent & Industry Platform
```

# Test source

```ts
  1  | import { randomUUID } from "node:crypto";
  2  | import { betterAuth } from "better-auth";
  3  | import { drizzleAdapter } from "@better-auth/drizzle-adapter";
  4  | import { expect, test } from "@playwright/test";
  5  | import { createDatabase } from "../../src/db/client";
  6  | import * as s from "../../src/db/schema";
  7  | const origin="http://127.0.0.1:3100";
  8  | test("R4 public 390px directory, privacy and contextual inquiry",async({page})=>{
  9  |  const c=createDatabase(process.env.TEST_DATABASE_URL!);
  10 |  try{
  11 |   const [company]=await c.db.insert(s.partnerCompanies).values({status:"published",content:{name:`R4 partner ${randomUUID()}`,website:"https://example.org",description:"Public collaboration partner",sector:"XR",location:"Ontario"}}).returning();
  12 |   const content={companyId:company.id,title:"Current public study",description:"How the study worked",outcome:"A working prototype",year:2026,date:null,status:"current" as const,visibility:"public" as const,projectIds:[],participantIds:[]};
  13 |   await c.db.insert(s.partnerCollaborations).values([{companyId:company.id,content},{companyId:company.id,content:{...content,title:"Past public study",year:2025,status:"past"}},{companyId:company.id,content:{...content,title:"SECRET LIMITED",description:"SECRET",outcome:"SECRET",visibility:"limited"}},{companyId:company.id,content:{...content,title:"SECRET PRIVATE",visibility:"private"}}]);
  14 |   await page.setViewportSize({width:390,height:844});await page.goto("/partners");await page.getByRole("link",{name:company.content.name,exact:true}).click();await expect(page.getByRole("heading",{name:"Current public study"})).toBeVisible();await expect(page.getByRole("heading",{name:"Past public study"})).toBeVisible();await expect(page.getByText("Anonymized collaboration",{exact:true})).toBeVisible();expect(await page.content()).not.toContain("SECRET");
  15 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  16 |   await page.getByRole("link",{name:`Discuss a collaboration with ${company.content.name}`}).click();await expect(page.getByRole("heading",{level:1})).toContainText(company.content.name);
> 17 |   await page.getByLabel("Company name").fill("Synthetic employer");await page.getByLabel("Contact name").fill("Synthetic contact");await page.getByLabel("Contact email").fill("contact@example.test");await page.getByLabel("Inquiry description").fill("We would like to discuss a research collaboration and a student training prototype.");await page.getByRole("button",{name:/submit inquiry/i}).click();await expect(page.getByText(/inquiry submitted/i)).toBeVisible();
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  18 |  }finally{await c.client.end();}
  19 | });
  20 | for(const width of [1280,768])test(`R4 staff manual draft/publish at ${width}px`,async({page})=>{
  21 |  const c=createDatabase(process.env.TEST_DATABASE_URL!);
  22 |  try{
  23 |   const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
  24 |   const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic R4 staff",email:`r4-${randomUUID()}@example.test`,password:"test-only-password-long-enough"})}));expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};
  25 |   await c.db.insert(s.studioRoles).values({userId:user.id,role:"xr_admin"});
  26 |   const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const sep=cookie.indexOf("=");await page.context().addCookies([{name:cookie.slice(0,sep),value:cookie.slice(sep+1),url:origin,httpOnly:true,sameSite:"Lax"}]);
  27 |   await page.setViewportSize({width,height:900});await page.goto("/admin/partners");await expect(page.getByRole("heading",{name:"Industry partnerships and review tasks"})).toBeVisible();
  28 |   const name=`R4 Manual ${randomUUID()}`;await page.getByLabel("name",{exact:true}).fill(name);await page.getByLabel("website",{exact:true}).fill(`https://company-${randomUUID()}.example.org`);await page.getByLabel("description",{exact:true}).first().fill("Manually reviewed partner description");await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByRole("status")).toContainText("Company saved");await page.getByRole("button",{name:"Publish reviewed company"}).click();await expect(page.getByRole("status")).toContainText("Company saved");
  29 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.goto("/partners");await expect(page.getByRole("link",{name,exact:true})).toBeVisible();
  30 |  }finally{await c.client.end();}
  31 | });
  32 | 
  33 | for (const width of [1280,768]) test(`R4 student requests require independent staff approval at ${width}px`,async({browser})=>{
  34 |  test.setTimeout(60000);
  35 |  const c=createDatabase(process.env.TEST_DATABASE_URL!);
  36 |  const student=await browser.newContext({viewport:{width:390,height:844}});
  37 |  const staff=await browser.newContext({viewport:{width,height:900}});
  38 |  const curator=await browser.newContext({viewport:{width,height:900}});
  39 |  try {
  40 |   // Same synthetic Better Auth session helper pattern as manual-project.spec.ts.
  41 |   const auth=betterAuth({baseURL:origin,secret:"browser-test-secret-with-at-least-thirty-two-characters",database:drizzleAdapter(c.db,{provider:"pg",schema:{user:s.authUsers,session:s.authSessions,account:s.authAccounts,verification:s.authVerifications}}),emailAndPassword:{enabled:true},advanced:{cookiePrefix:"immxrsive"}});
  42 |   async function account(context:typeof student,role?:"xr_admin"|"xr_curator"){
  43 |    const response=await auth.handler(new Request(`${origin}/api/auth/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({name:"Synthetic R4 reviewer",email:`r4-${randomUUID()}@example.test`,password:"test-only-password-long-enough"})}));
  44 |    expect(response.status).toBe(200);const {user}=await response.json() as {user:{id:string}};
  45 |    if(role)await c.db.insert(s.studioRoles).values({userId:user.id,role});
  46 |    const cookie=response.headers.getSetCookie().find(v=>v.split("=",1)[0].includes("session_token"))!.split(";",1)[0];const sep=cookie.indexOf("=");
  47 |    await context.addCookies([{name:cookie.slice(0,sep),value:cookie.slice(sep+1),url:origin,httpOnly:true,sameSite:"Lax"}]);return user.id;
  48 |   }
  49 |   const userId=await account(student);const reviewer=await account(staff,"xr_admin");await account(curator,"xr_curator");expect(reviewer).not.toBe(userId);
  50 |   await c.db.insert(s.studentAffiliations).values({userId,status:"verified",institutionalEmail:`${userId}@algomau.ca`,verifiedAt:new Date()});
  51 |   const projectId=randomUUID(),title=`R4 review ${randomUUID()}`;
  52 |   await c.db.insert(s.projects).values({id:projectId,title,description:"Synthetic independently reviewed project",domain:"XR",origin:"student",maintainerUserId:userId,publicationStatus:"published"});
  53 |   const [company]=await c.db.insert(s.partnerCompanies).values({status:"published",content:{name:`R4 approved partner ${randomUUID()}`,website:"",description:"Synthetic partner",sector:"XR",location:"Ontario"}}).returning();
  54 |   for(const context of [student,curator]){
  55 |    for(const action of ["companies","collaborations","import","decisions"]){
  56 |     const denied=await context.request.post(`${origin}/api/admin/partners/${action}`,{headers:{Origin:origin},data:{}});expect(denied.status()).toBe(403);expect((await denied.json()).error.message).toBeTruthy();
  57 |    }
  58 |    const p=await context.newPage();await p.goto(`${origin}/admin/partners`);await expect(p.getByRole("button",{name:"Save draft",exact:true})).toHaveCount(0);await expect(p.getByRole("button",{name:"Record staff decision"})).toHaveCount(0);
  59 |    if(context===student)await expect(p.getByRole("heading",{name:"Administrator access required"})).toBeVisible();
  60 |    else await expect(p.getByRole("heading",{name:"Industry partnerships and review tasks"})).toBeVisible();
  61 |   }
  62 |   const sp=await student.newPage();const rp=await staff.newPage();
  63 |   for(const kind of ["verification","association"]){
  64 |    await sp.goto(`${origin}/student/projects/${projectId}/requests`);await sp.getByLabel("Request type").selectOption(kind);
  65 |    if(kind==="association")await sp.getByLabel("Existing company").selectOption(company.id);
  66 |    await sp.getByLabel("Explanation / review note").fill(`Synthetic ${kind} evidence`);
  67 |    const submitted=sp.waitForResponse(r=>r.url().endsWith("/api/v1/student/partner-requests")&&r.request().method()==="POST");
  68 |    await sp.getByRole("button",{name:"Submit for staff review"}).click();expect((await submitted).status()).toBe(200);
  69 |    await expect(sp.getByRole("heading",{name:`${kind} — pending`,exact:true})).toBeVisible();
  70 |    const publicBefore=await student.request.get(`${origin}/projects/${projectId}`);expect(publicBefore.status()).toBe(200);
  71 |    if(kind==="verification")expect(await publicBefore.text()).not.toContain("✓ Official project verification");
  72 |    else expect(await publicBefore.text()).not.toContain(`/partners/${company.id}`);
  73 |    await rp.goto(`${origin}/admin/partners`);
  74 |    const card=rp.locator(`#${kind} article`).filter({has:rp.getByRole("heading",{name:title,exact:true})});
  75 |    await card.getByLabel("Decision note").fill("Evidence independently reviewed by synthetic staff");
  76 |    const decided=rp.waitForResponse(r=>r.url().endsWith("/api/admin/partners/decisions")&&r.request().method()==="POST");
  77 |    await card.getByRole("button",{name:"Record staff decision"}).click();expect((await decided).status()).toBe(200);
  78 |    await expect(card).toHaveCount(0);
  79 |    expect(await rp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  80 |    await sp.reload();await expect(sp.getByRole("heading",{name:`${kind} — approved`,exact:true})).toBeVisible();
  81 |   }
  82 |   await sp.goto(`${origin}/projects/${projectId}`);await expect(sp.getByText("✓ Official project verification — approved by staff",{exact:true})).toBeVisible();await expect(sp.getByRole("link",{name:company.content.name,exact:true})).toHaveAttribute("href",`/partners/${company.id}`);
  83 |   expect(await sp.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  84 |  } finally {await student.close();await staff.close();await curator.close();await c.client.end();}
  85 | });
  86 | 
```