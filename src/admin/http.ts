import { githubRepository } from "@/projects/repository-url";
import { z } from "zod";
import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import type { Database } from "@/db/client";
import { readBody, errorResponse } from "@/projects/http";
import { GitHubImportError } from "@/projects/github-import";
import { adminGitHubSuggestions } from "./github";
import { accessList, adminActivity, adminCommand, adminCreate, adminDetail, adminDuplicates, adminIdentity, adminList, changeAccess, lockStaff } from "./service";
type Operation = "list" | "create" | "detail" | "command" | "import" | "activity" | "access" | "identity" | "duplicates";
export function createAdminHandler(deps: { authorize: (r: Request) => Promise<{ id: string }>; database: () => Database; origin?: string; fetcher?: typeof fetch }) {
  return async (request: Request, operation: Operation, id?: string) => {
    const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
    try {
      const actor = (await deps.authorize(request)).id; const db = deps.database();
      let result: unknown;
      if (request.method === "GET") {
        if (operation === "list") result = await adminList(db, actor);
        else if (operation === "detail") result = await adminDetail(db, actor, id!);
        else if (operation === "activity") result = await adminActivity(db, actor);
        else if (operation === "access") result = await accessList(db, actor);
        else if (operation === "identity") result = await adminIdentity(db, actor);
        else return Response.json({ error: { message: "Method not allowed" } }, { status: 405, headers });
      } else if (request.method === "POST") {
        const raw = await readBody(request, deps.origin);
        if (operation === "create") result = await adminCreate(db, actor, z.object({ content: z.unknown() }).strict().parse(raw).content);
        else if (operation === "command") result = await adminCommand(db, actor, id!, raw);
        else if (operation === "access") result = await changeAccess(db, actor, raw);
        else if (operation === "duplicates") {
          const body = z.object({ repositoryUrl: z.string().max(2048).refine(v => { try { return !v || Boolean(githubRepository(v)); } catch { return false; } }), title: z.string().trim().max(160) }).strict().parse(raw);
          result = await adminDuplicates(db, actor, body.repositoryUrl ? githubRepository(body.repositoryUrl).key : "", body.title);
        }
        else if (operation === "import") {
          const body = z.object({ repositoryUrl: z.string().max(2048) }).strict().parse(raw);
          await db.transaction(async tx => { await lockStaff(tx, actor, true); });
          const suggestions = await adminGitHubSuggestions(body.repositoryUrl, deps.fetcher);
          // Recheck role after upstream I/O; do not retain DB locks during network requests.
          const duplicates = await adminDuplicates(db, actor, suggestions.originalRepository, suggestions.title);
          result = { suggestions, duplicates };
        } else return Response.json({ error: { message: "Method not allowed" } }, { status: 405, headers });
      } else return Response.json({ error: { message: "Method not allowed" } }, { status: 405, headers });
      return Response.json(result, { status: operation === "create" ? 201 : 200, headers });
    } catch (error) {
      const response = error instanceof GitHubImportError ? Response.json({ error: { code: error.code, message: error.message } }, { status: error.status }) : errorResponse(error);
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      return response;
    }
  };
}
export const handleAdmin = createAdminHandler({ authorize: requireAuthenticatedRequestUser, database: getRuntimeDatabase, origin: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined });
