import "server-only";
import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { adminEvents, mediaAssets, projectMemberships, projectScreenshots, projects, studentAffiliations, studentProfiles } from "@/db/schema";
import { fail, lockStaff } from "@/admin/service";
import { screenshotUpdateSchema, type ScreenshotState } from "./screenshots-policy";
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function authorizeScreenshots(tx: Tx, projectId: string, actor: string, write = true) {
  const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)).for(write ? "update" : "share");
  if (!project) fail("NOT_FOUND", 404);
  if (project.managementMode === "ADMIN_MANAGED") await lockStaff(tx, actor, write);
  else {
    const [verified] = await tx.select({ id: studentProfiles.id }).from(studentProfiles).innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId)).where(and(eq(studentProfiles.ownerUserId, actor), eq(studentAffiliations.status, "verified"))).for("share");
    if (!verified) fail("FORBIDDEN", 403);
    if (project.maintainerUserId !== actor) {
      const [member] = await tx.select({ id: projectMemberships.id }).from(projectMemberships).where(and(eq(projectMemberships.projectId, projectId), eq(projectMemberships.profileId, verified.id), eq(projectMemberships.state, "accepted"))).for("share");
      if (!member) fail("FORBIDDEN", 403);
    }
  }
  return project;
}
export async function screenshotState(db: Pick<Database, "select">, projectId: string): Promise<ScreenshotState> {
  const rows = await db.select({ id: projectScreenshots.id, mediaId: projectScreenshots.mediaId, altText: projectScreenshots.altText, caption: projectScreenshots.caption }).from(projectScreenshots).where(eq(projectScreenshots.projectId, projectId)).orderBy(asc(projectScreenshots.displayOrder), asc(projectScreenshots.id));
  return { screenshots: rows.map(({ mediaId, ...row }) => ({ ...row, url: `/media/${mediaId}` })), revision: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
}
export async function listScreenshots(db: Database, actor: string, projectId: string) {
  return db.transaction(async tx => { await authorizeScreenshots(tx, projectId, actor, false); return screenshotState(tx, projectId); });
}
export async function checkScreenshotCapacity(tx: Tx, projectId: string) {
  const rows = await tx.select({ id: projectScreenshots.id }).from(projectScreenshots).where(eq(projectScreenshots.projectId, projectId));
  if (rows.length >= 10) fail("SCREENSHOT_LIMIT", 422, "A project can have at most 10 screenshots.");
  return rows.length;
}
export async function auditScreenshots(tx: Tx, projectId: string, actor: string, action: string) {
  const [p] = await tx.select({ mode: projects.managementMode }).from(projects).where(eq(projects.id, projectId));
  if (p?.mode === "ADMIN_MANAGED") await tx.insert(adminEvents).values({ projectId, actorUserId: actor, action, note: "", snapshot: { screenshotIds: (await screenshotState(tx, projectId)).screenshots.map(s => s.id) } });
}
export async function updateScreenshots(db: Database, actor: string, projectId: string, raw: unknown) {
  const input = screenshotUpdateSchema.parse(raw);
  return db.transaction(async tx => {
    await authorizeScreenshots(tx, projectId, actor);
    const current = await screenshotState(tx, projectId);
    if (current.revision !== input.revision) fail("EDIT_CONFLICT", 409, "Screenshots changed in another session. Reload the screenshots before retrying.");
    if (new Set(input.screenshots.map(s => s.id)).size !== input.screenshots.length || input.screenshots.some(s => !current.screenshots.some(c => c.id === s.id))) fail("INVALID_SCREENSHOTS", 422);
    const removed = current.screenshots.filter(c => !input.screenshots.some(s => s.id === c.id));
    if (removed.length) {
      const mediaIds = removed.map(s => s.url.slice('/media/'.length));
      await tx.delete(projectScreenshots).where(and(eq(projectScreenshots.projectId, projectId), inArray(projectScreenshots.id, removed.map(s => s.id))));
      await tx.delete(mediaAssets).where(inArray(mediaAssets.id, mediaIds));
    }
    for (const [displayOrder, item] of input.screenshots.entries()) await tx.update(projectScreenshots).set({ altText: item.altText, caption: item.caption, displayOrder }).where(and(eq(projectScreenshots.projectId, projectId), eq(projectScreenshots.id, item.id)));
    await auditScreenshots(tx, projectId, actor, "screenshots_update");
    return screenshotState(tx, projectId);
  });
}
