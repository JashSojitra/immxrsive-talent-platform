import "./setup";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { beforeAll, afterAll, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { createDatabase } from "@/db/client";
import { authUsers, studentProfiles, affiliationVerificationRateLimits } from "@/db/schema";
import { createRateLimitKey } from "@/verification/security";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({actor:""}));
vi.mock("@/auth/server",async importOriginal=>({...await importOriginal<typeof import("@/auth/server")>(),requireAuthenticatedRequestUser:async()=>({id:state.actor})}));
import { POST, PATCH } from "@/app/api/media/route";
import { GET } from "@/app/media/[id]/route";
const c=createDatabase(process.env.TEST_DATABASE_URL!);const owner=randomUUID(),other=randomUUID();const origin="http://127.0.0.1:3100";let input:Buffer;
beforeAll(async()=>{
  await migrate(c.db,{migrationsFolder:"drizzle"});
  await c.db.insert(authUsers).values([owner,other].map(id=>({id,name:"Synthetic media owner",email:`${id}@example.test`})));await c.db.insert(studentProfiles).values([owner,other].map(ownerUserId=>({ownerUserId})));
  input=await sharp({create:{width:1000,height:700,channels:3,background:"#e31c79"}}).png().withMetadata().toBuffer();state.actor=owner;
});
afterAll(async()=>{await c.client.end();});
const upload=(headers:Record<string,string>={})=>POST(new Request(`${origin}/api/media`,{method:"POST",headers:{Origin:origin,"Content-Type":"image/png","X-Media-Kind":"avatar",...headers},body:new Uint8Array(input)}));
test("stored WebP bytes round-trip with immutable caching and an ETag; avatar ownership is enforced",async()=>{
  const response=await upload();expect(response.status).toBe(201);const {id}=await response.json();
  const image=await GET(new Request(`${origin}/media/${id}`),{params:Promise.resolve({id})});expect(image.headers.get("content-type")).toBe("image/webp");expect(image.headers.get("cache-control")).toContain("immutable");
  const metadata=await sharp(Buffer.from(await image.arrayBuffer())).metadata();expect([metadata.width,metadata.height]).toEqual([512,512]);expect(metadata.exif).toBeUndefined();
  expect((await GET(new Request(`${origin}/media/${id}`,{headers:{"If-None-Match":image.headers.get("etag")!}}),{params:Promise.resolve({id})})).status).toBe(304);
  const setAvatar=()=>PATCH(new Request(`${origin}/api/media`,{method:"PATCH",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({mediaId:id})}));
  expect((await setAvatar()).status).toBe(200);const [profile]=await c.db.select().from(studentProfiles).where(eq(studentProfiles.ownerUserId,owner));expect(profile.avatarMediaId).toBe(id);
  state.actor=other;expect((await setAvatar()).status).toBe(403);state.actor=owner;
});
test("uploads reject forged origins, oversized bodies and non-staff article media",async()=>{
  expect((await upload({Origin:"https://example.test"})).status).toBe(403);expect((await upload({"Content-Length":String(8*1024*1024+1)})).status).toBe(413);expect((await upload({"X-Media-Kind":"article_cover"})).status).toBe(403);
});
test("uploads use a persistent per-owner rate limit",async()=>{
  const key=createRateLimitKey(process.env.BETTER_AUTH_SECRET!,"media_upload",owner);
  await c.db.update(affiliationVerificationRateLimits).set({attemptCount:20,windowStartedAt:new Date()}).where(eq(affiliationVerificationRateLimits.keyHash,key));expect((await upload()).status).toBe(429);
});
