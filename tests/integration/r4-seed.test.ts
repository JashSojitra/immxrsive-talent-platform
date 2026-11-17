import "./setup";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { expect, test } from "vitest";
import { createDatabase } from "@/db/client";
import * as s from "@/db/schema";

test("exact collaboration seed resolves synthetic P01/P04 mappings and refuses duplicate audit entries", async () => {
 const c=createDatabase(process.env.TEST_DATABASE_URL!);
 const scratch=await mkdtemp(join(tmpdir(),"r4-seed-"));
 try {
  await migrate(c.db,{migrationsFolder:"drizzle"});
  const actorUserId=randomUUID();
  await c.db.insert(s.authUsers).values({id:actorUserId,name:"Synthetic seed staff",email:`${actorUserId}@example.test`});
  await c.db.insert(s.studioRoles).values({userId:actorUserId,role:"xr_admin"});
  const companiesByName:Record<string,string>={};
  for(const name of ["North Shore Simulations","Superior Immersive Labs"]){
   const [company]=await c.db.insert(s.partnerCompanies).values({content:{name,website:"",description:"Synthetic seed company",sector:"XR",location:"Ontario"}}).returning();
   companiesByName[name]=company.id;
  }
  const projectsByFixtureId:Record<string,string>={};
  for(const fixture of ["P01","P04"]){
   const id=randomUUID();projectsByFixtureId[fixture]=id;
   await c.db.insert(s.projects).values({id,title:`Synthetic ${fixture}`,description:"Disposable seed mapping",domain:"XR"});
  }
  const mapping=join(scratch,"mapping.json");
  await writeFile(mapping,JSON.stringify({actorUserId,companiesByName,projectsByFixtureId}));
  const run=()=>promisify(execFile)(process.execPath,["--import","tsx","scripts/seed-r4-collaborations.ts",mapping],{env:process.env,timeout:30000});
  await run();
  const rows=await c.db.select().from(s.partnerCollaborations);
  const edges=await c.db.select().from(s.partnerCollaborationProjects);
  const events=await c.db.select().from(s.partnerEvents);
  const fixtures=JSON.parse(readFileSync("tests/fixtures/r4/collaboration_seed.json","utf8"));
  expect(rows).toHaveLength(fixtures.length);expect(edges).toHaveLength(2);expect(events).toHaveLength(fixtures.length);
  for(const fixture of fixtures){
   const row=rows.find(r=>r.content.title===fixture.title)!;
   expect(row.content).toMatchObject({companyId:companiesByName[fixture.company],year:fixture.year,status:fixture.status,visibility:fixture.visibility,projectIds:fixture.project_id?[projectsByFixtureId[fixture.project_id]]:[]});
   expect(events.find(e=>e.subjectId===fixture.id)).toMatchObject({actorUserId,action:"r4_fixture_seed",snapshot:{collaborationId:row.id,resolvedProjectId:fixture.project_id?projectsByFixtureId[fixture.project_id]:null}});
   expect(edges.filter(e=>e.collaborationId===row.id).map(e=>e.projectId)).toEqual(row.content.projectIds);
  }
  await expect(run()).rejects.toThrow();
  expect(await c.db.select().from(s.partnerCollaborations)).toHaveLength(fixtures.length);
  expect(await c.db.select().from(s.partnerEvents)).toHaveLength(fixtures.length);
 } finally {await c.client.end();await rm(scratch,{recursive:true,force:true});}
},60000);
