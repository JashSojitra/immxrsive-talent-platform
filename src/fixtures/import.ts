import { inArray, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  availabilityOptions,
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

import { professionalLinkId, projectAssetId, skillIdForName } from "./ids";
import {
  AVAILABILITY_VALUES,
  normalizeSkillName,
  type FixtureData,
} from "./schema";

export interface ImportCounts {
  students: number;
  skills: number;
  studentSkills: number;
  availabilityOptions: number;
  studentAvailability: number;
  professionalLinks: number;
  projects: number;
  projectContributors: number;
  projectTechnologies: number;
  projectAssets: number;
}

export async function importFixtureData(
  db: Database,
  fixtureData: FixtureData,
): Promise<ImportCounts> {
  const skillIds = new Map(
    fixtureData.skills.map((skillName) => [skillName, skillIdForName(skillName)]),
  );
  const studentIds = fixtureData.students.map((student) => student.id);
  const projectIds = fixtureData.projects.map((project) => project.id);

  const studentSkillRows = fixtureData.students.flatMap((student) =>
    student.skills.map((skillName, displayOrder) => ({
      studentId: student.id,
      skillId: requiredMapValue(skillIds, skillName),
      displayOrder,
    })),
  );
  const studentAvailabilityRows = fixtureData.students.flatMap((student) =>
    student.availability.map((availabilityValue, displayOrder) => ({
      studentId: student.id,
      availabilityValue,
      displayOrder,
    })),
  );
  const professionalLinkRows = fixtureData.students.flatMap((student) =>
    Object.entries(student.links).map(([linkType, url], displayOrder) => ({
      id: professionalLinkId(student.id, linkType),
      studentId: student.id,
      linkType,
      label: humanizeLabel(linkType),
      url,
      displayOrder,
    })),
  );
  const contributorRows = fixtureData.projects.flatMap((project) =>
    project.contributors.map((contributor, displayOrder) => ({
      projectId: project.id,
      studentId: contributor.student_id,
      role: contributor.role,
      displayOrder,
    })),
  );
  const technologyRows = fixtureData.projects.flatMap((project) =>
    project.technologies.map((technologyName, displayOrder) => ({
      projectId: project.id,
      technologyName,
      displayOrder,
    })),
  );
  const projectAssetRows = fixtureData.projects.flatMap((project) =>
    Object.entries(project.links).map(([assetType, url], displayOrder) => ({
      id: projectAssetId(project.id, assetType),
      projectId: project.id,
      assetType,
      label: humanizeLabel(assetType),
      url,
      displayOrder,
    })),
  );

  await db.transaction(async (tx) => {
    await tx
      .insert(availabilityOptions)
      .values(
        AVAILABILITY_VALUES.map((value, displayOrder) => ({ value, displayOrder })),
      )
      .onConflictDoUpdate({
        target: availabilityOptions.value,
        set: { displayOrder: sql.raw('excluded."display_order"') },
      });

    if (fixtureData.skills.length > 0) {
      await tx
        .insert(skills)
        .values(
          fixtureData.skills.map((name, displayOrder) => ({
            id: requiredMapValue(skillIds, name),
            name,
            normalizedName: normalizeSkillName(name),
            displayOrder,
          })),
        )
        .onConflictDoUpdate({
          target: skills.id,
          set: {
            name: sql.raw('excluded."name"'),
            normalizedName: sql.raw('excluded."normalized_name"'),
            displayOrder: sql.raw('excluded."display_order"'),
          },
        });
    }

    if (fixtureData.students.length > 0) {
      await tx
        .insert(students)
        .values(
          fixtureData.students.map((student) => ({
            id: student.id,
            name: student.name,
            headline: student.headline,
            program: student.program,
            status: student.status,
            profileStatus: student.profile_status,
          })),
        )
        .onConflictDoUpdate({
          target: students.id,
          set: {
            name: sql.raw('excluded."name"'),
            headline: sql.raw('excluded."headline"'),
            program: sql.raw('excluded."program"'),
            status: sql.raw('excluded."status"'),
            profileStatus: sql.raw('excluded."profile_status"'),
          },
        });
    }

    if (fixtureData.projects.length > 0) {
      await tx
        .insert(projects)
        .values(
          fixtureData.projects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            domain: project.domain,
          })),
        )
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            title: sql.raw('excluded."title"'),
            description: sql.raw('excluded."description"'),
            domain: sql.raw('excluded."domain"'),
          },
        });
    }

    if (projectIds.length > 0) {
      await tx
        .delete(projectContributors)
        .where(inArray(projectContributors.projectId, projectIds));
      await tx
        .delete(projectTechnologies)
        .where(inArray(projectTechnologies.projectId, projectIds));
      await tx
        .delete(projectAssets)
        .where(inArray(projectAssets.projectId, projectIds));
    }

    if (studentIds.length > 0) {
      await tx
        .delete(studentSkills)
        .where(inArray(studentSkills.studentId, studentIds));
      await tx
        .delete(studentAvailability)
        .where(inArray(studentAvailability.studentId, studentIds));
      await tx
        .delete(professionalLinks)
        .where(inArray(professionalLinks.studentId, studentIds));
    }

    if (studentSkillRows.length > 0) {
      await tx.insert(studentSkills).values(studentSkillRows);
    }
    if (studentAvailabilityRows.length > 0) {
      await tx.insert(studentAvailability).values(studentAvailabilityRows);
    }
    if (professionalLinkRows.length > 0) {
      await tx.insert(professionalLinks).values(professionalLinkRows);
    }
    if (contributorRows.length > 0) {
      await tx.insert(projectContributors).values(contributorRows);
    }
    if (technologyRows.length > 0) {
      await tx.insert(projectTechnologies).values(technologyRows);
    }
    if (projectAssetRows.length > 0) {
      await tx.insert(projectAssets).values(projectAssetRows);
    }
  });

  return {
    students: fixtureData.students.length,
    skills: fixtureData.skills.length,
    studentSkills: studentSkillRows.length,
    availabilityOptions: AVAILABILITY_VALUES.length,
    studentAvailability: studentAvailabilityRows.length,
    professionalLinks: professionalLinkRows.length,
    projects: fixtureData.projects.length,
    projectContributors: contributorRows.length,
    projectTechnologies: technologyRows.length,
    projectAssets: projectAssetRows.length,
  };
}

function requiredMapValue(map: ReadonlyMap<string, string>, key: string) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Validated fixture value is missing from lookup: ${key}`);
  }
  return value;
}

function humanizeLabel(value: string) {
  return value
    .replaceAll(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
