import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { readBody, errorResponse } from "@/projects/http";
import { saveArticle, respondToStory } from "./service";
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export const applicationOrigin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined;
export async function articleMutation(request: Request, student = false) {
  try {
    const actor = await requireAuthenticatedRequestUser(request);
    const body = await readBody(request, applicationOrigin);
    const result = await (student ? respondToStory : saveArticle)(getRuntimeDatabase(), actor.id, body);
    return Response.json(result, { headers: privateHeaders });
  } catch (e) { const response = errorResponse(e); Object.entries(privateHeaders).forEach(([k, v]) => response.headers.set(k, v)); return response; }
}
