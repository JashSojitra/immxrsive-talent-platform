import { z } from "zod";
import { requireVerifiedRequestStudent } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { readBody, errorResponse, type Dependencies } from "./http";
import { importGitHubRepository, GitHubImportError } from "./github-import";
import { projectDraftSchema } from "./validation";
import { checkProjectDuplicates, requestToJoinProject, respondToJoinRequest, listOwnJoinRequests, verifyProjectStudent } from "./service";

export function createImportHandlers(deps: Dependencies & { githubFetch?: typeof fetch }) {
  return async (request: Request, action: "import" | "duplicates" | "join" | "respond" | "requests", id = "") => {
    try {
      const { user } = await deps.authorize(request);
      const ctx = { db: deps.database(), actorUserId: user.id };
      let result: unknown;
      if (action === "requests") result = { requests: await listOwnJoinRequests(ctx) };
      else {
        const body = await readBody(request, deps.applicationOrigin);
        if (action === "import") { await verifyProjectStudent(ctx); result = await importGitHubRepository(z.object({ url: z.string().max(2048) }).strict().parse(body).url, deps.githubFetch); }
        if (action === "duplicates") result = await checkProjectDuplicates({ ...ctx, draft: z.object({ draft: projectDraftSchema }).strict().parse(body).draft });
        if (action === "join") { z.object({}).strict().parse(body); await requestToJoinProject({ ...ctx, projectId: id }); result = { ok: true }; }
        if (action === "respond") { await respondToJoinRequest({ ...ctx, joinRequestId: id, ...z.object({ version: z.number().int().positive(), projectVersion: z.number().int().positive(), approve: z.boolean(), roleId: z.string().min(1).max(80).optional() }).strict().parse(body) }); result = { ok: true }; }
      }
      return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      const response = error instanceof GitHubImportError ? apiErrorResponse(error.status, error.code, error.message) : errorResponse(error);
      response.headers.set("Cache-Control", "private, no-store"); return response;
    }
  };
}
export const importHandlers = createImportHandlers({ authorize: requireVerifiedRequestStudent, database: getRuntimeDatabase,
  applicationOrigin: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined });
