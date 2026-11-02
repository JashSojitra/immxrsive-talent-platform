import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql, or, ilike } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import {
  authUsers, projectJoinRequests, projects, projectRoles, projectRepositories, projectLinks, projectMedia, projectTechnologies,
  projectMemberships, projectContributions, projectMaintainerTransfers, studentProfiles, studentAffiliations,
} from "@/db/schema";
import { lockRepositoryKeys, queryProjectDuplicates, type DuplicateResult } from "./duplicates";
import { contributionSchema, projectDraftSchema, repositoryKey, type ProjectDraft } from "./validation";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Context = { db: Database; actorUserId: string };
export class ProjectError extends Error {
  constructor(readonly code: string, readonly status: number, message: string, readonly duplicates?: DuplicateResult) { super(message); this.name = "ProjectError"; }
}
function fail(code: string, status: number, message: string): never { throw new ProjectError(code, status, message); }
function revision(actual: number, expected: number) {
  if (!Number.isSafeInteger(expected) || expected < 1 || actual !== expected) fail("EDIT_CONFLICT", 409, "This record changed. Reload before saving.");
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) fail("VALIDATION_ERROR", 422, result.error.issues.map(x => x.message).join(" "));
  return result.data;
}
async function verified(tx: Transaction, actor: string) {
  if (!actor) fail("AUTHENTICATION_REQUIRED", 401, "Sign in to continue.");
  const [p] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(eq(studentProfiles.ownerUserId, actor), eq(studentAffiliations.status, "verified"))).limit(1).for("share");
  if (!p) fail("AFFILIATION_REQUIRED", 403, "A verified account-owned student profile is required.");
  return p;
}
async function lockProject(tx: Transaction, id: string) {
  const [p] = await tx.select().from(projects).where(eq(projects.id, id)).limit(1).for("update");
  if (!p) fail("NOT_FOUND", 404, "Project unavailable.");
  return p;
}
function maintainer(p: typeof projects.$inferSelect, actor: string) {
  if (p.origin !== "student" || p.maintainerUserId !== actor) fail("FORBIDDEN", 403, "Only the current maintainer can edit shared project information.");
}
async function role(tx: Transaction, id: string) {
  if (!(await tx.select({ id: projectRoles.id }).from(projectRoles).where(eq(projectRoles.id, id)).limit(1)).length) fail("INVALID_ROLE", 422, "Select a standardized role.");
}
async function membership(tx: Transaction, id: string) {
  if (!z.uuid().safeParse(id).success) fail("NOT_FOUND", 404, "Membership unavailable.");
  const [m] = await tx.select().from(projectMemberships).where(eq(projectMemberships.id, id)).limit(1);
  if (!m) fail("NOT_FOUND", 404, "Membership unavailable.");
  return m;
}
async function replaceSharedChildren(tx: Transaction, projectId: string, draft: ProjectDraft) {
  await tx.delete(projectRepositories).where(eq(projectRepositories.projectId, projectId));
  await tx.delete(projectLinks).where(eq(projectLinks.projectId, projectId));
  await tx.delete(projectMedia).where(eq(projectMedia.projectId, projectId));
  await tx.delete(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
  if (draft.repositories.length) await tx.insert(projectRepositories).values(draft.repositories.map((r, displayOrder) => ({ projectId, url: r.url, normalizedKey: repositoryKey(r.url), displayOrder })));
  if (draft.links.length) await tx.insert(projectLinks).values(draft.links.map((r, displayOrder) => ({ ...r, projectId, displayOrder })));
  if (draft.media.length) await tx.insert(projectMedia).values(draft.media.map((r, displayOrder) => ({ ...r, projectId, displayOrder })));
  if (draft.technologies.length) await tx.insert(projectTechnologies).values(draft.technologies.map((technologyName, displayOrder) => ({ projectId, technologyName, displayOrder })));
}
async function bump(tx: Transaction, id: string) {
  const [p] = await tx.update(projects).set({ version: sql`${projects.version} + 1`, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
  return p;
}

// actorUserId must come from the server session (requireVerifiedRequestStudent),
// never from request JSON. Services independently recheck verification and ownership.
export async function createProject(input: Context & { draft: unknown; creatorRoleId: string; duplicateAcknowledgement?: string }) {
  const draft = parse(projectDraftSchema, input.draft);
  return input.db.transaction(async tx => {
    const profile = await verified(tx, input.actorUserId); await role(tx, input.creatorRoleId);
    await lockRepositoryKeys(tx, draft.repositories.map(r => repositoryKey(r.url)));
    const duplicates = await queryProjectDuplicates(tx, draft, input.actorUserId);
    if (duplicates.hasExactMatch && input.duplicateAcknowledgement !== duplicates.acknowledgement) throw new ProjectError("DUPLICATE_WARNING", 409, "Review repository matches before creating a distinct project. Some matches may not be publicly available.", duplicates);
    const [p] = await tx.insert(projects).values({ id: randomUUID(), title: draft.title, description: draft.description, domain: draft.domain, projectDate: draft.projectDate, projectStatus: draft.projectStatus, origin: "student", maintainerUserId: input.actorUserId, publicationStatus: "unpublished" }).returning();
    const [m] = await tx.insert(projectMemberships).values({ projectId: p.id, profileId: profile.id, proposedRoleId: input.creatorRoleId, invitedByUserId: input.actorUserId, state: "accepted", acceptedAt: new Date(), respondedAt: new Date() }).returning();
    await tx.insert(projectContributions).values({ membershipId: m.id, roleId: input.creatorRoleId });
    await replaceSharedChildren(tx, p.id, draft); return p;
  });
}
export async function updateProject(input: Context & { projectId: string; version: number; draft: unknown }) {
  const draft = parse(projectDraftSchema, input.draft);
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId); const p = await lockProject(tx, input.projectId);
    maintainer(p, input.actorUserId); revision(p.version, input.version);
    await lockRepositoryKeys(tx, draft.repositories.map(r => repositoryKey(r.url)));
    if (p.publicationStatus === "published" && !draft.description) fail("PUBLICATION_VALIDATION", 422, "Add a description before publishing.");
    await tx.update(projects).set({ title: draft.title, description: draft.description, domain: draft.domain, projectStatus: draft.projectStatus, projectDate: draft.projectDate }).where(eq(projects.id, p.id));
    await replaceSharedChildren(tx, p.id, draft); return bump(tx, p.id);
  });
}
export async function setProjectPublication(input: Context & { projectId: string; version: number; published: boolean }) {
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId); const p = await lockProject(tx, input.projectId);
    maintainer(p, input.actorUserId); revision(p.version, input.version);
    if (typeof input.published !== "boolean") fail("VALIDATION_ERROR", 422, "Choose publication status.");
    if (input.published && !p.description.trim()) fail("PUBLICATION_VALIDATION", 422, "Add a description before publishing.");
    await tx.update(projects).set({ publicationStatus: input.published ? "published" : "unpublished", publishedAt: input.published ? new Date() : p.publishedAt }).where(eq(projects.id, p.id));
    return bump(tx, p.id);
  });
}
export async function inviteContributor(input: Context & { projectId: string; version: number; profileId: string; roleId: string }) {
  if (!z.uuid().safeParse(input.profileId).success) fail("NOT_FOUND", 404, "Student profile unavailable.");
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId); const p = await lockProject(tx, input.projectId);
    maintainer(p, input.actorUserId); revision(p.version, input.version); await role(tx, input.roleId);
    if (!(await tx.select({ id: studentProfiles.id }).from(studentProfiles).innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId)).where(and(eq(studentProfiles.id, input.profileId), eq(studentAffiliations.status, "verified")))).length) fail("NOT_FOUND", 404, "Student profile unavailable.");
    if ((await tx.select({ id: projectMemberships.id }).from(projectMemberships).where(and(eq(projectMemberships.projectId, p.id), eq(projectMemberships.profileId, input.profileId)))).length) fail("MEMBERSHIP_EXISTS", 409, "This relationship exists; use its response or restoration action.");
    const [m] = await tx.insert(projectMemberships).values({ projectId: p.id, profileId: input.profileId, proposedRoleId: input.roleId, invitedByUserId: input.actorUserId }).returning();
    await bump(tx, p.id); return m;
  });
}
export async function respondToInvitation(input: Context & { membershipId: string; version: number; accept: boolean }) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId); const initial = await membership(tx, input.membershipId);
    await lockProject(tx, initial.projectId); const m = await membership(tx, input.membershipId);
    if (m.profileId !== actor.id) fail("FORBIDDEN", 403, "Only the invited student can respond.");
    revision(m.version, input.version);
    if (m.state !== "pending") fail("INVALID_TRANSITION", 409, "This invitation has already been answered.");
    if (typeof input.accept !== "boolean") fail("VALIDATION_ERROR", 422, "Choose accept or decline.");
    const [updated] = await tx.update(projectMemberships).set({ state: input.accept ? "accepted" : "declined", acceptedAt: input.accept ? new Date() : null, respondedAt: new Date(), updatedAt: new Date(), version: m.version + 1 }).where(eq(projectMemberships.id, m.id)).returning();
    if (input.accept) await tx.insert(projectContributions).values({ membershipId: m.id, roleId: m.proposedRoleId });
    await bump(tx, m.projectId); return updated;
  });
}
export async function updateContribution(input: Context & { membershipId: string; version: number; contribution: unknown }) {
  const data = parse(contributionSchema, input.contribution);
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId); const initial = await membership(tx, input.membershipId);
    await lockProject(tx, initial.projectId); const m = await membership(tx, input.membershipId);
    if (m.profileId !== actor.id) fail("FORBIDDEN", 403, "Only the contributor can edit their personal evidence.");
    if (m.state !== "accepted") fail("INVALID_TRANSITION", 409, "An active accepted relationship is required.");
    await role(tx, data.roleId);
    const [c] = await tx.select().from(projectContributions).where(eq(projectContributions.membershipId, m.id));
    if (!c) fail("NOT_FOUND", 404, "Contribution unavailable.");
    revision(c.version, input.version);
    const [updated] = await tx.update(projectContributions).set({ ...data, version: c.version + 1, updatedAt: new Date() }).where(eq(projectContributions.membershipId, m.id)).returning();
    return updated;
  });
}
export async function setMembershipRemoved(input: Context & { membershipId: string; version: number; removed: boolean; reason?: string }) {
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId); const initial = await membership(tx, input.membershipId);
    const p = await lockProject(tx, initial.projectId); maintainer(p, input.actorUserId);
    const m = await membership(tx, input.membershipId); revision(m.version, input.version);
    const [owner] = await tx.select({ id: studentProfiles.ownerUserId }).from(studentProfiles).where(eq(studentProfiles.id, m.profileId));
    if (owner.id === p.maintainerUserId) fail("MAINTAINER_REQUIRED", 409, "Transfer maintenance before removing the maintainer.");
    if (typeof input.removed !== "boolean" || (input.removed ? m.state !== "accepted" : m.state !== "removed")) fail("INVALID_TRANSITION", 409, "Only accepted relationships can be removed and removed relationships restored.");
    const reason = parse(z.string().trim().max(500), input.reason ?? "");
    const [updated] = await tx.update(projectMemberships).set({ state: input.removed ? "removed" : "accepted", version: m.version + 1, updatedAt: new Date(), ...(input.removed ? { removedAt: new Date(), removedByUserId: input.actorUserId, removalReason: reason } : { restoredAt: new Date() }) }).where(eq(projectMemberships.id, m.id)).returning();
    await bump(tx, p.id); return updated;
  });
}
export async function offerMaintainerTransfer(input: Context & { projectId: string; version: number; targetMembershipId: string }) {
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId); const p = await lockProject(tx, input.projectId);
    maintainer(p, input.actorUserId); revision(p.version, input.version);
    const m = await membership(tx, input.targetMembershipId);
    const [target] = await tx.select({ owner: studentProfiles.ownerUserId }).from(studentProfiles).innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId)).where(and(eq(studentProfiles.id, m.profileId), eq(studentAffiliations.status, "verified")));
    if (m.projectId !== p.id || m.state !== "accepted" || !target || target.owner === input.actorUserId) fail("INVALID_TRANSFER", 422, "Choose another accepted contributor on this project.");
    await tx.update(projectMaintainerTransfers).set({ state: "cancelled", respondedAt: new Date() }).where(and(eq(projectMaintainerTransfers.projectId, p.id), eq(projectMaintainerTransfers.state, "pending")));
    const updated = await bump(tx, p.id);
    const [offer] = await tx.insert(projectMaintainerTransfers).values({ projectId: p.id, fromUserId: input.actorUserId, toMembershipId: m.id, projectVersion: updated.version }).returning();
    return offer;
  });
}
export async function respondToMaintainerTransfer(input: Context & { transferId: string; accept: boolean }) {
  if (!z.uuid().safeParse(input.transferId).success) fail("NOT_FOUND", 404, "Transfer unavailable.");
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    const [initial] = await tx.select().from(projectMaintainerTransfers).where(eq(projectMaintainerTransfers.id, input.transferId));
    if (!initial) fail("NOT_FOUND", 404, "Transfer unavailable.");
    const p = await lockProject(tx, initial.projectId);
    const [offer] = await tx.select().from(projectMaintainerTransfers).where(eq(projectMaintainerTransfers.id, input.transferId));
    const m = await membership(tx, offer.toMembershipId);
    if (m.profileId !== actor.id) fail("FORBIDDEN", 403, "Only the proposed maintainer can respond.");
    if (offer.state !== "pending" || (input.accept && m.state !== "accepted") || m.projectId !== p.id || p.maintainerUserId !== offer.fromUserId) fail("INVALID_TRANSFER", 409, "This transfer is no longer available.");
    if (input.accept) revision(p.version, offer.projectVersion);
    if (typeof input.accept !== "boolean") fail("VALIDATION_ERROR", 422, "Choose accept or decline.");
    if (input.accept) await tx.update(projects).set({ maintainerUserId: input.actorUserId }).where(eq(projects.id, p.id));
    await tx.update(projectMaintainerTransfers).set({ state: input.accept ? "accepted" : "declined", respondedAt: new Date() }).where(eq(projectMaintainerTransfers.id, offer.id));
    return bump(tx, p.id);
  });
}
export async function getProjectWorkspace(input: Context & { projectId: string }) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    const [p] = await tx.select().from(projects).where(eq(projects.id, input.projectId)).for("share");
    if (!p) fail("NOT_FOUND", 404, "Project unavailable.");
    const isMaintainer = p.origin === "student" && p.maintainerUserId === input.actorUserId;
    const own = await tx.select().from(projectMemberships).where(and(eq(projectMemberships.projectId, p.id), eq(projectMemberships.profileId, actor.id)));
    if (!isMaintainer && !own.length) fail("FORBIDDEN", 403, "This private project is unavailable.");
    return { project: p, memberships: isMaintainer ? await tx.select().from(projectMemberships).where(eq(projectMemberships.projectId, p.id)) : own,
      technologies: await tx.select({ name: projectTechnologies.technologyName }).from(projectTechnologies).where(eq(projectTechnologies.projectId, p.id)).orderBy(projectTechnologies.displayOrder),
      repositories: await tx.select().from(projectRepositories).where(eq(projectRepositories.projectId, p.id)).orderBy(projectRepositories.displayOrder),
      links: await tx.select().from(projectLinks).where(eq(projectLinks.projectId, p.id)).orderBy(projectLinks.displayOrder),
      media: await tx.select().from(projectMedia).where(eq(projectMedia.projectId, p.id)).orderBy(projectMedia.displayOrder) };
  });
}

export async function listMaintainedProjects(input: Context) {
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId);
    return tx.select({ id: projects.id, title: projects.title, publicationStatus: projects.publicationStatus, version: projects.version })
      .from(projects).where(and(eq(projects.origin, "student"), eq(projects.maintainerUserId, input.actorUserId)))
      .orderBy(projects.title, projects.id);
  });
}

export async function getProjectEditorData(input: Context & { projectId: string }) {
  const workspace = await getProjectWorkspace(input);
  maintainer(workspace.project, input.actorUserId);
  const { project, repositories, links, media, technologies } = workspace;
  return {
    project: { id: project.id, version: project.version, publicationStatus: project.publicationStatus },
    draft: {
      title: project.title, description: project.description, domain: project.domain,
      projectStatus: project.projectStatus, projectDate: project.projectDate,
      technologies: technologies.map(({ name }) => name),
      repositories: repositories.map(({ url }) => ({ url })), links: links.map(({ label, url }) => ({ label, url })),
      media: media.map(({ kind, label, url, altText }) => ({ kind, label, url, altText })),
    },
  };
}

export async function getProjectRoles(db: Pick<Database, "select">) {
  return db.select({ id: projectRoles.id, name: projectRoles.name }).from(projectRoles).orderBy(projectRoles.displayOrder);
}

// Private, explicit DTOs. Non-maintainers never receive another member's
// invitation/removal metadata or transfer offers.
export async function getProjectTeam(input: Context & { projectId: string }) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    const [p] = await tx.select().from(projects).where(eq(projects.id, input.projectId)).for("share");
    if (!p || p.origin !== "student") fail("NOT_FOUND", 404, "Project team unavailable.");
    const isMaintainer = p.maintainerUserId === input.actorUserId;
    const own = await tx.select().from(projectMemberships).where(and(eq(projectMemberships.projectId, p.id), eq(projectMemberships.profileId, actor.id)));
    if (!isMaintainer && !own.length) fail("FORBIDDEN", 403, "This private project team is unavailable.");
    const rows = await tx.select({ id: projectMemberships.id, profileId: projectMemberships.profileId, name: authUsers.name,
      state: projectMemberships.state, version: projectMemberships.version, proposedRoleId: projectMemberships.proposedRoleId,
      removedAt: projectMemberships.removedAt, removalReason: projectMemberships.removalReason, restoredAt: projectMemberships.restoredAt,
      contribution: { roleId: projectContributions.roleId, statement: projectContributions.statement, featured: projectContributions.featured,
        publicVisible: projectContributions.publicVisible, version: projectContributions.version } })
      .from(projectMemberships).innerJoin(studentProfiles, eq(studentProfiles.id, projectMemberships.profileId))
      .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
      .leftJoin(projectContributions, eq(projectContributions.membershipId, projectMemberships.id))
      .where(and(eq(projectMemberships.projectId, p.id), isMaintainer ? undefined : eq(projectMemberships.profileId, actor.id)))
      .orderBy(projectMemberships.createdAt, projectMemberships.id);
    const transfers = await tx.select({ id: projectMaintainerTransfers.id, toMembershipId: projectMaintainerTransfers.toMembershipId,
      state: projectMaintainerTransfers.state, projectVersion: projectMaintainerTransfers.projectVersion })
      .from(projectMaintainerTransfers).where(and(eq(projectMaintainerTransfers.projectId, p.id),
        isMaintainer ? undefined : eq(projectMaintainerTransfers.toMembershipId, own[0].id)))
      .orderBy(projectMaintainerTransfers.createdAt);
    return { project: { id: p.id, title: p.title, description: p.description, publicationStatus: p.publicationStatus, version: p.version },
      isMaintainer, ownMembershipId: own[0]?.id ?? null, members: rows, transfers, joinRequests: isMaintainer ? await tx.select({ id: projectJoinRequests.id, profileId: projectJoinRequests.profileId, state: projectJoinRequests.state, version: projectJoinRequests.version, name: authUsers.name }).from(projectJoinRequests).innerJoin(studentProfiles, eq(studentProfiles.id, projectJoinRequests.profileId)).innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId)).where(eq(projectJoinRequests.projectId, p.id)).orderBy(projectJoinRequests.createdAt) : [], roles: await getProjectRoles(tx) };
  });
}

export async function listProjectRelationships(input: Context) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    return tx.select({ id: projects.id, title: projects.title, description: projects.description, publicationStatus: projects.publicationStatus,
      membershipId: projectMemberships.id, state: projectMemberships.state, proposedRole: projectRoles.name,
      isMaintainer: sql<boolean>`${projects.maintainerUserId} = ${input.actorUserId}`,
      pendingMaintenance: sql<boolean>`exists (select 1 from project_maintainer_transfers t where t.project_id = ${projects.id} and t.to_membership_id = ${projectMemberships.id} and t.state = 'pending')` })
      .from(projectMemberships).innerJoin(projects, eq(projects.id, projectMemberships.projectId))
      .innerJoin(projectRoles, eq(projectRoles.id, projectMemberships.proposedRoleId))
      .where(eq(projectMemberships.profileId, actor.id)).orderBy(projects.title, projects.id);
  });
}

export async function findEligibleTeammates(input: Context & { projectId: string; query: string }) {
  const query = parse(z.string().trim().min(2).max(160), input.query);
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId);
    const [p] = await tx.select().from(projects).where(eq(projects.id, input.projectId)).for("share");
    if (!p) fail("NOT_FOUND", 404, "Project unavailable.");
    maintainer(p, input.actorUserId);
    // Search only published identities. An exact, explicitly shared UUID can
    // identify a private profile; no email lookup/private profile directory.
    const exactId = z.uuid().safeParse(query).success;
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    return tx.select({ id: studentProfiles.id, name: authUsers.name, headline: studentProfiles.headline })
      .from(studentProfiles).innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
      .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
      .where(and(eq(studentAffiliations.status, "verified"), sql`${studentProfiles.ownerUserId} <> ${input.actorUserId}`,
        exactId ? eq(studentProfiles.id, query) : and(eq(studentProfiles.publicationStatus, "published"),
          or(ilike(authUsers.name, `%${escaped}%`), ilike(studentProfiles.headline, `%${escaped}%`)))))
      .orderBy(authUsers.name, studentProfiles.id).limit(20);
  });
}

export async function checkProjectDuplicates(input: Context & { draft: unknown }) {
  const draft = parse(projectDraftSchema, input.draft);
  return input.db.transaction(async tx => { await verified(tx, input.actorUserId); return queryProjectDuplicates(tx, draft, input.actorUserId); });
}

export async function requestToJoinProject(input: Context & { projectId: string }) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    const p = await lockProject(tx, input.projectId);
    if (p.publicationStatus !== "published" || p.origin !== "student" || !p.maintainerUserId) fail("NOT_FOUND", 404, "This public project does not accept join requests.");
    if ((await tx.select({ id: projectMemberships.id }).from(projectMemberships).where(and(eq(projectMemberships.projectId, p.id), eq(projectMemberships.profileId, actor.id)))).length) fail("MEMBERSHIP_EXISTS", 409, "You already have a relationship with this project. Review your invitations or contribution.");
    if ((await tx.select({ id: projectJoinRequests.id }).from(projectJoinRequests).where(and(eq(projectJoinRequests.projectId, p.id), eq(projectJoinRequests.profileId, actor.id)))).length) fail("JOIN_REQUEST_EXISTS", 409, "Your request is already recorded. Review its status in your project inbox.");
    const [result] = await tx.insert(projectJoinRequests).values({ projectId: p.id, profileId: actor.id }).returning({ id: projectJoinRequests.id });
    return result;
  });
}
export async function respondToJoinRequest(input: Context & { joinRequestId: string; version: number; projectVersion: number; approve: boolean; roleId?: string }) {
  if (!z.uuid().safeParse(input.joinRequestId).success) fail("NOT_FOUND", 404, "Request unavailable.");
  return input.db.transaction(async tx => {
    await verified(tx, input.actorUserId);
    const [initial] = await tx.select().from(projectJoinRequests).where(eq(projectJoinRequests.id, input.joinRequestId));
    if (!initial) fail("NOT_FOUND", 404, "Request unavailable.");
    const p = await lockProject(tx, initial.projectId); maintainer(p, input.actorUserId);
    const [r] = await tx.select().from(projectJoinRequests).where(eq(projectJoinRequests.id, initial.id));
    revision(r.version, input.version); revision(p.version, input.projectVersion);
    if (r.state !== "pending") fail("INVALID_TRANSITION", 409, "This request has already been answered.");
    let membershipId: string | null = null;
    if (input.approve) {
      if (p.publicationStatus !== "published") fail("INVALID_TRANSITION", 409, "Publish the project before approving a public join request.");
      await role(tx, input.roleId ?? "");
      const [target] = await tx.select({ id: studentProfiles.id }).from(studentProfiles).innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId)).where(and(eq(studentProfiles.id, r.profileId), eq(studentAffiliations.status, "verified")));
      if (!target) fail("AFFILIATION_REQUIRED", 409, "The requester is no longer eligible for an invitation.");
      if ((await tx.select({ id: projectMemberships.id }).from(projectMemberships).where(and(eq(projectMemberships.projectId, p.id), eq(projectMemberships.profileId, r.profileId)))).length) fail("MEMBERSHIP_EXISTS", 409, "This student already has a relationship. Review it before responding.");
      const [m] = await tx.insert(projectMemberships).values({ projectId: p.id, profileId: r.profileId, proposedRoleId: input.roleId!, invitedByUserId: input.actorUserId }).returning({ id: projectMemberships.id });
      membershipId = m.id;
    }
    await tx.update(projectJoinRequests).set({ state: input.approve ? "approved" : "declined", version: r.version + 1, respondedAt: new Date(), respondedByUserId: input.actorUserId, membershipId }).where(eq(projectJoinRequests.id, r.id));
    await bump(tx, p.id); return { id: r.id };
  });
}
export async function listOwnJoinRequests(input: Context) {
  return input.db.transaction(async tx => {
    const actor = await verified(tx, input.actorUserId);
    return tx.select({ id: projectJoinRequests.id, projectId: projects.id, state: projectJoinRequests.state,
      title: sql<string>`case when ${projects.publicationStatus} = 'published' then ${projects.title} else 'Project unavailable' end` })
      .from(projectJoinRequests).innerJoin(projects, eq(projects.id, projectJoinRequests.projectId)).where(eq(projectJoinRequests.profileId, actor.id)).orderBy(projectJoinRequests.createdAt);
  });
}

export async function verifyProjectStudent(input: Context) { await input.db.transaction(async tx => { await verified(tx, input.actorUserId); }); }
