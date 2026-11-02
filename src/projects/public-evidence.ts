import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { authUsers, projects, projectMemberships, projectContributions, projectRoles, studentProfiles, studentAffiliations, projectRepositories, projectLinks, projectMedia } from "@/db/schema";
import type { PublicProjectAsset } from "@/db/queries/project-detail";

export async function queryStructuredProjectAssets(db: Database, ids: string[]) {
  if (!ids.length) return [];
  const [repos, links, media] = await Promise.all([
    db.select({ projectId: projectRepositories.projectId, url: projectRepositories.url }).from(projectRepositories).where(inArray(projectRepositories.projectId, ids)).orderBy(projectRepositories.displayOrder, projectRepositories.id),
    db.select({ projectId: projectLinks.projectId, url: projectLinks.url, label: projectLinks.label }).from(projectLinks).where(inArray(projectLinks.projectId, ids)).orderBy(projectLinks.displayOrder, projectLinks.id),
    db.select({ projectId: projectMedia.projectId, url: projectMedia.url, label: projectMedia.label, type: projectMedia.kind, altText: projectMedia.altText }).from(projectMedia).where(inArray(projectMedia.projectId, ids)).orderBy(projectMedia.displayOrder, projectMedia.id),
  ]);
  return [...repos.map(row => ({ ...row, type: "repository", label: "Source repository" })), ...links.map(row => ({ ...row, type: "link" })), ...media.map(({ altText, ...row }) => ({ ...row, ...(altText ? { altText } : {}) }))];
}

export function accountEvidenceConditions() {
  return and(eq(projectMemberships.state, "accepted"), eq(projectContributions.publicVisible, true), eq(studentProfiles.publicationStatus, "published"), eq(studentAffiliations.status, "verified"));
}
export async function queryAccountContributors(db: Database, projectId: string) {
  return db.select({ studentId: studentProfiles.id, name: authUsers.name, headline: studentProfiles.headline, role: projectRoles.name, statement: projectContributions.statement })
    .from(projectMemberships).innerJoin(projectContributions, eq(projectContributions.membershipId, projectMemberships.id))
    .innerJoin(projectRoles, eq(projectRoles.id, projectContributions.roleId))
    .innerJoin(studentProfiles, eq(studentProfiles.id, projectMemberships.profileId))
    .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(eq(projectMemberships.projectId, projectId), accountEvidenceConditions())).orderBy(asc(authUsers.name), asc(studentProfiles.id));
}
export async function queryFeaturedProjectRows(db: Database, profileIds: string[]) {
  if (!profileIds.length) return [];
  return db.select({ profileId: studentProfiles.id, id: projects.id, title: projects.title, description: projects.description, domain: projects.domain, role: projectRoles.name })
    .from(projectMemberships).innerJoin(projectContributions, eq(projectContributions.membershipId, projectMemberships.id))
    .innerJoin(projectRoles, eq(projectRoles.id, projectContributions.roleId))
    .innerJoin(projects, eq(projects.id, projectMemberships.projectId))
    .innerJoin(studentProfiles, eq(studentProfiles.id, projectMemberships.profileId))
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(inArray(studentProfiles.id, profileIds), accountEvidenceConditions(), eq(projectContributions.featured, true), eq(projects.publicationStatus, "published")))
    .orderBy(asc(projects.title), asc(projects.id));
}
export function publicAssets(rows: Array<PublicProjectAsset & { projectId: string }>, projectId: string): PublicProjectAsset[] {
  return rows.filter(row => row.projectId === projectId).map(({ type, label, url, altText }) => ({ type, label, url, ...(altText ? { altText } : {}) }));
}
