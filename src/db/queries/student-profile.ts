import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  professionalLinks,
  projectAssets,
  projectContributors,
  projects,
  projectTechnologies,
  skills,
  studentAvailability,
  studentSkills,
  students,
} from "@/db/schema";

export interface PublicLink {
  type: string;
  label: string;
  url: string;
}

export interface StudentProjectEvidence {
  id: string;
  title: string;
  description: string;
  domain: string;
  role: string;
  technologies: string[];
  links: PublicLink[];
}

export interface PublicStudentProfile {
  id: string;
  name: string;
  headline: string;
  program: string;
  status: "current" | "alumni";
  availability: Array<"internship" | "full-time" | "contract">;
  skills: string[];
  links: PublicLink[];
  projects: StudentProjectEvidence[];
}

export async function queryPublicStudentProfile(
  db: Database,
  studentId: string,
): Promise<PublicStudentProfile | null> {
  const [student] = await db
    .select({
      id: students.id,
      name: students.name,
      headline: students.headline,
      program: students.program,
      status: students.status,
    })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.profileStatus, "published")))
    .limit(1);

  if (!student) return null;

  const [skillRows, availabilityRows, linkRows, projectRows] = await Promise.all([
    db
      .select({ name: skills.name })
      .from(studentSkills)
      .innerJoin(skills, eq(skills.id, studentSkills.skillId))
      .where(eq(studentSkills.studentId, studentId))
      .orderBy(asc(studentSkills.displayOrder), asc(skills.name)),
    db
      .select({ value: studentAvailability.availabilityValue })
      .from(studentAvailability)
      .where(eq(studentAvailability.studentId, studentId))
      .orderBy(
        asc(studentAvailability.displayOrder),
        asc(studentAvailability.availabilityValue),
      ),
    db
      .select({
        type: professionalLinks.linkType,
        label: professionalLinks.label,
        url: professionalLinks.url,
      })
      .from(professionalLinks)
      .where(eq(professionalLinks.studentId, studentId))
      .orderBy(asc(professionalLinks.displayOrder), asc(professionalLinks.id)),
    db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        domain: projects.domain,
        role: projectContributors.role,
      })
      .from(projectContributors)
      .innerJoin(projects, eq(projects.id, projectContributors.projectId))
      .where(eq(projectContributors.studentId, studentId))
      .orderBy(asc(sql`lower(${projects.title})`), asc(projects.id)),
  ]);

  const projectIds = projectRows.map((project) => project.id);
  const [technologyRows, assetRows] = projectIds.length === 0
    ? [[], []]
    : await Promise.all([
        db
          .select({
            projectId: projectTechnologies.projectId,
            name: projectTechnologies.technologyName,
          })
          .from(projectTechnologies)
          .where(inArray(projectTechnologies.projectId, projectIds))
          .orderBy(
            asc(projectTechnologies.projectId),
            asc(projectTechnologies.displayOrder),
            asc(projectTechnologies.technologyName),
          ),
        db
          .select({
            projectId: projectAssets.projectId,
            type: projectAssets.assetType,
            label: projectAssets.label,
            url: projectAssets.url,
          })
          .from(projectAssets)
          .where(inArray(projectAssets.projectId, projectIds))
          .orderBy(
            asc(projectAssets.projectId),
            asc(projectAssets.displayOrder),
            asc(projectAssets.id),
          ),
      ]);

  const technologiesByProject = groupByProject(technologyRows, ({ name }) => name);
  const linksByProject = groupByProject(assetRows, ({ type, label, url }) => ({
    type,
    label,
    url,
  }));

  return {
    ...student,
    availability: availabilityRows.map(({ value }) => value),
    skills: skillRows.map(({ name }) => name),
    links: linkRows,
    projects: projectRows.map((project) => ({
      ...project,
      technologies: technologiesByProject.get(project.id) ?? [],
      links: linksByProject.get(project.id) ?? [],
    })),
  };
}

function groupByProject<T extends { projectId: string }, V>(
  rows: T[],
  selectValue: (row: T) => V,
) {
  const grouped = new Map<string, V[]>();
  for (const row of rows) {
    const values = grouped.get(row.projectId) ?? [];
    values.push(selectValue(row));
    grouped.set(row.projectId, values);
  }
  return grouped;
}
