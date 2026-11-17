/** Disposable PG17 setup only. Never run against a production database. */
import { readFileSync } from "node:fs";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDatabase } from "../src/db/client";
import { assertSafeTestDatabaseTarget } from "../src/db/safety";
import { partnerCompanies, partnerCollaborations, partnerCollaborationProjects, partnerEvents, projects, studioRoles } from "../src/db/schema";
import { collaborationSchema } from "../src/partners/policy";
const databaseUrl=process.env.TEST_DATABASE_URL;
if(!databaseUrl)throw new Error("TEST_DATABASE_URL must identify a disposable local database.");
assertSafeTestDatabaseTarget({testDatabaseUrl:databaseUrl,runtimeDatabaseUrl:process.env.DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL});
const mappingPath=process.argv[2];if(!mappingPath)throw new Error("Usage: node --import tsx scripts/seed-r4-collaborations.ts <explicit-mapping.json>");
const mapping=z.object({actorUserId:z.string().min(1),companiesByName:z.record(z.string(),z.uuid()),projectsByFixtureId:z.record(z.string(),z.string().min(1))}).strict().parse(JSON.parse(readFileSync(mappingPath,"utf8")));
const seed=z.array(z.object({id:z.string(),company:z.string(),title:z.string(),year:z.number(),status:z.enum(["current","past"]),visibility:z.enum(["public","limited","private"]),project_id:z.string().nullable()}).strict()).parse(JSON.parse(readFileSync("tests/fixtures/r4/collaboration_seed.json","utf8")));
const {db,client}=createDatabase(databaseUrl);
try {
 const [version]=await db.execute(sql`show server_version_num`);if(Number(version.server_version_num)<170000||Number(version.server_version_num)>=180000)throw new Error("Disposable PostgreSQL 17 required.");
 await db.transaction(async tx=>{
  const [role]=await tx.select().from(studioRoles).where(eq(studioRoles.userId,mapping.actorUserId)).for("share");if(!role||!["xr_admin","platform_super_admin"].includes(role.role))throw new Error("Mapping actor must be an existing authorized staff user.");
  for(const row of seed){
   const companyId=mapping.companiesByName[row.company];if(!companyId)throw new Error(`Missing company mapping for ${row.company}`);
   const [company]=await tx.select().from(partnerCompanies).where(eq(partnerCompanies.id,companyId));if(!company||company.content.name!==row.company)throw new Error(`Company mapping does not resolve exactly: ${row.company}`);
   const projectId=row.project_id?mapping.projectsByFixtureId[row.project_id]:null;
   if(row.project_id&&!projectId)throw new Error(`Missing project mapping: ${row.project_id}`);
   if(projectId&&!(await tx.select().from(projects).where(eq(projects.id,projectId))).length)throw new Error(`Unresolved project mapping: ${row.project_id}`);
   const prior=await tx.select().from(partnerEvents).where(and(eq(partnerEvents.action,"r4_fixture_seed"),eq(partnerEvents.subjectId,row.id)));if(prior.length)throw new Error(`Fixture ${row.id} already seeded; inspect its audit record instead of duplicating it.`);
   const content=collaborationSchema.parse({companyId,title:row.title,description:"",outcome:"",year:row.year,date:null,status:row.status,visibility:row.visibility,projectIds:projectId?[projectId]:[],participantIds:[]});
   const [saved]=await tx.insert(partnerCollaborations).values({companyId,content}).returning();
   if(projectId)await tx.insert(partnerCollaborationProjects).values({collaborationId:saved.id,projectId});
   await tx.insert(partnerEvents).values({actorUserId:mapping.actorUserId,action:"r4_fixture_seed",subjectId:row.id,snapshot:{fixture:row,resolvedCompanyId:companyId,resolvedProjectId:projectId,collaborationId:saved.id}});
   console.log(`${row.id}: company=${companyId}; ${row.project_id??"no project"} -> ${projectId??"none"}; collaboration=${saved.id}`);
  }
 });
 console.log("Exact collaboration seed committed to the disposable database. Descriptions, outcomes and participants still require honest manual completion.");
} finally {await client.end();}
