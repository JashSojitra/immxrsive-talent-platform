import { createHmac, randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { projectAssets, projectRepositories, projects } from "@/db/schema";
import { repositoryKey, type ProjectDraft } from "./validation";

type Reader = Pick<Database, "select" | "execute">;
const signingKey = process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("hex");
export type DuplicateResult = { hasExactMatch: boolean; acknowledgement: string; matches: Array<{ id: string; title: string; kind: "repository" | "similar_title"; canRequestJoin: boolean }> };
export function similarProjectName(a: string, b: string) {
  const words = (s: string) => new Set(s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? []);
  const x = words(a), y = words(b); if (!x.size || !y.size) return false;
  return [...x].filter(w => y.has(w)).length / new Set([...x,...y]).size >= .65;
}
export async function lockRepositoryKeys(tx: Reader, keys: string[]) {
  for (const key of [...new Set(keys)].sort()) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
}
export async function queryProjectDuplicates(db: Reader, draft: Pick<ProjectDraft, "title" | "domain" | "repositories">, actorUserId: string): Promise<DuplicateResult> {
  const keys = [...new Set(draft.repositories.map(r => repositoryKey(r.url)))].sort();
  const exact = new Map<string, { id: string; title: string; publicationStatus: string; origin: string; maintainerUserId: string | null }>();
  if (keys.length) {
    const rows = await db.select({ id: projects.id, title: projects.title, publicationStatus: projects.publicationStatus, origin: projects.origin, maintainerUserId: projects.maintainerUserId })
      .from(projectRepositories).innerJoin(projects, eq(projects.id, projectRepositories.projectId)).where(inArray(projectRepositories.normalizedKey, keys));
    rows.forEach(r => exact.set(r.id, r));
    // Historical fixture repository assets remain intact; normalize on read.
    const legacy = await db.select({ id: projects.id, title: projects.title, publicationStatus: projects.publicationStatus, origin: projects.origin, maintainerUserId: projects.maintainerUserId, url: projectAssets.url })
      .from(projectAssets).innerJoin(projects, eq(projects.id, projectAssets.projectId));
    for (const row of legacy) { try { if (keys.includes(repositoryKey(row.url))) exact.set(row.id, row); } catch { /* malformed optional legacy evidence is ignored */ } }
  }
  // Limit advisory title candidates to public, same-domain projects. Different
  // domain/same title is intentionally distinct (official fixture case 3).
  const candidates = draft.title.trim() ? await db.select({ id: projects.id, title: projects.title, origin: projects.origin, maintainerUserId: projects.maintainerUserId }).from(projects)
    .where(and(eq(projects.publicationStatus, "published"), sql`lower(${projects.domain}) = lower(${draft.domain})`)).orderBy(projects.id).limit(250) : [];
  const matches: DuplicateResult["matches"] = [...exact.values()].filter(r => r.publicationStatus === "published").map(r => ({ id: r.id, title: r.title, kind: "repository", canRequestJoin: r.origin === "student" && Boolean(r.maintainerUserId) && r.maintainerUserId !== actorUserId }));
  for (const row of candidates) if (!exact.has(row.id) && similarProjectName(draft.title, row.title)) matches.push({ id: row.id, title: row.title, kind: "similar_title", canRequestJoin: row.origin === "student" && Boolean(row.maintainerUserId) && row.maintainerUserId !== actorUserId });
  matches.sort((a,b) => a.id.localeCompare(b.id));
  // Opaque acknowledgement binds this account, repository set and current exact
  // candidates. It reveals neither private project IDs nor private counts.
  const acknowledgement = createHmac("sha256", signingKey).update(JSON.stringify([actorUserId, keys, [...exact.values()].map(r => [r.id,r.publicationStatus]).sort()])).digest("hex");
  return { hasExactMatch: exact.size > 0, acknowledgement, matches };
}
