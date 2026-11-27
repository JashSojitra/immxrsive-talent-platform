import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { errorResponse, readBody } from "@/projects/http";
import { listScreenshots, updateScreenshots } from "@/projects/screenshots";
import { applicationOrigin, privateHeaders } from "@/updates/http";
async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuthenticatedRequestUser(request);
    const { id } = await context.params;
    const db = getRuntimeDatabase();
    const result = request.method === "GET" ? await listScreenshots(db, actor.id, id) : await updateScreenshots(db, actor.id, id, await readBody(request, applicationOrigin));
    return Response.json(result, { headers: privateHeaders });
  } catch (error) { const response = errorResponse(error); Object.entries(privateHeaders).forEach(([k,v]) => response.headers.set(k,v)); return response; }
}
export const GET = handle;
export const PATCH = handle;
