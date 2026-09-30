import { asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  projectAssets,
  projectContributors,
  projects,
  projectTechnologies,
  students,
} from "@/db/schema";

export interface PublicProjectContributor {
  studentId: string;
  name: string | null;
  headline: string | null;
  role: string;
  profileUrl: string | null;
}

export interface PublicProjectAsset {
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
}

export async function queryPublicProject(
  db: Database,
  projectId: string,
): Promise<PublicProjectDetail | null> {
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      domain: projects.domain,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return null;

  const [technologyRows, contributorRows, assetRows] = await Promise.all([
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
        profileStatus: students.profileStatus,
      })
      .from(projectContributors)
      .innerJoin(students, eq(students.id, projectContributors.studentId))
      .where(eq(projectContributors.projectId, projectId))
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
  ]);

  return {
    ...project,
    technologies: technologyRows.map(({ name }) => name),
    contributors: contributorRows.map(({ profileStatus, ...contributor }) => {
      const isPublished = profileStatus === "published";
      return {
        ...contributor,
        name: isPublished ? contributor.name : null,
        headline: isPublished ? contributor.headline : null,
        profileUrl: isPublished ? `/students/${contributor.studentId}` : null,
      };
    }),
    assets: assetRows,
  };
}
