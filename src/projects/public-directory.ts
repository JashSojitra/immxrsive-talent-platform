import { and, asc, eq, ne, or } from "drizzle-orm";
import type { Database } from "@/db/client";
import { adminProjectDetails, projects, projectTechnologies } from "@/db/schema";
import { safeAdminUrl } from "@/admin/policy";
import { queryProjectScreenshots } from "./screenshot-queries";

// Public index uses the same publication/lifecycle gates as public project detail.
export async function listPublicProjects(db: Pick<Database, "select">) {
  const [rows, technologies] = await Promise.all([
    db.select({ id: projects.id, title: projects.title, description: projects.description, domain: projects.domain, managementMode: projects.managementMode, status: projects.projectStatus, presentation: adminProjectDetails.content })
    .from(projects).leftJoin(adminProjectDetails, eq(adminProjectDetails.projectId, projects.id))
    .where(and(eq(projects.publicationStatus, "published"), or(ne(projects.managementMode, "ADMIN_MANAGED"), eq(adminProjectDetails.lifecycle, "published"))))
    .orderBy(asc(projects.title), asc(projects.id)),
    db.select({ projectId: projectTechnologies.projectId, name: projectTechnologies.technologyName }).from(projectTechnologies)
    .innerJoin(projects, eq(projects.id, projectTechnologies.projectId))
    .leftJoin(adminProjectDetails, eq(adminProjectDetails.projectId, projects.id))
    .where(and(eq(projects.publicationStatus, "published"), or(ne(projects.managementMode, "ADMIN_MANAGED"), eq(adminProjectDetails.lifecycle, "published"))))
    .orderBy(asc(projectTechnologies.displayOrder)),
  ]);
  const technologyIndex = new Map<string, string[]>();
  for (const tech of technologies) {
    const names = technologyIndex.get(tech.projectId) ?? [];
    names.push(tech.name);
    technologyIndex.set(tech.projectId, names);
  }
  const screenshots = await queryProjectScreenshots(db, rows.map(r => r.id));
  return rows.map(({ presentation, ...row }) => ({ ...row, media: [...(row.managementMode === "ADMIN_MANAGED" && presentation?.thumbnail && safeAdminUrl(presentation.thumbnail) ? [{ url: presentation.thumbnail, alt: presentation.thumbnailAlt }] : []), ...screenshots.filter(s => s.projectId === row.id).map(s => ({ url: s.url, alt: s.altText })), ...(row.managementMode === "ADMIN_MANAGED" && presentation ? presentation.gallery.filter(image => image.alt && safeAdminUrl(image.url)) : [])], technologies: row.managementMode === "ADMIN_MANAGED" ? presentation?.technologies ?? [] : technologyIndex.get(row.id) ?? [] }));
}
export type PublicProjectListItem = Awaited<ReturnType<typeof listPublicProjects>>[number];
