import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { adminCreditLinks, adminProjectDetails, projects, studentAffiliations, studentProfiles } from "@/db/schema";
import type { PublicProjectDetail } from "@/db/queries/project-detail";
import type { AdminContent } from "./policy";
import { resolvedEmailCredits } from "./credit-queries";
import { queryProjectScreenshots } from "@/projects/screenshot-queries";
export type PublicAdminPresentation = Omit<AdminContent, "credits">;
export function projectPresentation(id: string, content: AdminContent, links: Set<string> = new Set(), emailLinks = new Map<number, string>()): PublicProjectDetail {
  const { credits, ...presentation } = content;
  return {
    id, title: content.title, description: content.description, domain: content.domain, technologies: content.technologies, projectDate: content.startDate, projectStatus: content.projectStatus,
    managementMode: "ADMIN_MANAGED", adminPresentation: presentation,
    contributors: credits.map((c, i) => { const profileId = emailLinks.get(i) ?? c.profileId?.toLowerCase(); return { studentId: `credit-${i}`, name: c.name, role: c.role, headline: "Project credit", statement: c.statement, profileUrl: profileId && links.has(profileId) ? `/students/${profileId}` : "" }; }),
    assets: [
      ...(content.originalRepository ? [{ type: "source", label: "Original source repository", url: content.originalRepository }] : []),
      ...(content.adaptedRepository ? [{ type: "source", label: "Adapted demo source", url: content.adaptedRepository }] : []),
    ],
  };
}
// Guarded admin preview uses projectPresentation directly; this query is public only.
export async function queryAdminPublicProject(db: Database, id: string) {
  const [row] = await db.select({ id: projects.id, content: adminProjectDetails.content }).from(adminProjectDetails)
    .innerJoin(projects, eq(projects.id, adminProjectDetails.projectId))
    .where(and(eq(projects.id, id), eq(projects.managementMode, "ADMIN_MANAGED"), eq(projects.publicationStatus, "published"), eq(adminProjectDetails.lifecycle, "published")));
  if (!row) return null;
  const resolved = await resolvedEmailCredits(db, [id]);
  const ids = [...row.content.credits.flatMap(c => c.profileId ? [c.profileId.toLowerCase()] : []), ...resolved.map(c => c.profileId)];
  const profiles = ids.length ? await db.select({ id: studentProfiles.id }).from(adminCreditLinks)
    .innerJoin(studentProfiles, eq(studentProfiles.id, adminCreditLinks.profileId))
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(eq(adminCreditLinks.projectId, id), inArray(studentProfiles.id, ids), eq(studentProfiles.publicationStatus, "published"), eq(studentAffiliations.status, "verified"))) : [];
  const emailLinks = new Map(resolved.filter(c => c.publicationStatus === "published").map(c => [c.creditIndex, c.profileId]));
  return { ...projectPresentation(row.id, row.content, new Set([...profiles.map(p => p.id), ...emailLinks.values()]), emailLinks), screenshots: await queryProjectScreenshots(db, [id]) };
}
export interface CuratedCredit { projectId: string; title: string; summary: string; domain: string; roles: string[]; technologies: string[]; published?: boolean }
// Read-only reverse view of admin_credit_links. A credit is descriptive
// attribution: it never counts as project evidence, membership or ownership.
// Shown only while both the admin project and the verified profile are public.
export async function queryCuratedCredits(db: Database, profileId: string, privateDashboard = false): Promise<CuratedCredit[]> {
  const id = profileId.toLowerCase();
  const [profile] = await db.select({ id: studentProfiles.id }).from(studentProfiles)
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(eq(studentProfiles.id, id), eq(studentAffiliations.status, "verified"), privateDashboard ? undefined : eq(studentProfiles.publicationStatus, "published")));
  if (!profile) return [];
  const [direct, resolved] = await Promise.all([
    db.select({ projectId: adminCreditLinks.projectId }).from(adminCreditLinks).where(eq(adminCreditLinks.profileId, id)),
    resolvedEmailCredits(db, [], id),
  ]);
  const ids = [...new Set([...direct.map(r => r.projectId), ...resolved.map(r => r.projectId)])];
  if (!ids.length) return [];
  const rows = await db.select({ projectId: projects.id, title: projects.title, content: adminProjectDetails.content, publication: projects.publicationStatus, lifecycle: adminProjectDetails.lifecycle }).from(adminProjectDetails)
    .innerJoin(projects, eq(projects.id, adminProjectDetails.projectId))
    .where(and(inArray(projects.id, ids), eq(projects.managementMode, "ADMIN_MANAGED"), privateDashboard ? undefined : eq(projects.publicationStatus, "published"), privateDashboard ? undefined : eq(adminProjectDetails.lifecycle, "published")))
    .orderBy(asc(projects.title), asc(projects.id));
  return rows.map(r => ({
    projectId: r.projectId, title: r.title, summary: r.content.summary, domain: r.content.domain, technologies: r.content.technologies,
    ...(privateDashboard ? { published: r.publication === "published" && r.lifecycle === "published" } : {}),
    roles: [...new Set(r.content.credits.filter((c,i) => c.profileId?.toLowerCase() === id || resolved.some(e => e.projectId === r.projectId && e.creditIndex === i && e.profileId === id)).map(c => c.role))],
  }));
}
export async function publicAdminShowcases(db: Database) {
  const rows = await db.select({ projectId: projects.id, title: projects.title, content: adminProjectDetails.content }).from(adminProjectDetails)
    .innerJoin(projects, eq(projects.id, adminProjectDetails.projectId)).where(and(eq(projects.managementMode, "ADMIN_MANAGED"), eq(projects.publicationStatus, "published"), eq(adminProjectDetails.lifecycle, "published"))).orderBy(asc(projects.id));
  return rows.sort((a,b) => Number(b.content.featured) - Number(a.content.featured) || a.content.displayOrder - b.content.displayOrder || a.title.localeCompare(b.title)).map(r => ({ projectId: r.projectId, title: r.title, summary: r.content.summary, domain: r.content.domain, technologies: r.content.technologies, featured: r.content.featured }));
}
