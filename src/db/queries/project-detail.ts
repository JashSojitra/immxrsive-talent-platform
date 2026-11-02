import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { queryAccountContributors, queryStructuredProjectAssets, publicAssets } from "@/projects/public-evidence";
import {
  projectAssets,
  projectContributors,
  projects,
  projectTechnologies,
  students,
} from "@/db/schema";

export interface PublicProjectContributor {
  studentId: string;
  name: string;
  headline: string;
  role: string;
  profileUrl: string;
  statement?: string;
}

export interface PublicProjectAsset {
  altText?: string;
  type: string;
  label: string;
  url: string;
}

export interface PublicProjectDetail {
  id: string;
  title: string;
  description: string;
  domain: string;
  technologies: string[];
  contributors: PublicProjectContributor[];
  assets: PublicProjectAsset[];
  projectDate?: string | null;
  projectStatus?: string;
}

export async function queryPublicProject(
  db: Database,
  projectId: string,
): Promise<PublicProjectDetail | null> {
  return queryProjectPresentation(db, projectId, true);
}

// Internal projection for guarded maintainer preview. Public callers always use
// queryPublicProject; no URL/query-string parameter controls this flag.
export async function queryProjectPresentation(db: Database, projectId: string, requirePublished: boolean): Promise<PublicProjectDetail | null> {
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      domain: projects.domain,
      origin: projects.origin,
      projectDate: projects.projectDate,
      projectStatus: projects.projectStatus,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), requirePublished ? eq(projects.publicationStatus, "published") : undefined))
    .limit(1);

  if (!project) return null;

  const [technologyRows, contributorRows, assetRows, accountRows, structuredAssets] = await Promise.all([
    db
      .select({ name: projectTechnologies.technologyName })
      .from(projectTechnologies)
      .where(eq(projectTechnologies.projectId, projectId))
      .orderBy(
        asc(projectTechnologies.displayOrder),
        asc(projectTechnologies.technologyName),
      ),
    db
      .select({
        studentId: projectContributors.studentId,
        role: projectContributors.role,
        name: students.name,
        headline: students.headline,
      })
      .from(projectContributors)
      .innerJoin(students, eq(students.id, projectContributors.studentId))
      .where(and(
        eq(projectContributors.projectId, projectId),
        eq(students.profileStatus, "published"),
      ))
      .orderBy(
        asc(projectContributors.displayOrder),
        asc(projectContributors.studentId),
      ),
    db
      .select({
        type: projectAssets.assetType,
        label: projectAssets.label,
        url: projectAssets.url,
      })
      .from(projectAssets)
      .where(eq(projectAssets.projectId, projectId))
      .orderBy(asc(projectAssets.displayOrder), asc(projectAssets.id)),
    queryAccountContributors(db, projectId),
    queryStructuredProjectAssets(db, [projectId]),
  ]);

  return {
    id: project.id, title: project.title, description: project.description, domain: project.domain,
    ...(project.origin === "student" ? { projectDate: project.projectDate, projectStatus: project.projectStatus } : {}),
    technologies: technologyRows.map(({ name }) => name),
    contributors: [...contributorRows.map((contributor) => ({
      ...contributor,
      profileUrl: `/students/${contributor.studentId}`,
    })), ...accountRows.map(({ statement, ...contributor }) => ({ ...contributor, profileUrl: `/students/${contributor.studentId}`, ...(statement ? { statement } : {}) }))],
    assets: [...assetRows, ...publicAssets(structuredAssets, projectId)],
  };
}
