import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { errorResponse, readBody } from "@/projects/http";
import { studioCommand, studioDetail, studioList } from "./service";
export async function handleStudio(request: Request, projectId?: string) {
  try {
    const user = await requireAuthenticatedRequestUser(request);
    const db = getRuntimeDatabase();
    const result = projectId
      ? request.method === "GET" ? await studioDetail(db, user.id, projectId)
        : await studioCommand(db, user.id, projectId, await readBody(request, process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined))
      : await studioList(db, user.id, true);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
