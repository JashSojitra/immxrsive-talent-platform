import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { projects, studioEvents, studioRoles, studioSubmissions } from "@/db/schema";
import { ProjectError } from "@/projects/service";
import { authorizeCommand, commandSchema, contentSchema, showcaseVisibility, type Role, type State } from "./policy";
function fail(code: string, status = 409): never { throw new ProjectError(code, status, code.replaceAll("_", " ")); }
export async function staffRole(db: Database, actor: string): Promise<Role | null> {
  const [grant] = await db.select().from(studioRoles).where(eq(studioRoles.userId, actor));
  return (grant?.role as Role) ?? null;
}
export async function studioList(db: Database, actor: string, staff: boolean) {
  return db.transaction(async tx => {
    // Keep authorization valid until the private queue has been read. Operational
    // role revocation takes an incompatible table/row lock and must serialize.
    const [grant] = await tx.select().from(studioRoles).where(eq(studioRoles.userId, actor)).for("share");
    if (staff && !grant) fail("FORBIDDEN", 403);
    const rows = await tx.select({ submission: studioSubmissions, project: projects }).from(studioSubmissions)
      .innerJoin(projects, eq(projects.id, studioSubmissions.projectId))
      .where(staff ? undefined : eq(projects.maintainerUserId, actor)).orderBy(desc(studioSubmissions.updatedAt));
    return rows.map(({ submission, project }) => ({ submission: { ...submission, ...showcaseVisibility(submission, project) }, projectTitle: project.title }));
  });
}
export async function studioDetail(db: Database, actor: string, projectId: string) {
  return db.transaction(async tx => {
    // Match command lock order. Holding the project and grant through history
    // retrieval prevents a former owner/revoked reviewer reading later events.
    const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)).for("share");
    const [grant] = await tx.select().from(studioRoles).where(eq(studioRoles.userId, actor)).for("share");
    const [submission] = await tx.select().from(studioSubmissions).where(eq(studioSubmissions.projectId, projectId));
    const owner = project?.origin === "student" && project.maintainerUserId === actor;
    const role = grant ? grant.role as Role : null;
    // Staff cannot browse unsubmitted private projects through this endpoint.
    if (!project || (!owner && (!role || !submission))) fail("NOT_FOUND", 404);
    const history = submission ? await tx.select().from(studioEvents).where(eq(studioEvents.projectId, projectId)).orderBy(desc(studioEvents.createdAt)) : [];
    return { project: { id: project.id, title: project.title, description: project.description, version: project.version }, submission: submission ? { ...submission, ...showcaseVisibility(submission, project) } : null, history, owner, role };
  });
}
export async function studioCommand(db: Database, actor: string, projectId: string, raw: unknown) {
  const c = commandSchema.parse(raw);
  await db.transaction(async tx => {
    // Use the R3 project lock order so maintenance transfers and owner approvals serialize.
    const [p] = await tx.select().from(projects).where(eq(projects.id, projectId)).for("update");
    if (!p) fail("NOT_FOUND", 404);
    const [grant] = await tx.select().from(studioRoles).where(eq(studioRoles.userId, actor)).for("share");
    const [s] = await tx.select().from(studioSubmissions).where(eq(studioSubmissions.projectId, projectId)).for("update");
    const owner = p.origin === "student" && p.maintainerUserId === actor;
    if (!owner && (!grant || !s)) fail("NOT_FOUND", 404);
    if (!s) {
      if (!owner || c.action !== "submit") fail("FORBIDDEN", 403);
      if (p.version !== c.version) fail("EDIT_CONFLICT");
      const content = contentSchema.parse(c.content);
      const [created] = await tx.insert(studioSubmissions).values({ projectId, submittedBy: actor, ...content, acceptedVersion: 1, acceptedBy: actor, acceptedProjectVersion: p.version }).returning();
      await tx.insert(studioEvents).values({ projectId, actorUserId: actor, action: "submit", note: c.note, snapshot: created });
      return;
    }
    if (s.version !== c.version) fail("EDIT_CONFLICT");
    try { authorizeCommand(s.state as State, c, owner, (grant?.role as Role) ?? null); }
    catch (e) { fail((e as Error).message, (e as Error).message === "FORBIDDEN" ? 403 : 409); }
    const update: Partial<typeof studioSubmissions.$inferInsert> = { version: s.version + 1, updatedAt: new Date() };
    const next = ({ review: "under_review", request_changes: "changes_requested", approve: "approved", reject: "rejected", withdraw: "withdrawn", resubmit: "submitted" } as Partial<Record<typeof c.action, string>>)[c.action];
    if (next) { update.state = next; update.published = false; }
    if (c.action === "suggest" || c.action === "resubmit") {
      Object.assign(update, contentSchema.parse(c.content), { contentVersion: s.contentVersion + 1, acceptedVersion: null, acceptedBy: null, acceptedProjectVersion: null, published: false });
      if (c.action === "suggest") update.state = "under_review";
      if (c.action === "resubmit") Object.assign(update, { acceptedVersion: s.contentVersion + 1, acceptedBy: actor, acceptedProjectVersion: p.version });
    }
    if (c.action === "accept") Object.assign(update, { acceptedVersion: s.contentVersion, acceptedBy: actor, acceptedProjectVersion: p.version, published: false });
    if (c.action === "publish") {
      if (s.acceptedVersion !== s.contentVersion || s.acceptedBy !== p.maintainerUserId || s.acceptedProjectVersion !== p.version || p.publicationStatus !== "published") fail("OWNER_APPROVAL_REQUIRED");
      update.published = true;
    }
    if (c.action === "moderate") update.published = false;
    const [updated] = await tx.update(studioSubmissions).set(update).where(and(eq(studioSubmissions.projectId, projectId), eq(studioSubmissions.version, c.version))).returning();
    await tx.insert(studioEvents).values({ projectId, actorUserId: actor, action: c.action, note: c.note, snapshot: updated });
  });
  return studioDetail(db, actor, projectId);
}
// Public output includes only owner-approved showcase text and outbound links; no consent records.
export async function publicShowcases(db: Database) {
  return db.select({ projectId: studioSubmissions.projectId, title: studioSubmissions.title, summary: studioSubmissions.summary, mediaUrl: studioSubmissions.mediaUrl, demoUrl: studioSubmissions.demoUrl })
    .from(studioSubmissions).innerJoin(projects, eq(projects.id, studioSubmissions.projectId))
    .where(and(eq(studioSubmissions.published, true), eq(studioSubmissions.state, "approved"), eq(projects.publicationStatus, "published"), eq(projects.maintainerUserId, studioSubmissions.acceptedBy), eq(projects.version, studioSubmissions.acceptedProjectVersion), eq(studioSubmissions.contentVersion, studioSubmissions.acceptedVersion)));
}
