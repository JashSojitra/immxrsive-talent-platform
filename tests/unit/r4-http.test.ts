import { beforeEach, expect, test, vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/auth/server",()=>({requireAuthenticatedRequestUser:vi.fn(),requireVerifiedRequestStudent:vi.fn(),AuthenticationRequiredError:class extends Error {status=401;},AffiliationVerificationRequiredError:class extends Error{}}));
vi.mock("@/db/runtime",()=>({getRuntimeDatabase:vi.fn()}));
vi.mock("@/admin/service",()=>({lockStaff:vi.fn()}));
vi.mock("@/partners/service",()=>({staffQueue:vi.fn(),saveCompany:vi.fn(),saveCollaboration:vi.fn(),decideRequest:vi.fn(),importProposal:vi.fn(),submitRequest:vi.fn(),maintainerRequests:vi.fn()}));
import { createPartnerHandler } from "@/partners/http";
import { lockStaff } from "@/admin/service";
import { submitRequest, saveCompany } from "@/partners/service";
import { AuthenticationRequiredError } from "@/auth/server";
import { ProjectError } from "@/projects/service";
import type { Database } from "@/db/client";
const db={transaction:async(fn:(tx:unknown)=>unknown)=>fn({})} as unknown as Database;
const origin="https://app.example.org";
const handler=createPartnerHandler({authorize:async()=>({id:"session-actor"}),database:()=>db,origin});
const request=(body:string,headers={})=>new Request(`${origin}/api/admin/partners/companies`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json",...headers},body});
beforeEach(()=>vi.clearAllMocks());
test("anonymous blocked before database access",async()=>{
 const database=vi.fn();const h=createPartnerHandler({authorize:async()=>{throw new AuthenticationRequiredError();},database});
 expect((await h(new Request(origin),"queue")).status).toBe(401);expect(database).not.toHaveBeenCalled();
});
test("staff denial occurs before mutation/body validation",async()=>{
 vi.mocked(lockStaff).mockRejectedValueOnce(new ProjectError("FORBIDDEN",403,"Forbidden"));
 expect((await handler(request("{"),"companies")).status).toBe(403);expect(saveCompany).not.toHaveBeenCalled();
});
test.each([[{Origin:"https://evil.example"},403],[{"Content-Type":"text/plain"},400],[{"sec-fetch-site":"cross-site"},403]])("same-origin JSON guard %j",async(headers,status)=>{
 expect((await handler(request("{}",headers),"companies")).status).toBe(status);expect(saveCompany).not.toHaveBeenCalled();
});
test("student submission receives only session actor",async()=>{
 vi.mocked(submitRequest).mockResolvedValue({id:"request"} as never);
 expect((await handler(request('{"note":"evidence"}'),"requests",true)).status).toBe(200);
 expect(submitRequest).toHaveBeenCalledWith(db,"session-actor",{note:"evidence"});
});
