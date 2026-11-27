import { asc, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { projectScreenshots } from "@/db/schema";
export async function queryProjectScreenshots(db: Pick<Database, "select">, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.select({ projectId: projectScreenshots.projectId, id: projectScreenshots.id, mediaId: projectScreenshots.mediaId, altText: projectScreenshots.altText, caption: projectScreenshots.caption }).from(projectScreenshots).where(inArray(projectScreenshots.projectId, ids)).orderBy(asc(projectScreenshots.displayOrder), asc(projectScreenshots.id));
  return rows.map(({ mediaId, ...row }) => ({ ...row, url: `/media/${mediaId}` }));
}
