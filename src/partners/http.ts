import { z } from "zod";
import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import type { Database } from "@/db/client";
import { readBody, errorResponse } from "@/projects/http";
import { lockStaff } from "@/admin/service";
import { staffQueue, saveCompany, saveCollaboration, decideRequest, importProposal, submitRequest, maintainerRequests } from "./service";
export function createPartnerHandler(deps: {authorize:(r:Request)=>Promise<{id:string}>;database:()=>Database;origin?:string}) {
 return async (request:Request, action:string, student = false) => {
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  try {
   const actor = (await deps.authorize(request)).id; const db = deps.database();
   if(!student) await db.transaction(tx => lockStaff(tx,actor,request.method !== "GET"));
   let result;
   if(request.method === "GET") result = student ? await maintainerRequests(db,actor,new URL(request.url).searchParams.get("projectId") ?? "") : await staffQueue(db,actor);
   else if(request.method === "POST") {
    const body = await readBody(request,deps.origin);
    if(student) result = await submitRequest(db,actor,body);
    else if(action === "companies") result = await saveCompany(db,actor,body);
    else if(action === "collaborations") result = await saveCollaboration(db,actor,body);
    else if(action === "decisions") result = await decideRequest(db,actor,body);
    else if(action === "import") result = await importProposal(db,actor,z.object({sourceUrl:z.string().max(2048)}).strict().parse(body).sourceUrl);
    else return Response.json({error:{message:"Unknown operation"}},{status:404,headers});
   } else return Response.json({error:{message:"Method not allowed"}},{status:405,headers});
   return Response.json(result,{headers});
  } catch(error) { const response = errorResponse(error); for(const [k,v] of Object.entries(headers)) response.headers.set(k,v); return response; }
 };
}
export const handlePartner = createPartnerHandler({authorize:requireAuthenticatedRequestUser,database:getRuntimeDatabase,origin:process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined});
