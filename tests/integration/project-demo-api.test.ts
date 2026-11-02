import "./setup";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDatabase, type Database } from "@/db/client";
import * as s from "@/db/schema";
import * as service from "@/projects/service";
import { queryPublicProject } from "@/db/queries/project-detail";
import { queryPublicStudentProfile } from "@/db/queries/student-profile";
import { importFixtureData } from "@/fixtures/import";
import { loadFixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";
const target = process.env.TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
const draft = { title: "Demo resilience QA", description: "Independent media evidence", domain: "XR", technologies: ["Unity"] };
suite("typed project demo and public privacy", () => {
  let db: Database; let close: () => Promise<void>;
  let ids: string[], users: string[], profiles: string[];
  beforeAll(async () => {
    const connection = createDatabase(target!, 5); db = connection.db; close = () => connection.client.end();
    await migrate(db, { migrationsFolder: "drizzle" });
    await importFixtureData(db, validateFixtureData(await loadFixtureSource()));

  });
  beforeEach(async () => {
    ids = []; users = []; profiles = [];
    for (let i = 0; i < 4; i++) {
      const id = randomUUID(); users.push(id);
      await db.insert(s.authUsers).values({ id, name: `Phase3 Student ${i}`, email: `${id}@example.test` });
      if (i < 3) await db.insert(s.studentAffiliations).values({ userId: id, institutionalEmail: `${id}@algomau.ca`, verifiedAt: new Date() });
      const [profile] = await db.insert(s.studentProfiles).values({ ownerUserId: id, publicationStatus: "published", studentStatus: "current", headline: "XR work", biography: "Synthetic test profile", program: "Computing" }).returning(); profiles.push(profile.id);
    }
  });
  afterEach(async () => {
    if (ids.length) {
      await db.delete(s.projectJoinRequests).where(inArray(s.projectJoinRequests.projectId, ids));
      await db.delete(s.projectMaintainerTransfers).where(inArray(s.projectMaintainerTransfers.projectId, ids));
      const members = await db.select().from(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      if (members.length) await db.delete(s.projectContributions).where(inArray(s.projectContributions.membershipId, members.map(m => m.id)));
      await db.delete(s.projectMemberships).where(inArray(s.projectMemberships.projectId, ids));
      await db.delete(s.projectRepositories).where(inArray(s.projectRepositories.projectId, ids));
      await db.delete(s.projectLinks).where(inArray(s.projectLinks.projectId, ids));
      await db.delete(s.projectMedia).where(inArray(s.projectMedia.projectId, ids));
      await db.delete(s.inquiries).where(inArray(s.inquiries.projectId, ids));
      await db.delete(s.projects).where(inArray(s.projects.id, ids));
    }
    await db.delete(s.authUsers).where(inArray(s.authUsers.id, users));
  });
  afterAll(async () => close?.());
  const ctx = (i=0) => ({db,actorUserId:users[i]});
  async function create(media: unknown) { const p=await service.createProject({...ctx(),draft:{...draft,media},creatorRoleId:"xr-developer"});ids.push(p.id);return p; }
  const media = [{kind:"playable",url:"/fixtures/r3/working_demo.html",label:"Course interactive demo"},{kind:"video",url:"https://example.com/demo.mp4",label:"Video"},{kind:"source",url:"https://github.com/example/demo",label:"Source"},{kind:"fallback_image",url:"/fixtures/r3/fallback.svg",label:"Course fallback",altText:"Alternate evidence for the interaction fixture"},{kind:"fallback_video",url:"https://example.com/fallback.mp4",label:"Alternate video"},{kind:"fallback_link",url:"https://example.com/evidence",label:"Alternate link"}];
  test("all typed evidence persists separately, including hosted fixture paths and public descriptions",async()=>{
    const p=await create(media);expect(await queryPublicProject(db,p.id)).toBeNull();await service.setProjectPublication({...ctx(),projectId:p.id,version:1,published:true});
    const publicProject=await queryPublicProject(db,p.id);expect(publicProject?.assets).toHaveLength(6);
    expect(publicProject?.assets).toContainEqual({type:"fallback_image",url:"/fixtures/r3/fallback.svg",label:"Course fallback",altText:"Alternate evidence for the interaction fixture"});
    expect((await db.select().from(s.projectMedia).where(eq(s.projectMedia.projectId,p.id))).map(m=>m.kind).sort()).toEqual(media.map(m=>m.kind).sort());
    expect((await queryPublicStudentProfile(db,profiles[0]))?.skills).not.toContain("Unity");
  });
  test.each(["playable","video","source","fallback_image","fallback_video","fallback_link"])("%s-only projects remain valid without inventing other media",async kind=>{
    const evidence=media.find(m=>m.kind===kind)!;const p=await create([evidence]);await service.setProjectPublication({...ctx(),projectId:p.id,version:1,published:true});
    expect((await queryPublicProject(db,p.id))?.assets.map(a=>a.type)).toEqual([kind]);
  });
  test("unsafe/local/arbitrary-relative and raw embed inputs never persist",async()=>{
    for(const url of ["javascript:alert(1)","data:text/html,test","https://localhost/x","http://127.0.0.1:3100/demo","/student/profile/edit","/fixtures/r3/working_demo.html?evil=1"])await expect(create([{kind:"playable",url,label:"Unsafe"}])).rejects.toMatchObject({code:"VALIDATION_ERROR"});
    await expect(service.createProject({...ctx(),draft:{...draft,iframe:"<iframe src=x>"},creatorRoleId:"xr-developer"})).rejects.toMatchObject({code:"VALIDATION_ERROR"});
  });
  test("unpublished projects and removed personal relationships never leak typed evidence",async()=>{
    const p=await create(media);const m=await service.inviteContributor({...ctx(),projectId:p.id,version:1,profileId:profiles[1],roleId:"xr-developer"});await service.respondToInvitation({...ctx(1),membershipId:m.id,version:1,accept:true});await service.setProjectPublication({...ctx(),projectId:p.id,version:3,published:true});
    expect((await queryPublicStudentProfile(db,profiles[1]))?.projects).toHaveLength(1);
    await service.setMembershipRemoved({...ctx(),membershipId:m.id,version:2,removed:true});expect((await queryPublicStudentProfile(db,profiles[1]))?.projects).toEqual([]);
    expect((await queryPublicProject(db,p.id))?.contributors.map(c=>c.studentId)).not.toContain(profiles[1]);
    await service.setProjectPublication({...ctx(),projectId:p.id,version:5,published:false});expect(await queryPublicProject(db,p.id)).toBeNull();expect((await queryPublicStudentProfile(db,profiles[0]))?.projects).toEqual([]);
  });
});
