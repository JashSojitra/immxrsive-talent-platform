import { and, asc, eq } from "drizzle-orm";

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
  name: string;
  headline: string;
  role: string;
  profileUrl: string;
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
  ]);

  return {
    ...project,
    technologies: technologyRows.map(({ name }) => name),
    contributors: contributorRows.map((contributor) => ({
      ...contributor,
      profileUrl: `/students/${contributor.studentId}`,
    })),
    assets: assetRows,
  };
}
