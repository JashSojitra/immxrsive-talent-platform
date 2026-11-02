import { z } from "zod";
import { requireVerifiedRequestStudent, AuthenticationRequiredError, AffiliationVerificationRequiredError } from "@/auth/server";
import type { Database } from "@/db/client";
import { getRuntimeDatabase } from "@/db/runtime";
import { apiErrorResponse } from "@/lib/api-errors";
import { createProject, updateProject, setProjectPublication, getProjectEditorData, getProjectRoles, listMaintainedProjects, ProjectError } from "./service";
import { projectDraftSchema } from "./validation";

export type Dependencies = { authorize: (request: Request) => Promise<{ user: { id: string } }>; database: () => Database; applicationOrigin?: string };
const createSchema = z.object({ draft: projectDraftSchema, creatorRoleId: z.string().min(1).max(80), duplicateAcknowledgement: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
const editSchema = z.object({ draft: projectDraftSchema, version: z.number().int().positive() }).strict();
const publicationSchema = z.object({ version: z.number().int().positive(), published: z.boolean() }).strict();
const headers = { "Cache-Control": "private, no-store" };

export async function readBody(request: Request, applicationOrigin?: string) {
  // Next can reconstruct Request.url with an internal hostname. The configured
  // public origin is the trust boundary; never accept a client-supplied host as it.
  const expectedOrigin = applicationOrigin ?? new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ProjectError("INVALID_ORIGIN", 403, "Open the project editor on this site before saving.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ProjectError("INVALID_JSON", 400, "Send project information as JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ProjectError("INVALID_JSON", 400, "Project information is missing.");
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw new ProjectError("PAYLOAD_TOO_LARGE", 413, "Project information is too large."); }
      chunks.push(value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(body)) as unknown; }
    catch { throw new ProjectError("INVALID_JSON", 400, "Project information must be valid JSON."); }
  } finally { reader.releaseLock(); }
}
export function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return apiErrorResponse(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  if (error instanceof AffiliationVerificationRequiredError) return apiErrorResponse(403, "AFFILIATION_REQUIRED", "Verify your student affiliation before editing projects.");
  if (error instanceof ProjectError && error.duplicates) return Response.json({ error: { code: error.code, message: error.message }, duplicates: error.duplicates }, { status: 409, headers });
  if (error instanceof ProjectError) return apiErrorResponse(error.status, error.code, error.message);
  if (error instanceof z.ZodError) return apiErrorResponse(422, "VALIDATION_ERROR", "Review the highlighted project information.", error.issues.map(issue => ({ field: issue.path.join("."), code: issue.code.toUpperCase(), message: issue.message })));
  return apiErrorResponse(500, "INTERNAL_ERROR", "The project could not be saved. Your entered information is still available.");
}

export function createProjectHandlers(deps: Dependencies) {
  async function handle(request: Request, action: "list" | "get" | "create" | "edit" | "publication", projectId?: string) {
    try {
      const { user } = await deps.authorize(request);
      const ctx = { db: deps.database(), actorUserId: user.id };
      if (action === "list") return Response.json({ projects: await listMaintainedProjects(ctx) }, { headers });
      if (action === "get") return Response.json({ ...await getProjectEditorData({ ...ctx, projectId: projectId! }), roles: await getProjectRoles(ctx.db) }, { headers });
      const body = await readBody(request, deps.applicationOrigin);
      if (action === "create") {
        const data = createSchema.parse(body);
        const project = await createProject({ ...ctx, ...data });
        return Response.json(await getProjectEditorData({ ...ctx, projectId: project.id }), { status: 201, headers });
      }
      if (action === "edit") await updateProject({ ...ctx, projectId: projectId!, ...editSchema.parse(body) });
      else await setProjectPublication({ ...ctx, projectId: projectId!, ...publicationSchema.parse(body) });
      return Response.json(await getProjectEditorData({ ...ctx, projectId: projectId! }), { headers });
    } catch (error) { return errorResponse(error); }
  }
  return {
    list: (request: Request) => handle(request, "list"),
    create: (request: Request) => handle(request, "create"),
    get: (request: Request, id: string) => handle(request, "get", id),
    edit: (request: Request, id: string) => handle(request, "edit", id),
    publication: (request: Request, id: string) => handle(request, "publication", id),
  };
}
export const projectHandlers = createProjectHandlers({ authorize: requireVerifiedRequestStudent, database: getRuntimeDatabase, applicationOrigin: process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : undefined });
