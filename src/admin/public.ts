import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { adminCreditLinks, adminProjectDetails, projects, studentAffiliations, studentProfiles } from "@/db/schema";
import type { PublicProjectDetail } from "@/db/queries/project-detail";
import type { AdminContent } from "./policy";
export type PublicAdminPresentation = Omit<AdminContent, "credits">;
export function projectPresentation(id: string, content: AdminContent, links: Set<string> = new Set()): PublicProjectDetail {
  const { credits, ...presentation } = content;
  return {
    id, title: content.title, description: content.description, domain: content.domain, technologies: content.technologies, projectDate: content.startDate, projectStatus: content.projectStatus,
    managementMode: "ADMIN_MANAGED", adminPresentation: presentation,
    contributors: credits.map((c, i) => ({ studentId: `credit-${i}`, name: c.name, role: c.role, headline: "Project credit", statement: c.statement, profileUrl: c.profileId && links.has(c.profileId.toLowerCase()) ? `/students/${c.profileId.toLowerCase()}` : "" })),
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
  const ids = row.content.credits.flatMap(c => c.profileId ? [c.profileId.toLowerCase()] : []);
  const profiles = ids.length ? await db.select({ id: studentProfiles.id }).from(adminCreditLinks)
    .innerJoin(studentProfiles, eq(studentProfiles.id, adminCreditLinks.profileId))
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(eq(adminCreditLinks.projectId, id), inArray(studentProfiles.id, ids), eq(studentProfiles.publicationStatus, "published"), eq(studentAffiliations.status, "verified"))) : [];
  return projectPresentation(row.id, row.content, new Set(profiles.map(p => p.id)));
}
export async function publicAdminShowcases(db: Database) {
  const rows = await db.select({ projectId: projects.id, title: projects.title, content: adminProjectDetails.content }).from(adminProjectDetails)
    .innerJoin(projects, eq(projects.id, adminProjectDetails.projectId)).where(and(eq(projects.managementMode, "ADMIN_MANAGED"), eq(projects.publicationStatus, "published"), eq(adminProjectDetails.lifecycle, "published"))).orderBy(asc(projects.id));
  return rows.sort((a,b) => Number(b.content.featured) - Number(a.content.featured) || a.content.displayOrder - b.content.displayOrder || a.title.localeCompare(b.title)).map(r => ({ projectId: r.projectId, title: r.title, summary: r.content.summary, domain: r.content.domain, technologies: r.content.technologies, featured: r.content.featured }));
}
