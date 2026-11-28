import "server-only";
import { randomUUID } from "node:crypto";
import { asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { adminCreditEmails, adminEvents, adminProjectDetails, authUsers, projectRepositories, projects, studentProfiles, studioEvents, studioRoles } from "@/db/schema";
import { reconcileProjectCredits } from "./credit-links";
import { resolvedEmailCredits } from "./credit-queries";
import { approvedInstitutionalDomains } from "@/verification/config";
import { normalizeInstitutionalEmail } from "@/verification/validation";
import { queryProjectScreenshots } from "@/projects/screenshot-queries";
import { ProjectError } from "@/projects/service";
import { lockRepositoryKeys, queryProjectDuplicates, similarProjectName } from "@/projects/duplicates";
import { accessCommandSchema, adminCommandSchema, adminContentSchema, canManage, publicationIssues, type AdminContent } from "./policy";
import type { Role } from "@/studio/policy";
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export function fail(code: string, status = 409, message = code.replaceAll("_", " ")): never { throw new ProjectError(code, status, message); }
export async function lockStaff(tx: Tx, actor: string, write = false): Promise<Role> {
  const [grant] = await tx.select().from(studioRoles).where(eq(studioRoles.userId, actor)).for("share");
  if (!grant || write && !canManage(grant.role as Role)) fail("FORBIDDEN", 403, "Your current account does not have access to this operation.");
  return grant.role as Role;
}
export async function adminIdentity(db: Database, actor: string) {
  return db.transaction(async tx => ({ role: await lockStaff(tx, actor), userId: actor }));
}
export async function adminList(db: Database, actor: string) {
  return db.transaction(async tx => {
    const role = await lockStaff(tx, actor);
    const rows = await tx.select({ id: projects.id, title: projects.title, domain: projects.domain, version: projects.version, updatedAt: projects.updatedAt, lifecycle: adminProjectDetails.lifecycle, repository: adminProjectDetails.repositoryKey })
      .from(adminProjectDetails).innerJoin(projects, eq(projects.id, adminProjectDetails.projectId)).orderBy(desc(projects.updatedAt));
    return { role, projects: rows };
  });
}
export async function adminDetail(db: Database, actor: string, id: string) {
  return db.transaction(async tx => {
    const [p] = await tx.select().from(projects).where(eq(projects.id, id)).for("share");
    const role = await lockStaff(tx, actor);
    if (!p || p.managementMode !== "ADMIN_MANAGED") fail("NOT_FOUND", 404);
    const [detail] = await tx.select().from(adminProjectDetails).where(eq(adminProjectDetails.projectId, id));
    if (!detail) fail("NOT_FOUND", 404);
    const events = await tx.select().from(adminEvents).where(eq(adminEvents.projectId, id)).orderBy(desc(adminEvents.createdAt));
    const creditState = await adminCreditState(tx, id, detail.content);
    return { role, project: p, detail: { ...detail, content: canManage(role) ? creditState.content : detail.content }, events, creditStatuses: creditState.statuses, screenshots: await queryProjectScreenshots(tx, [id]) };
  });
}
export async function adminActivity(db: Database, actor: string) {
  return db.transaction(async tx => { await lockStaff(tx, actor); return tx.select().from(adminEvents).orderBy(desc(adminEvents.createdAt)).limit(100); });
}
async function validateCreditLinks(tx: Tx, id: string, content: AdminContent) {
  const ids = [...new Set(content.credits.flatMap(c => c.profileId ? [c.profileId.toLowerCase()] : []))];
  if (ids.length) {
    const profiles = await tx.select({ id: studentProfiles.id }).from(studentProfiles).where(inArray(studentProfiles.id, ids)).for("share");
    if (profiles.length !== ids.length) fail("PROFILE_NOT_FOUND", 422, "Choose an existing profile or leave the profile ID empty.");
  }
  await reconcileProjectCredits(tx, id);
}
function publicContent(input: AdminContent): AdminContent {
  return { ...input, credits: input.credits.map(c => ({ name: c.name, role: c.role, statement: c.statement, profileId: c.profileId })) };
}
async function saveCreditEmails(tx: Tx, projectId: string, actor: string, input: AdminContent) {
  const domains = approvedInstitutionalDomains();
  const old = await tx.select().from(adminCreditEmails).where(eq(adminCreditEmails.projectId, projectId));
  const rows = input.credits.flatMap((c, creditIndex) => {
    if (!c.institutionalEmail) return [];
    const institutionalEmail = normalizeInstitutionalEmail(c.institutionalEmail, domains);
    if (!institutionalEmail) fail("INVALID_CREDIT_EMAIL", 422, "Use an allowed Algoma institutional email for each email credit.");
    const previous = old.find(v => v.institutionalEmail === institutionalEmail);
    return [{ projectId, institutionalEmail, creditIndex, displayName: c.name, role: c.role, statement: c.statement, createdBy: previous?.createdBy ?? actor, createdAt: previous?.createdAt ?? new Date() }];
  });
  if (new Set(rows.map(r => r.institutionalEmail)).size !== rows.length) fail("DUPLICATE_CREDIT_EMAIL", 422, "Use each institutional email once per project.");
  await tx.delete(adminCreditEmails).where(eq(adminCreditEmails.projectId, projectId));
  if (rows.length) await tx.insert(adminCreditEmails).values(rows);
}
async function adminCreditState(tx: Tx, projectId: string, content: AdminContent) {
  const emails = await tx.select({ creditIndex: adminCreditEmails.creditIndex, institutionalEmail: adminCreditEmails.institutionalEmail }).from(adminCreditEmails).where(eq(adminCreditEmails.projectId, projectId));
  const resolved = await resolvedEmailCredits(tx, [projectId]);
  const ids = content.credits.flatMap(c => c.profileId ? [c.profileId] : []);
  const direct = ids.length ? await tx.select({ id: studentProfiles.id, name: authUsers.name, publicationStatus: studentProfiles.publicationStatus }).from(studentProfiles).innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId)).where(inArray(studentProfiles.id, ids)) : [];
  return { content: { ...content, credits: content.credits.map((c, i) => ({ ...c, institutionalEmail: emails.find(e => e.creditIndex === i)?.institutionalEmail ?? "" })) }, statuses: content.credits.map((c, i) => {
    const profile = c.profileId ? direct.find(p => p.id === c.profileId) : resolved.find(p => p.creditIndex === i);
    return !profile ? "Waiting for this student to join" : profile.publicationStatus !== "published" ? "Profile not public yet" : `Linked to ${profile.name}`;
  }) };
}
async function repository(tx: Tx, id: string, content: AdminContent) {
  const key = content.originalRepository || null;
  if (key) {
    await lockRepositoryKeys(tx, [key]);
    const [existing] = await tx.select({ id: adminProjectDetails.projectId }).from(adminProjectDetails).where(eq(adminProjectDetails.repositoryKey, key));
    if (existing && existing.id !== id) fail("DUPLICATE_REPOSITORY", 409, "An admin project already references this repository. Open that project or remove the repository reference before creating a separate adaptation.");
  }
  await tx.delete(projectRepositories).where(eq(projectRepositories.projectId, id));
  if (key) await tx.insert(projectRepositories).values({ projectId: id, url: key, normalizedKey: key, displayOrder: 0 });
  return key;
}
export async function adminCreate(db: Database, actor: string, raw: unknown) {
  const input = adminContentSchema.parse(raw); const content = publicContent(input);
  return db.transaction(async tx => {
    await lockStaff(tx, actor, true);
    const id = randomUUID();
    // A canonical record supplies stable URLs and inquiry references, not student ownership.
    const [project] = await tx.insert(projects).values({ id, title: content.title, description: content.description, domain: content.domain, projectStatus: content.projectStatus, projectDate: content.startDate || null, origin: "admin", managementMode: "ADMIN_MANAGED" }).returning();
    const key = await repository(tx, id, content);
    const [detail] = await tx.insert(adminProjectDetails).values({ projectId: id, createdBy: actor, content, repositoryKey: key }).returning();
    await saveCreditEmails(tx, id, actor, input);
    await validateCreditLinks(tx, id, content);
    await tx.insert(adminEvents).values({ projectId: id, actorUserId: actor, action: "create", note: "", snapshot: { project, detail } });
    return { project, detail, creditStatuses: (await adminCreditState(tx, id, content)).statuses };
  });
}
export async function adminCommand(db: Database, actor: string, id: string, raw: unknown) {
  const command = adminCommandSchema.parse(raw);
  return db.transaction(async tx => {
    const [p] = await tx.select().from(projects).where(eq(projects.id, id)).for("update");
    await lockStaff(tx, actor, true);
    if (!p || p.managementMode !== "ADMIN_MANAGED") fail("NOT_FOUND", 404);
    const [d] = await tx.select().from(adminProjectDetails).where(eq(adminProjectDetails.projectId, id)).for("update");
    if (!d) fail("NOT_FOUND", 404);
    if (p.version !== command.version) fail("EDIT_CONFLICT", 409, "Another administrator changed this project. Your entries are retained. Reload and reconcile before saving.");
    let lifecycle = d.lifecycle;
    const input = command.content; const content = input ? publicContent(input) : d.content;
    if (command.action === "save" && !command.content) fail("CONTENT_REQUIRED", 422);
    if (d.lifecycle === "archived" && command.action !== "restore") fail("INVALID_TRANSITION");
    if (command.action === "restore") { if (d.lifecycle !== "archived") fail("INVALID_TRANSITION"); lifecycle = "draft"; }
    if (command.action === "archive") lifecycle = "archived";
    if (command.action === "unpublish") { if (d.lifecycle !== "published") fail("INVALID_TRANSITION"); lifecycle = "unpublished"; }
    if (command.action === "publish") lifecycle = "published";
    if (lifecycle === "published") {
      const issues = publicationIssues(content); if (issues.length) fail("PUBLICATION_VALIDATION", 422, issues.join(" "));
    }
    const key = await repository(tx, id, content);
    const [project] = await tx.update(projects).set({ title: content.title, description: content.description, domain: content.domain, projectStatus: content.projectStatus, projectDate: content.startDate || null, version: p.version + 1, updatedAt: new Date(), publicationStatus: lifecycle === "published" ? "published" : "unpublished", publishedAt: lifecycle === "published" && p.publicationStatus !== "published" ? new Date() : p.publishedAt }).where(eq(projects.id, id)).returning();
    const [detail] = await tx.update(adminProjectDetails).set({ lifecycle, content, repositoryKey: key }).where(eq(adminProjectDetails.projectId, id)).returning();
    if (input) await saveCreditEmails(tx, id, actor, input);
    await validateCreditLinks(tx, id, content);
    await tx.insert(adminEvents).values({ projectId: id, actorUserId: actor, action: command.action, note: command.note, snapshot: { project, detail } });
    return { project, detail, creditStatuses: (await adminCreditState(tx, id, content)).statuses };
  });
}
export async function adminDuplicates(db: Database, actor: string, repositoryUrl: string, title: string) {
  return db.transaction(async tx => {
    await lockStaff(tx, actor, true);
    const staff = await tx.select({ id: projects.id, title: projects.title, key: adminProjectDetails.repositoryKey }).from(adminProjectDetails).innerJoin(projects, eq(projects.id, adminProjectDetails.projectId));
    const publicMatches = await queryProjectDuplicates(tx, { title: "", domain: "", repositories: repositoryUrl ? [{ url: repositoryUrl }] : [] }, actor);
    const candidates = await tx.select({ id: projects.id, title: projects.title }).from(projects).where(eq(projects.publicationStatus, "published"));
    const result = new Map<string, { id: string; title: string; exact: boolean; adminManaged: boolean }>();
    for (const p of staff) if (p.key === repositoryUrl || similarProjectName(p.title, title)) result.set(p.id, { id: p.id, title: p.title, exact: p.key === repositoryUrl, adminManaged: true });
    for (const p of candidates) if (!result.has(p.id) && similarProjectName(p.title, title)) result.set(p.id, { ...p, exact: false, adminManaged: staff.some(s => s.id === p.id) });
    for (const p of publicMatches.matches) result.set(p.id, { id: p.id, title: p.title, exact: p.kind === "repository", adminManaged: staff.some(s => s.id === p.id) });
    return [...result.values()];
  });
}
const lookupQuery = z.string().trim().min(2, "Enter at least two characters.").max(120);
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, c => `\\${c}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Staff can find any profile, but never another account's email or private biography.
export async function adminProfileLookup(db: Database, actor: string, raw: unknown) {
  const q = lookupQuery.parse(raw);
  return db.transaction(async tx => {
    await lockStaff(tx, actor, true);
    const match = UUID.test(q) ? eq(studentProfiles.id, q.toLowerCase()) : ilike(authUsers.name, `%${escapeLike(q)}%`);
    return tx.select({ id: studentProfiles.id, name: authUsers.name, headline: studentProfiles.headline, program: studentProfiles.program }).from(studentProfiles)
      .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
      .where(match)
      .orderBy(asc(authUsers.name), asc(studentProfiles.id)).limit(20);
  });
}
export async function accessList(db: Database, actor: string) {
  return db.transaction(async tx => {
    if (await lockStaff(tx, actor) !== "platform_super_admin") fail("FORBIDDEN", 403);
    return tx.select({ userId: studioRoles.userId, role: studioRoles.role, name: authUsers.name }).from(studioRoles).innerJoin(authUsers, eq(authUsers.id, studioRoles.userId)).orderBy(studioRoles.userId);
  });
}
export async function changeAccess(db: Database, actor: string, raw: unknown) {
  const c = accessCommandSchema.parse(raw);
  return db.transaction(async tx => {
    // Match assign_studio_role's global lock BEFORE any row locks: no lock upgrade race.
    await tx.execute(sql`LOCK TABLE public.studio_roles IN EXCLUSIVE MODE`);
    if (await lockStaff(tx, actor) !== "platform_super_admin") fail("FORBIDDEN", 403);
    const [target] = await tx.select().from(authUsers).where(eq(authUsers.id, c.subject)).for("share");
    if (!target) fail("ACCOUNT_NOT_FOUND", 404, "Use the exact internal ID of an existing authenticated account.");
    const [previous] = await tx.select().from(studioRoles).where(eq(studioRoles.userId, c.subject));
    if ((previous?.role ?? null) !== c.expectedRole) fail("EDIT_CONFLICT", 409, "This role changed. Refresh access before retrying.");
    if (previous?.role === "platform_super_admin" && c.role !== "platform_super_admin") {
      const supers = await tx.select().from(studioRoles).where(eq(studioRoles.role, "platform_super_admin"));
      if (supers.length <= 1) fail("LAST_SUPER_ADMIN", 409, "Keep at least one platform super administrator.");
    }
    if (c.role) await tx.insert(studioRoles).values({ userId: c.subject, role: c.role }).onConflictDoUpdate({ target: studioRoles.userId, set: { role: c.role } });
    else await tx.delete(studioRoles).where(eq(studioRoles.userId, c.subject));
    const snapshot = { subject: c.subject, previous: previous?.role ?? null, role: c.role };
    await tx.insert(adminEvents).values({ actorUserId: actor, action: "role_assignment", note: c.reason, snapshot });
    await tx.insert(studioEvents).values({ actorUserId: actor, action: "role_assignment", note: c.reason, snapshot });
    return { changed: true };
  });
}
