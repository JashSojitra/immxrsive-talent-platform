import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuthenticatedRequestUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { affiliationVerificationRateLimits as limits, mediaAssets, projectScreenshots, studentProfiles } from "@/db/schema";
import { authorizeScreenshots, checkScreenshotCapacity, screenshotState, auditScreenshots } from "@/projects/screenshots";
import { screenshotTextSchema } from "@/projects/screenshots-policy";
import { lockStaff, fail } from "@/admin/service";
import { errorResponse, readBody } from "@/projects/http";
import { createRateLimitKey } from "@/verification/security";
import { processImage, MAX_IMAGE_BYTES } from "@/updates/image";
import { applicationOrigin, privateHeaders } from "@/updates/http";

export const runtime = "nodejs";
function screenshotHeader(request: Request, name: string) {
  try { return decodeURIComponent(request.headers.get(name) || ""); }
  catch { fail("INVALID_SCREENSHOT_TEXT", 422, "Use valid screenshot descriptions."); }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedRequestUser(request);
    if (request.headers.get("origin") !== (applicationOrigin ?? new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") fail("INVALID_ORIGIN", 403);
    const kind = z.enum(["avatar", "article_cover", "article_inline", "project_screenshot"]).parse(request.headers.get("x-media-kind"));
    const projectId = kind === "project_screenshot" ? z.string().trim().min(1).max(200).parse(request.headers.get("x-project-id")) : null;
    const screenshotText = kind === "project_screenshot" ? screenshotTextSchema.parse({ altText: screenshotHeader(request, "x-alt-text"), caption: screenshotHeader(request, "x-caption") }) : null;
    const position = z.enum(["centre", "north", "south", "east", "west"]).parse(request.headers.get("x-crop-position") || "centre");
    if (!["image/jpeg", "image/png", "image/webp"].includes(request.headers.get("content-type") || "")) fail("INVALID_IMAGE", 422);
    const db = getRuntimeDatabase();
    await db.transaction(async tx => {
      if (kind === "avatar") {
        const [owner] = await tx.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.ownerUserId, actor.id));
        if (!owner) fail("PROFILE_REQUIRED", 422, "Save your private profile before uploading a photo.");
      } else if (projectId) { await authorizeScreenshots(tx, projectId, actor.id); await checkScreenshotCapacity(tx, projectId); }
      else await lockStaff(tx, actor.id, true);
    });
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) fail("SERVER_CONFIGURATION", 503);
    const key = createRateLimitKey(secret, "media_upload", actor.id);
    // Same persistent, atomic fixed-window protection as affiliation mutations.
    const [rate] = await db.insert(limits).values({ keyHash: key, action: "media_upload", windowStartedAt: new Date(), attemptCount: 1 }).onConflictDoUpdate({ target: limits.keyHash, set: {
      attemptCount: sql`CASE WHEN ${limits.windowStartedAt} < now() - interval '15 minutes' THEN 1 ELSE ${limits.attemptCount} + 1 END`,
      windowStartedAt: sql`CASE WHEN ${limits.windowStartedAt} < now() - interval '15 minutes' THEN now() ELSE ${limits.windowStartedAt} END`, updatedAt: new Date(),
    } }).returning();
    if (rate.attemptCount > 20) fail("RATE_LIMITED", 429, "Try again in 15 minutes.");
    if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES) fail("PAYLOAD_TOO_LARGE", 413);
    const reader = request.body?.getReader(); if (!reader) fail("IMAGE_REQUIRED", 422);
    const chunks: Buffer[] = []; let size = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_IMAGE_BYTES) { await reader.cancel(); fail("PAYLOAD_TOO_LARGE", 413); } chunks.push(Buffer.from(value)); } } finally { reader.releaseLock(); }
    let processed;
    try { processed = await processImage(Buffer.concat(chunks), kind, position); } catch { fail("INVALID_IMAGE", 422, "Use a static JPG, PNG or WebP up to 8 MB and 40 megapixels."); }
    const result = await db.transaction(async tx => {
      if (projectId) await authorizeScreenshots(tx, projectId, actor.id);
      else if (kind !== "avatar") await lockStaff(tx, actor.id, true);
      const displayOrder = projectId ? await checkScreenshotCapacity(tx, projectId) : 0;
      const [media] = await tx.insert(mediaAssets).values({ ...processed, kind, ownerUserId: actor.id }).returning({ id: mediaAssets.id, width: mediaAssets.width, height: mediaAssets.height });
      if (projectId && screenshotText) {
        await tx.insert(projectScreenshots).values({ projectId, mediaId: media.id, ...screenshotText, displayOrder, createdBy: actor.id });
        await auditScreenshots(tx, projectId, actor.id, "screenshot_upload");
        return screenshotState(tx, projectId);
      }
      return media;
    });
    return Response.json(result, { status: 201, headers: privateHeaders });
  } catch (e) { const r = errorResponse(e); Object.entries(privateHeaders).forEach(([k,v]) => r.headers.set(k,v)); return r; }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthenticatedRequestUser(request);
    const { mediaId } = z.object({ mediaId: z.uuid().nullable() }).strict().parse(await readBody(request, applicationOrigin));
    await getRuntimeDatabase().transaction(async tx => {
      const [profile] = await tx.select().from(studentProfiles).where(eq(studentProfiles.ownerUserId, actor.id)).for("update");
      if (!profile) fail("NOT_FOUND", 404);
      if (mediaId) { const [m] = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.ownerUserId, actor.id), eq(mediaAssets.kind, "avatar"))); if (!m) fail("FORBIDDEN", 403); }
      await tx.update(studentProfiles).set({ avatarMediaId: mediaId, updatedAt: new Date() }).where(eq(studentProfiles.id, profile.id));
    });
    return Response.json({ saved: true }, { headers: privateHeaders });
  } catch (e) { return errorResponse(e); }
}
