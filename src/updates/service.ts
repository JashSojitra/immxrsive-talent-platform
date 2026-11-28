import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { articles, adminEvents, studentProfiles, mediaAssets, authUsers } from "@/db/schema";
import { fail, lockStaff } from "@/admin/service";
import { articleInput, approvalInvalidated, publishIssues } from "./policy";

export async function staffArticles(db: Database, actor: string) {
  return db.transaction(async tx => { await lockStaff(tx, actor); return tx.select().from(articles).orderBy(desc(articles.updatedAt)); });
}
export async function saveArticle(db: Database, actor: string, raw: unknown) {
  const c = z.object({ id: z.uuid().optional(), version: z.number().int().positive().optional(), action: z.enum(["draft", "in_review", "published", "archived", "request_approval"]), content: articleInput }).strict().parse(raw);
  return db.transaction(async tx => {
    await lockStaff(tx, actor, true);
    const [before] = c.id ? await tx.select().from(articles).where(eq(articles.id, c.id)).for("update") : [];
    if (c.id && !before) fail("NOT_FOUND", 404);
    if (before && c.version !== before.version) fail("EDIT_CONFLICT", 409, "This post changed. Reload before saving.");
    const approved = before?.studentApprovedAt && !approvalInvalidated(before, c.content) ? before.studentApprovedAt : null;
    const [profile] = c.content.studentProfileId ? await tx.select().from(studentProfiles).where(eq(studentProfiles.id, c.content.studentProfileId)).for("share") : [];
    if (c.content.studentProfileId && !profile) fail("PROFILE_NOT_FOUND", 422);
    if (c.content.coverMediaId) {
      const [media] = await tx.select({ kind: mediaAssets.kind }).from(mediaAssets).where(eq(mediaAssets.id, c.content.coverMediaId));
      if (media?.kind !== "article_cover") fail("INVALID_COVER", 422);
    }
    const status = c.action === "request_approval" ? "in_review" : c.action;
    if (c.action === "request_approval" && c.content.category !== "student_success") fail("INVALID_APPROVAL_REQUEST", 422);
    if (status === "published") {
      const issues = publishIssues(c.content, Boolean(approved), profile?.publicationStatus === "published");
      if (issues.length) fail("PUBLICATION_VALIDATION", 422, issues.join(" "));
    }
    const values = { ...c.content, status, studentApprovedAt: approved, approvalRequestedAt: c.action === "request_approval" ? new Date() : approved ? before?.approvalRequestedAt : null, updatedBy: actor, updatedAt: new Date(), version: (before?.version ?? 0) + 1, publishedAt: status === "published" ? before?.publishedAt ?? new Date() : before?.publishedAt ?? null };
    const [saved] = before ? await tx.update(articles).set(values).where(eq(articles.id, before.id)).returning() : await tx.insert(articles).values({ ...values, createdBy: actor }).returning();
    await tx.insert(adminEvents).values({ actorUserId: actor, action: `article_${c.action}`, note: "", snapshot: { articleId: saved.id, previousStatus: before?.status ?? null, article: saved } });
    return saved;
  });
}
export async function studentStoriesForApproval(db: Database, actor: string) {
  return db.select({ article: articles }).from(articles).innerJoin(studentProfiles, eq(studentProfiles.id, articles.studentProfileId))
    .where(and(eq(studentProfiles.ownerUserId, actor), eq(articles.category, "student_success"), eq(articles.status, "in_review"), sql`${articles.approvalRequestedAt} IS NOT NULL`));
}
export async function respondToStory(db: Database, actor: string, raw: unknown) {
  const c = z.object({ id: z.uuid(), version: z.number().int().positive(), approve: z.boolean(), note: z.string().trim().max(2000) }).strict().parse(raw);
  if (!c.approve && !c.note) fail("NOTE_REQUIRED", 422, "Tell staff what to change.");
  return db.transaction(async tx => {
    const [a] = await tx.select().from(articles).where(eq(articles.id, c.id)).for("update");
    if (!a || a.category !== "student_success" || !a.studentProfileId || a.status !== "in_review" || !a.approvalRequestedAt) fail("NOT_FOUND", 404);
    const [profile] = await tx.select().from(studentProfiles).where(and(eq(studentProfiles.id, a.studentProfileId), eq(studentProfiles.ownerUserId, actor))).for("share");
    if (!profile) fail("FORBIDDEN", 403);
    if (a.version !== c.version) fail("EDIT_CONFLICT", 409, "The story changed. Reload and read the latest version.");
    const [saved] = await tx.update(articles).set({ studentApprovedAt: c.approve ? new Date() : null, studentNote: c.note, approvalRequestedAt: null, updatedBy: actor, updatedAt: new Date(), version: a.version + 1 }).where(eq(articles.id, a.id)).returning();
    await tx.insert(adminEvents).values({ actorUserId: actor, action: c.approve ? "article_student_approved" : "article_changes_requested", note: c.note, snapshot: { articleId: a.id, version: saved.version } });
    return { saved: true };
  });
}
// Explicit public projection: no owner IDs, staff account IDs, approval notes or draft state.
export const publicArticleFields = { id: articles.id, slug: articles.slug, category: articles.category, title: articles.title, excerpt: articles.excerpt, bodyMarkdown: articles.bodyMarkdown, coverMediaId: articles.coverMediaId, coverAlt: articles.coverAlt, studentProfileId: articles.studentProfileId, eventName: articles.eventName, eventDate: articles.eventDate, eventLocation: articles.eventLocation, tags: articles.tags, authorDisplayName: articles.authorDisplayName, publishedAt: articles.publishedAt, updatedAt: articles.updatedAt };
export type PublicArticle = Pick<typeof articles.$inferSelect, keyof typeof publicArticleFields>;
export async function publicArticles(db: Database, category?: string, limit?: number, slug?: string) {
  const query = db.select(publicArticleFields).from(articles).leftJoin(studentProfiles, eq(studentProfiles.id, articles.studentProfileId))
    .where(and(eq(articles.status, "published"), slug ? eq(articles.slug, slug) : undefined, category === "updates" ? or(eq(articles.category, "event"), eq(articles.category, "news")) : ["student_success", "event", "news"].includes(category ?? "") ? eq(articles.category, category as "news" | "event" | "student_success") : undefined,
      or(sql`${articles.category} <> 'student_success'`, and(eq(studentProfiles.publicationStatus, "published"), sql`${articles.studentApprovedAt} IS NOT NULL`))))
    .orderBy(desc(articles.publishedAt), desc(articles.id));
  return limit ? query.limit(limit) : query;
}
export async function publicArticle(db: Database, slug: string) {
  const rows = await publicArticles(db, undefined, 1, slug); return rows[0] ?? null;
}
export async function articleStudent(db: Database, id: string) {
  const [row] = await db.select({ id: studentProfiles.id, name: authUsers.name, headline: studentProfiles.headline, avatarMediaId: studentProfiles.avatarMediaId }).from(studentProfiles).innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId)).where(and(eq(studentProfiles.id, id), eq(studentProfiles.publicationStatus, "published")));
  return row ?? null;
}
