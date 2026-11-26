import "server-only";
import { and, eq, inArray, desc, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { partnerCompanies as companies, partnerCollaborations as collaborations, partnerRequests as requests, partnerEvents as events, partnerCollaborationProjects as edges, partnerCollaborationParticipants as participants, projectOfficialVerifications as official, projectVerifiedPartners as partners, projects, studentProfiles, studentAffiliations, authUsers, projectMemberships } from "@/db/schema";
import { lockStaff, fail } from "@/admin/service";
import { companySchema, collaborationSchema, requestSchema, normalizedDomain } from "./policy";
import { fetchCompanyHtml, parseCompanyHtml } from "./import";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
async function audit(tx: Tx, actorUserId: string, action: string, subjectId: string, snapshot: unknown) { await tx.insert(events).values({ actorUserId, action, subjectId, snapshot }); }
function version(actual: number, expected: number) { if(actual !== expected) fail("EDIT_CONFLICT",409,"This record changed. Reload before saving."); }
const id = z.uuid();
export async function staffQueue(db: Database, actor: string) {
 return db.transaction(async tx => {
  const role = await lockStaff(tx,actor);
  const companyRows = await tx.select().from(companies).orderBy(desc(companies.updatedAt));
  const importRows = await tx.select().from(events).where(eq(events.action,"import_proposal")).orderBy(desc(events.createdAt)).limit(100);
  const imports = importRows.flatMap(event => {
   const parsed = z.object({sourceUrl:z.string(),timestamp:z.string(),proposal:companySchema.nullable()}).safeParse(event.snapshot);
   if(!parsed.success || !parsed.data.proposal || companyRows.some(c=>c.sources.some(s=>s.sourceUrl===parsed.data.sourceUrl&&s.timestamp===parsed.data.timestamp)))return [];
   return [{id:event.id,...parsed.data,proposal:parsed.data.proposal}];
  });
  const requestRows = await tx.select({ request: requests, project: projects }).from(requests).innerJoin(projects,eq(requests.projectId,projects.id)).orderBy(desc(requests.createdAt));
  const team = await tx.select({ projectId: projectMemberships.projectId, name: authUsers.name, state: projectMemberships.state }).from(projectMemberships).innerJoin(studentProfiles,eq(studentProfiles.id,projectMemberships.profileId)).innerJoin(authUsers,eq(authUsers.id,studentProfiles.ownerUserId));
  return { role, imports, companies: companyRows, requests: requestRows.map(r => ({...r, contributors: team.filter(t => t.projectId === r.project.id)})), collaborations: await tx.select().from(collaborations), projects: await tx.select({id:projects.id,title:projects.title}).from(projects), profiles: await tx.select({id:studentProfiles.id,name:authUsers.name}).from(studentProfiles).innerJoin(authUsers,eq(authUsers.id,studentProfiles.ownerUserId)).where(eq(studentProfiles.publicationStatus,"published")), events: await tx.select().from(events).orderBy(desc(events.createdAt)).limit(100) };
 });
}
export async function importProposal(db: Database, actor: string, sourceUrl: string) {
 await db.transaction(tx => lockStaff(tx,actor,true));
 let proposal = null; let error = "";
 try { proposal = companySchema.parse(parseCompanyHtml(await fetchCompanyHtml(sourceUrl),sourceUrl)); } catch { error = "Import unavailable. Your manual draft is unchanged. Complete the form manually."; }
 const timestamp = new Date().toISOString();
 return db.transaction(async tx => {
  await lockStaff(tx,actor,true);
  const [event] = await tx.insert(events).values({actorUserId:actor,action:"import_proposal",subjectId:sourceUrl,snapshot:{sourceUrl,timestamp,proposal,error}}).returning();
  const domain = (() => { try { return normalizedDomain(proposal?.website ?? sourceUrl); } catch { return null; } })();
  const duplicates = domain ? await tx.select().from(companies).where(eq(companies.normalizedDomain,domain)) : [];
  return {proposal,sourceUrl,timestamp,error,duplicates,importEventId:event.id};
 });
}
export async function saveCompany(db: Database, actor: string, raw: unknown) {
 const c = z.object({id:id.optional(),version:z.number().int().positive().optional(),content:companySchema,status:z.enum(["draft","published"]),importEventId:id.optional(),duplicateAcknowledged:z.boolean().default(false)}).strict().parse(raw);
 return db.transaction(async tx => {
  await lockStaff(tx,actor,true);
  let source: {sourceUrl:string;timestamp:string} | null = null;
  if(c.importEventId) {
   const [event] = await tx.select().from(events).where(and(eq(events.id,c.importEventId),eq(events.action,"import_proposal")));
   if(!event) fail("IMPORT_UNAVAILABLE",422);
   const snapshot = z.object({sourceUrl:z.string(),timestamp:z.string(),proposal:companySchema}).parse(event.snapshot); source = {sourceUrl:snapshot.sourceUrl,timestamp:snapshot.timestamp};
  }
  const domain = c.content.website ? normalizedDomain(c.content.website) : null;
  if(domain) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${domain}, 4))`);
  const duplicates = domain ? (await tx.select().from(companies).where(eq(companies.normalizedDomain,domain))).filter(x => x.id !== c.id) : [];
  if(duplicates.length && !c.duplicateAcknowledged) return {duplicates,warning:"Review existing companies and acknowledge before saving a separate company."};
  if(c.status === "published" && (!c.content.description || !c.content.website)) fail("PUBLICATION_VALIDATION",422,"Add a description and website before publishing.");
  let saved;
  if(c.id) {
   const [old] = await tx.select().from(companies).where(eq(companies.id,c.id)).for("update"); if(!old) fail("NOT_FOUND",404); version(old.version,c.version ?? 0);
   [saved] = await tx.update(companies).set({content:c.content,status:c.status,normalizedDomain:domain,sources:source&&!old.sources.some(s=>s.sourceUrl===source.sourceUrl&&s.timestamp===source.timestamp)?[...old.sources,source]:old.sources,version:old.version+1,updatedAt:new Date()}).where(eq(companies.id,c.id)).returning();
  } else { [saved] = await tx.insert(companies).values({content:c.content,status:c.status,normalizedDomain:domain,sources:source?[source]:[]}).returning(); }
  await audit(tx,actor,"company_saved",saved.id,saved); return {company:saved,duplicates};
 });
}
export async function saveCollaboration(db: Database, actor: string, raw: unknown) {
 const c = z.object({id:id.optional(),version:z.number().int().positive().optional(),content:collaborationSchema}).strict().parse(raw);
 return db.transaction(async tx => {
  await lockStaff(tx,actor,true);
  const [company] = await tx.select().from(companies).where(eq(companies.id,c.content.companyId)).for("share"); if(!company) fail("NOT_FOUND",404);
  if(c.content.projectIds.length) {
   const found = await tx.select().from(projects).where(inArray(projects.id,c.content.projectIds));
   if(found.length !== new Set(c.content.projectIds).size) fail("PROJECT_UNAVAILABLE",422);
  }
  for(const profileId of new Set(c.content.participantIds)) { const [profile] = await tx.select().from(studentProfiles).where(and(eq(studentProfiles.id,profileId),eq(studentProfiles.publicationStatus,"published"))).for("share"); if(!profile) fail("PROFILE_UNAVAILABLE",422,"Participants must have currently public profiles."); }
  let saved;
  if(c.id) { const [old] = await tx.select().from(collaborations).where(eq(collaborations.id,c.id)).for("update"); if(!old) fail("NOT_FOUND",404); version(old.version,c.version ?? 0); [saved] = await tx.update(collaborations).set({companyId:c.content.companyId,content:c.content,version:old.version+1}).where(eq(collaborations.id,c.id)).returning(); }
  else { [saved] = await tx.insert(collaborations).values({companyId:c.content.companyId,content:c.content}).returning(); }
  await tx.delete(edges).where(eq(edges.collaborationId,saved.id)); await tx.delete(participants).where(eq(participants.collaborationId,saved.id));
  if(c.content.projectIds.length) await tx.insert(edges).values([...new Set(c.content.projectIds)].map(projectId => ({collaborationId:saved.id,projectId})));
  if(c.content.participantIds.length) await tx.insert(participants).values([...new Set(c.content.participantIds)].map(profileId => ({collaborationId:saved.id,profileId})));
  await audit(tx,actor,"collaboration_saved",saved.id,saved); return saved;
 });
}
export async function submitRequest(db: Database, actor: string, raw: unknown) {
 const c = requestSchema.parse(raw);
 return db.transaction(async tx => {
  const [p] = await tx.select().from(projects).where(eq(projects.id,c.projectId)).for("update");
  if(!p || p.managementMode !== "STUDENT_MANAGED" || p.maintainerUserId !== actor || p.origin !== "student") fail("FORBIDDEN",403,"Only the student project maintainer can request review.");
  const [affiliation] = await tx.select().from(studentAffiliations).where(and(eq(studentAffiliations.userId,actor),eq(studentAffiliations.status,"verified"))).for("share");
  if(!affiliation) fail("FORBIDDEN",403);
  if(c.companyId && !(await tx.select().from(companies).where(and(eq(companies.id,c.companyId),eq(companies.status,"published")))).length) fail("COMPANY_UNAVAILABLE",422);
  const pending = await tx.select().from(requests).where(and(eq(requests.projectId,p.id),eq(requests.kind,c.kind),eq(requests.status,"pending")));
  if(pending.length) fail("ALREADY_PENDING",409);
  const [saved] = await tx.insert(requests).values({...c,actorUserId:actor}).returning(); await audit(tx,actor,"request_submitted",saved.id,saved); return saved;
 });
}
export async function decideRequest(db: Database, actor: string, raw: unknown) {
 const c = z.object({id,status:z.enum(["approved","rejected"]),note:z.string().trim().min(1).max(4000),companyId:id.nullable()}).strict().parse(raw);
 return db.transaction(async tx => {
  await lockStaff(tx,actor,true);
  const [r] = await tx.select().from(requests).where(eq(requests.id,c.id)).for("update"); if(!r) fail("NOT_FOUND",404);
  const [p] = await tx.select().from(projects).where(eq(projects.id,r.projectId)).for("update");
  if(r.actorUserId === actor || p.maintainerUserId === actor) fail("SELF_REVIEW",403,"Another staff member must review this request.");
  if(r.status !== "pending") fail("ALREADY_REVIEWED",409);
  let approvedCompanyId = r.companyId;
  if(c.status === "approved") {
   if(p.maintainerUserId !== r.actorUserId) fail("MAINTAINER_CHANGED",409,"The current maintainer must submit a new request.");
   if(r.kind === "verification") await tx.insert(official).values({projectId:r.projectId,requestId:r.id}).onConflictDoUpdate({target:official.projectId,set:{requestId:r.id}});
   else {
    const companyId = c.companyId ?? r.companyId; if(!companyId) fail("COMPANY_REQUIRED",422,"Create the suggested company draft first and select its published record.");
    const [company] = await tx.select().from(companies).where(and(eq(companies.id,companyId),eq(companies.status,"published"))).for("share"); if(!company) fail("COMPANY_UNAVAILABLE",422);
    approvedCompanyId = companyId;
    await tx.insert(partners).values({projectId:r.projectId,companyId,requestId:r.id}).onConflictDoNothing();
   }
  }
  const [saved] = await tx.update(requests).set({status:c.status,decisionNote:c.note,reviewedBy:actor,companyId:approvedCompanyId}).where(eq(requests.id,r.id)).returning(); await audit(tx,actor,"request_decided",r.id,saved); return saved;
 });
}
export async function maintainerRequests(db: Database, actor: string, projectId: string) {
 const [p] = await db.select().from(projects).where(eq(projects.id,projectId));
 if(!p || p.maintainerUserId !== actor || p.managementMode !== "STUDENT_MANAGED") fail("FORBIDDEN",403);
 return {requests:await db.select().from(requests).where(eq(requests.projectId,projectId)), companies:await publicCompanies(db)};
}
export async function publicCompanies(db: Database) { return db.select({id:companies.id,content:companies.content}).from(companies).where(eq(companies.status,"published")); }
export async function publicPartner(db: Database, companyId: string) {
 if(!id.safeParse(companyId).success) return null;
 const [company] = await db.select({id:companies.id,content:companies.content}).from(companies).where(and(eq(companies.id,companyId),eq(companies.status,"published"))); if(!company) return null;
 const rows = await db.select().from(collaborations).where(eq(collaborations.companyId,companyId));
 const visible = [];
 for(const row of rows) {
  const c = row.content;
  if(c.visibility === "private") continue;
  if(c.visibility === "limited") { visible.push({id:row.id,title:"Anonymized collaboration",year:c.year,status:c.status,description:"Details are limited to protect participants.",outcome:"",date:null,projects:[],students:[]}); continue; }
  const projectRows = await db.select().from(edges).where(eq(edges.collaborationId,row.id));
  const studentRows = await db.select().from(participants).where(eq(participants.collaborationId,row.id));
  const publicProjects = (await Promise.all(projectRows.map(e => queryPublicProject(db,e.projectId)))).filter(p => p !== null).map(p => ({id:p.id,title:p.title}));
  const publicStudents = (await Promise.all(studentRows.map(e => queryPublicStudentProfile(db,e.profileId)))).filter(p => p !== null).map(p => ({id:p.id,name:p.name}));
  visible.push({id:row.id,title:c.title,year:c.year,status:c.status,description:c.description,outcome:c.outcome,date:c.date,projects:publicProjects,students:publicStudents});
 }
 const approvedLinks = await db.select({projectId:partners.projectId}).from(partners).where(eq(partners.companyId,companyId));
 const verifiedProjects = (await Promise.all([...new Set(approvedLinks.map(link => link.projectId))].map(projectId => queryPublicProject(db,projectId))))
  .filter(p => p !== null).map(p => ({id:p.id,title:p.title}));
 return {...company,collaborations:visible,verifiedProjects};
}
export async function publicProjectPartners(db: Database, projectId: string) {
 if(!await queryPublicProject(db,projectId)) return {official:false,companies:[],collaborationCompanies:[]};
 const verified = await db.select().from(official).where(eq(official.projectId,projectId));
 const linked = await db.select({id:companies.id,content:companies.content}).from(partners).innerJoin(companies,eq(companies.id,partners.companyId)).where(and(eq(partners.projectId,projectId),eq(companies.status,"published")));
 // Deduplicate within this relationship type; collaboration never implies verification.
 const collaborationCompanies = await db.selectDistinct({id:companies.id,content:companies.content}).from(edges)
  .innerJoin(collaborations,eq(collaborations.id,edges.collaborationId))
  .innerJoin(companies,eq(companies.id,collaborations.companyId))
  .where(and(eq(edges.projectId,projectId),eq(companies.status,"published"),sql`${collaborations.content}->>'visibility' = 'public'`));
 return {official:!!verified.length,companies:linked,collaborationCompanies};
}
