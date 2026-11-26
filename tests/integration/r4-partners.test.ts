import "./setup";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/partners/import",async importOriginal=>({...await importOriginal<typeof import("@/partners/import")>(),fetchCompanyHtml:vi.fn()}));
import { fetchCompanyHtml } from "@/partners/import";
import { createDatabase } from "@/db/client";
import * as s from "@/db/schema";
import { importProposal, saveCompany, saveCollaboration, submitRequest, decideRequest, publicPartner, publicProjectPartners, staffQueue, maintainerRequests } from "@/partners/service";
import { createContextualInquiry } from "@/db/queries/inquiry";
const c=createDatabase(process.env.TEST_DATABASE_URL!,2);const db=c.db;
const admin=randomUUID(), student=randomUUID(), other=randomUUID(), curator=randomUUID();
let projectId:string;
const companyContent={name:"R4 Synthetic",website:"https://r4.example.org",description:"Synthetic company for disposable integration tests",sector:"XR",location:"Ontario"};
beforeAll(async()=>{
 const [version]=await db.execute(sql`show server_version_num`);expect(Number(version.server_version_num)).toBeGreaterThanOrEqual(170000);expect(Number(version.server_version_num)).toBeLessThan(180000);
 await migrate(db,{migrationsFolder:"drizzle"});
 for(const id of [admin,student,other,curator])await db.insert(s.authUsers).values({id,name:"Synthetic test user",email:`${id}@example.test`});
 await db.insert(s.studioRoles).values([{userId:admin,role:"xr_admin"},{userId:curator,role:"xr_curator"}]);
 await db.insert(s.studentAffiliations).values({userId:student,status:"verified",institutionalEmail:"student@algomau.ca",verifiedAt:new Date()});
 projectId=randomUUID();await db.insert(s.projects).values({id:projectId,title:"R4 Student Project",description:"Public project",domain:"XR",origin:"student",maintainerUserId:student,publicationStatus:"published"});
});
afterAll(()=>c.client.end());
async function company(content=companyContent){const result=await saveCompany(db,admin,{content,status:"published",duplicateAcknowledged:true});if(!result.company)throw new Error("Company not saved");return result.company;}

test("public relationships are bidirectional, deduplicated by type and never grant verification or staff access",async()=>{
 const actor=randomUUID(), publicId=randomUUID(), draftId=randomUUID();
 await db.insert(s.authUsers).values({id:actor,name:"Relationship test student",email:`${actor}@example.test`});
 await db.insert(s.studentAffiliations).values({userId:actor,status:"verified",institutionalEmail:`${actor}@algomau.ca`,verifiedAt:new Date()});
 await db.insert(s.projects).values([
  {id:publicId,title:"Relationship public project",description:"Public",domain:"XR",origin:"student",maintainerUserId:actor,publicationStatus:"published"},
  {id:draftId,title:"SECRET draft project",description:"Draft",domain:"XR",origin:"student",maintainerUserId:actor,publicationStatus:"unpublished"},
 ]);
 const [comp,second,restricted,hidden]=await Promise.all(["public","second","restricted","hidden"].map(name=>company({...companyContent,website:`https://${name}-relationships.example.org`})));
 const rolesBefore=await db.select().from(s.studioRoles);
 const content={companyId:comp.id,title:"Public history",description:"Public collaboration",outcome:"Prototype",year:2026,date:null,status:"current",visibility:"public",projectIds:[publicId,publicId,draftId],participantIds:[]};
 await expect(saveCollaboration(db,actor,{content})).rejects.toMatchObject({status:403});
 await saveCollaboration(db,admin,{content});
 await saveCollaboration(db,admin,{content:{...content,title:"Second public history",status:"past"}});
 await saveCollaboration(db,admin,{content:{...content,companyId:second.id}});
 for(const visibility of ["private","limited"])await saveCollaboration(db,admin,{content:{...content,companyId:restricted.id,visibility,title:"SECRET collaboration"}});
 await saveCollaboration(db,admin,{content:{...content,companyId:hidden.id}});
 await saveCompany(db,admin,{id:hidden.id,version:hidden.version,content:hidden.content,status:"draft"});
 const before=await publicProjectPartners(db,publicId);
 expect(before.official).toBe(false);expect(before.companies).toEqual([]);
 expect(before.collaborationCompanies.map(c=>c.id).sort()).toEqual([comp.id,second.id].sort());
 const partnerBefore=await publicPartner(db,comp.id);
 expect(partnerBefore?.verifiedProjects).toEqual([]);
 expect(partnerBefore?.collaborations).toHaveLength(2);
 for(const collaboration of partnerBefore!.collaborations)expect(collaboration.projects).toEqual([{id:publicId,title:"Relationship public project"}]);
 expect(JSON.stringify(await publicPartner(db,restricted.id))).not.toContain(publicId);
 expect(JSON.stringify(partnerBefore)).not.toContain("SECRET");

 async function request(companyId:string,projectId=publicId){return submitRequest(db,actor,{kind:"association",projectId,companyId,note:"Review relationship",evidence:"",suggestedCompany:""});}
 const pending=await request(comp.id);
 await expect(decideRequest(db,actor,{id:pending.id,status:"approved",note:"Student cannot approve",companyId:comp.id})).rejects.toMatchObject({status:403});
 expect((await publicPartner(db,comp.id))?.verifiedProjects).toEqual([]);
 expect((await publicProjectPartners(db,publicId)).companies).toEqual([]);
 await decideRequest(db,admin,{id:pending.id,status:"approved",note:"Independent staff review",companyId:comp.id});
 const rejected=await request(second.id);
 await decideRequest(db,admin,{id:rejected.id,status:"rejected",note:"Not approved",companyId:second.id});
 expect((await publicPartner(db,second.id))?.verifiedProjects).toEqual([]);
 const approvedSecond=await request(second.id);
 await decideRequest(db,admin,{id:approvedSecond.id,status:"approved",note:"New evidence reviewed",companyId:second.id});
 const draftRequest=await request(comp.id,draftId);
 await decideRequest(db,admin,{id:draftRequest.id,status:"approved",note:"Draft remains hidden",companyId:comp.id});
 const after=await publicProjectPartners(db,publicId);
 expect(after.official).toBe(false);
 expect(after.companies.map(c=>c.id).sort()).toEqual([comp.id,second.id].sort());
 expect(after.collaborationCompanies.map(c=>c.id).sort()).toEqual([comp.id,second.id].sort());
 expect((await publicPartner(db,comp.id))?.verifiedProjects).toEqual([{id:publicId,title:"Relationship public project"}]);
 expect(await publicProjectPartners(db,draftId)).toEqual({official:false,companies:[],collaborationCompanies:[]});
 expect(await publicPartner(db,hidden.id)).toBeNull();
 await saveCompany(db,admin,{id:comp.id,version:comp.version,content:comp.content,status:"draft"});
 const unpublishedCompany=await publicProjectPartners(db,publicId);
 expect(unpublishedCompany.companies.map(c=>c.id)).toEqual([second.id]);
 expect(unpublishedCompany.collaborationCompanies.map(c=>c.id)).toEqual([second.id]);
 await db.update(s.projects).set({publicationStatus:"unpublished"}).where(eq(s.projects.id,publicId));
 expect((await publicPartner(db,second.id))?.verifiedProjects).toEqual([]);
 expect((await publicPartner(db,second.id))?.collaborations[0].projects).toEqual([]);
 expect(await publicProjectPartners(db,publicId)).toEqual({official:false,companies:[],collaborationCompanies:[]});
 expect(await db.select().from(s.studioRoles)).toEqual(rolesBefore);
 await expect(staffQueue(db,actor)).rejects.toMatchObject({status:403});
});
test("staff role protection and duplicate warning with optimistic updates",async()=>{
 for(const actor of [student,curator])await expect(saveCompany(db,actor,{content:companyContent,status:"draft"})).rejects.toMatchObject({status:403});
 await expect(staffQueue(db,student)).rejects.toMatchObject({status:403});
 const first=await company({...companyContent,website:"https://unique.example.org"});
 const duplicate=await saveCompany(db,admin,{content:{...companyContent,website:"https://www.unique.example.org/path"},status:"draft"});
 expect(duplicate.company).toBeUndefined();expect(duplicate.duplicates.map(c=>c.id)).toContain(first.id);
 const distinct=await saveCompany(db,admin,{content:{...companyContent,website:"https://distinct.example.org"},status:"draft"});expect(distinct.company).toBeDefined();
 await saveCompany(db,admin,{id:first.id,version:1,content:first.content,status:"draft"});
 await expect(saveCompany(db,admin,{id:first.id,version:1,content:first.content,status:"published"})).rejects.toMatchObject({status:409});
});
test("maintainer request cannot self-verify, be forged or reviewed twice",async()=>{
 const input={kind:"verification",projectId,note:"Please review evidence",evidence:"https://example.org/evidence",companyId:null,suggestedCompany:""};
 await expect(submitRequest(db,other,input)).rejects.toMatchObject({status:403});
 await expect(maintainerRequests(db,other,projectId)).rejects.toMatchObject({status:403});
 await expect(submitRequest(db,student,{...input,official:true})).rejects.toThrow();
 const request=await submitRequest(db,student,input);await expect(submitRequest(db,student,input)).rejects.toMatchObject({status:409});
 await db.insert(s.studioRoles).values({userId:student,role:"xr_admin"});
 await expect(decideRequest(db,student,{id:request.id,status:"approved",note:"Self",companyId:null})).rejects.toMatchObject({status:403});
 await decideRequest(db,admin,{id:request.id,status:"approved",note:"Evidence reviewed",companyId:null});
 expect((await publicProjectPartners(db,projectId)).official).toBe(true);
 await expect(decideRequest(db,admin,{id:request.id,status:"rejected",note:"Again",companyId:null})).rejects.toMatchObject({status:409});
});
test("suggested-company request needs staff selection and supports several partners",async()=>{
 for(let n=0;n<2;n++){
  const comp=await company({...companyContent,website:`https://association-${n}.example.org`});
  const r=await submitRequest(db,student,{kind:"association",projectId,note:"We worked with this organization",evidence:"",companyId:null,suggestedCompany:comp.content.name});
  await expect(decideRequest(db,admin,{id:r.id,status:"approved",note:"Review",companyId:null})).rejects.toMatchObject({status:422});
  await decideRequest(db,admin,{id:r.id,status:"approved",note:"Independent approval",companyId:comp.id});
 }
 expect((await publicProjectPartners(db,projectId)).companies).toHaveLength(2);
});
test("current/past history and limited/private projection, inquiries and append-only audit",async()=>{
 const comp=await company({...companyContent,website:"https://privacy.example.org"});
 const content={companyId:comp.id,title:"Public narrative",description:"How we collaborated",outcome:"Prototype",year:2026,date:null,status:"current",visibility:"public",projectIds:[projectId],participantIds:[]};
 await saveCollaboration(db,admin,{content});
 await saveCollaboration(db,admin,{content:{...content,year:2025,status:"past",title:"Past narrative"}});
 await saveCollaboration(db,admin,{content:{...content,title:"SECRET LIMITED",description:"SECRET",outcome:"SECRET",visibility:"limited"}});
 await saveCollaboration(db,admin,{content:{...content,title:"SECRET PRIVATE",visibility:"private"}});
 const result=await publicPartner(db,comp.id);expect(result?.collaborations).toHaveLength(3);expect(JSON.stringify(result)).not.toContain("SECRET");expect(result?.collaborations[0].projects[0].id).toBe(projectId);
 expect(await createContextualInquiry(db,{sourceType:"partner",sourceId:comp.id,companyName:"Employer",contactName:"Contact",contactEmail:"contact@example.org",description:"I would like to discuss a collaboration.",website:""})).toMatchObject({id:expect.any(String)});
 await saveCompany(db,admin,{id:comp.id,version:1,content:comp.content,status:"draft"});expect(await publicPartner(db,comp.id)).toBeNull();
 await expect(db.update(s.partnerEvents).set({action:"tamper"})).rejects.toThrow();
 const tables=await db.execute(sql`select tablename,rowsecurity from pg_tables where schemaname='public' and tablename like 'partner_%'`);expect(tables.length).toBeGreaterThan(0);for(const t of tables)expect(t.rowsecurity).toBe(true);
 expect((await db.select().from(s.partnerEvents).where(eq(s.partnerEvents.actorUserId,admin))).length).toBeGreaterThan(0);
});

test("exact mocked fixture import persists editable draft provenance without state grants",async()=>{
 vi.mocked(fetchCompanyHtml).mockResolvedValue(readFileSync("public/fixtures/r4/company_prompt_injection.html","utf8"));
 const before=await db.select().from(s.studioRoles);
 const sourceUrl="https://fixtures.example.org/company_prompt_injection.html";
 const proposal=await importProposal(db,admin,sourceUrl);expect(proposal.proposal?.name).toBe("Superior Immersive Labs");
 expect(proposal).not.toHaveProperty("status");
 expect((await staffQueue(db,admin)).imports.map(i=>i.id)).toContain(proposal.importEventId);
 const result=await saveCompany(db,admin,{content:proposal.proposal,status:"draft",importEventId:proposal.importEventId,duplicateAcknowledged:true});
 expect(result.company?.status).toBe("draft");expect(result.company?.sources).toEqual([{sourceUrl,timestamp:proposal.timestamp}]);
 expect(await publicPartner(db,result.company!.id)).toBeNull();expect(await db.select().from(s.studioRoles)).toEqual(before);
 expect((await staffQueue(db,admin)).imports.map(i=>i.id)).not.toContain(proposal.importEventId);
 vi.mocked(fetchCompanyHtml).mockRejectedValue(new Error("Synthetic upstream failure"));
 const fallback=await importProposal(db,admin,"https://fixtures.example.org/unavailable");expect(fallback.proposal).toBeNull();expect(fallback.error).toContain("manual");
});

test("relationship constraint rejects using a different company's approval",async()=>{
 const approvedCompany=await company({...companyContent,website:"https://approved-relationship.example.org"});
 const unrelatedCompany=await company({...companyContent,website:"https://unrelated-relationship.example.org"});
 const request=await submitRequest(db,student,{kind:"association",projectId,note:"Approve this company only",evidence:"",companyId:approvedCompany.id,suggestedCompany:""});
 await decideRequest(db,admin,{id:request.id,status:"approved",note:"Reviewed specified company",companyId:approvedCompany.id});
 await expect(db.transaction(async tx=>{
  await tx.insert(s.projectVerifiedPartners).values({projectId,companyId:unrelatedCompany.id,requestId:request.id});
 })).rejects.toThrow();
});

test("concurrent domain checks, edits and decisions preserve one winning transition",async()=>{
 const content={...companyContent,website:"https://concurrent-domain.example.org"};
 const creations=await Promise.all([saveCompany(db,admin,{content,status:"draft"}),saveCompany(db,admin,{content,status:"draft"})]);
 expect(creations.filter(r=>r.company)).toHaveLength(1);expect(creations.filter(r=>r.warning)).toHaveLength(1);
 const saved=creations.find(r=>r.company)!.company!;
 const edits=await Promise.allSettled([saveCompany(db,admin,{id:saved.id,version:1,content,status:"draft"}),saveCompany(db,admin,{id:saved.id,version:1,content,status:"draft"})]);
 expect(edits.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(edits.filter(r=>r.status==="rejected")).toHaveLength(1);
 const request=await submitRequest(db,student,{kind:"verification",projectId,note:"Concurrent review",evidence:"",companyId:null,suggestedCompany:""});
 const decisions=await Promise.allSettled([decideRequest(db,admin,{id:request.id,status:"approved",note:"First reviewer",companyId:null}),decideRequest(db,admin,{id:request.id,status:"rejected",note:"Second reviewer",companyId:null})]);
 expect(decisions.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(decisions.filter(r=>r.status==="rejected")).toHaveLength(1);
});

test("all nine R4 tables deny Data API access and audit mutation remains impossible",async()=>{
 const tables=["partner_companies","partner_collaborations","partner_collaboration_projects","partner_collaboration_participants","partner_requests","project_official_verifications","project_verified_partners","partner_events","partner_inquiries"];
 for(const table of tables){
  const [state]=await db.execute(sql`select relrowsecurity from pg_class where oid=${`public.${table}`}::regclass`);expect(state.relrowsecurity).toBe(true);
  for(const role of ["anon","authenticated"]){
   const [privilege]=await db.execute(sql`select has_table_privilege(${role},${`public.${table}`},'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed`);expect(privilege.allowed).toBe(false);
  }
 }
 await expect(db.delete(s.partnerEvents)).rejects.toThrow();
 await expect(db.execute(sql`truncate table public.partner_events`)).rejects.toThrow();
 const [privilege]=await db.execute(sql`select has_function_privilege('anon','public.r4_relationship_guard()','EXECUTE') as allowed`);expect(privilege.allowed).toBe(false);
 expect(await createContextualInquiry(db,{sourceType:"partner",sourceId:"-".repeat(36),companyName:"Synthetic",contactName:"Contact",contactEmail:"contact@example.test",description:"A synthetic collaboration inquiry.",website:""})).toBeNull();
});
