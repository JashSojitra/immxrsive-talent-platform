import { eq } from "drizzle-orm";
import { z } from "zod";
import { getRuntimeDatabase } from "@/db/runtime";
import { mediaAssets } from "@/db/schema";
import { adminProjectDetails, projectScreenshots, projects } from "@/db/schema";
import { getAuthenticatedRequestUser } from "@/auth/server";
import { authorizeScreenshots } from "@/projects/screenshots";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const [m] = await getRuntimeDatabase().select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!m) return new Response(null, { status: 404 });
  let screenshotPublic = false;
  if (m.kind === "project_screenshot") {
    const db = getRuntimeDatabase();
    const [link] = await db.select({ projectId: projects.id, publication: projects.publicationStatus, mode: projects.managementMode, lifecycle: adminProjectDetails.lifecycle }).from(projectScreenshots).innerJoin(projects, eq(projects.id, projectScreenshots.projectId)).leftJoin(adminProjectDetails, eq(adminProjectDetails.projectId, projects.id)).where(eq(projectScreenshots.mediaId, id));
    if (!link) return new Response(null, { status: 404 });
    screenshotPublic = link.publication === "published" && (link.mode !== "ADMIN_MANAGED" || link.lifecycle === "published");
    if (!screenshotPublic) {
      const actor = await getAuthenticatedRequestUser(request);
      if (!actor) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
      try { await db.transaction(tx => authorizeScreenshots(tx, link.projectId, actor.id, false)); } catch { return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }); }
    }
  }
  const etag = `"${m.sha256}"`;
  const headers = { "Content-Type": m.mime, ETag: etag, "Cache-Control": m.kind === "project_screenshot" ? screenshotPublic ? "public, max-age=0, must-revalidate" : "private, no-store" : "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };
  if (request.headers.get("if-none-match")?.split(",").map(v => v.trim().replace(/^W\//, "")).includes(etag)) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(m.bytes), { headers: { ...headers, "Content-Length": String(m.byteSize) } });
}
