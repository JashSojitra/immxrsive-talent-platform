import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";

test("public relationships are discoverable in both directions and labeled separately",async({page})=>{
 const c=createDatabase(process.env.TEST_DATABASE_URL!);
 try {
  const actor=randomUUID(),reviewer=randomUUID();
  await c.db.insert(s.authUsers).values([actor,reviewer].map(id=>({id,name:"Synthetic relationship reviewer",email:`${id}@example.test`})));
  const publicId=randomUUID(),approvedId=randomUUID(),draftId=randomUUID();
  await c.db.insert(s.projects).values([
   {id:publicId,title:`Public relationship ${publicId}`,publicationStatus:"published" as const},
   {id:approvedId,title:`Approved relationship ${approvedId}`,publicationStatus:"published" as const},
   {id:draftId,title:`SECRET draft ${draftId}`,publicationStatus:"unpublished" as const},
  ].map(p=>({...p,description:"Synthetic relationship regression",domain:"XR",origin:"student" as const,maintainerUserId:actor})));
  const [company,restricted,hidden]=await c.db.insert(s.partnerCompanies).values(["Public","Restricted","Hidden"].map(name=>({status:name==="Hidden"?"draft" as const:"published" as const,content:{name:`${name} partner ${randomUUID()}`,website:"",description:"Synthetic partner",sector:"XR",location:"Ontario"}}))).returning();
  for(const [comp,visibility] of [[company,"public"],[company,"public"],[restricted,"limited"],[restricted,"private"],[hidden,"public"]] as const){
   const [collaboration]=await c.db.insert(s.partnerCollaborations).values({companyId:comp.id,content:{companyId:comp.id,title:visibility==="public"?"Public history":"SECRET collaboration",description:"Synthetic history",outcome:"",year:2026,date:null,status:"current",visibility,projectIds:[publicId,draftId],participantIds:[]}}).returning();
   await c.db.insert(s.partnerCollaborationProjects).values([publicId,draftId].map(projectId=>({collaborationId:collaboration.id,projectId})));
  }
  await page.goto(`/partners/${company.id}`);
  const verifiedProjects=page.getByRole("region",{name:"Verified project associations",exact:true});
  await expect(verifiedProjects.getByRole("link")).toHaveCount(0);
  const history=page.getByRole("region",{name:"Current collaborations",exact:true});
  await expect(history.getByRole("link",{name:`Public relationship ${publicId}`,exact:true})).toHaveCount(2);
  expect(await page.content()).not.toContain(draftId);
  await history.getByRole("link",{name:`Public relationship ${publicId}`,exact:true}).first().click();
  const verified=page.getByRole("region",{name:"Official project relationships",exact:true});
  const publicPartners=page.getByRole("region",{name:"Public collaboration partners",exact:true});
  await expect(verified.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(0);
  await expect(publicPartners.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(1);
  await expect(publicPartners).toContainText("Collaborations do not confer verified partner status.");
  expect(await page.content()).not.toContain(restricted.id);expect(await page.content()).not.toContain(hidden.id);
  for(const projectId of [publicId,approvedId,draftId]){
   const [request]=await c.db.insert(s.partnerRequests).values({kind:"association",projectId,companyId:company.id,actorUserId:actor,suggestedCompany:"",note:"Synthetic evidence",evidence:"",status:"approved",reviewedBy:reviewer,decisionNote:"Independently reviewed"}).returning();
   await c.db.insert(s.projectVerifiedPartners).values({projectId,companyId:company.id,requestId:request.id});
  }
  await page.reload();
  await expect(verified.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(1);
  await expect(publicPartners.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(1);
  await publicPartners.getByRole("link",{name:company.content.name,exact:true}).click();
  await expect(verifiedProjects.getByRole("link")).toHaveCount(2);
  expect(await page.content()).not.toContain(draftId);
  await verifiedProjects.getByRole("link",{name:`Approved relationship ${approvedId}`,exact:true}).click();
  await expect(verified.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(1);
  await expect(publicPartners.getByRole("link",{name:company.content.name,exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await page.goto(`/projects/${draftId}`))?.status()).toBe(404);
  expect((await page.goto(`/partners/${hidden.id}`))?.status()).toBe(404);
 } finally {await c.client.end();}
});
