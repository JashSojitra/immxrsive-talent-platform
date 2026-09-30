import {
  and,
  asc,
  countDistinct,
  eq,
  inArray,
  type SQL,
  sql,
} from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  availabilityOptions,
  projectContributors,
  skills,
  studentAvailability,
  studentSkills,
  students,
} from "@/db/schema";
import {
  escapeLikeLiteral,
  TALENT_STATUS_VALUES,
  type TalentQuery,
} from "@/validation/talent-query";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterMetadata {
  skills: FilterOption[];
  availability: FilterOption[];
  status: FilterOption[];
}

export interface TalentDirectoryItem {
  id: string;
  name: string;
  headline: string;
  status: "current" | "alumni";
  skills: string[];
  availability: Array<"internship" | "full-time" | "contract">;
  projectEvidenceCount: number;
}

export interface TalentDirectoryResponse {
  items: TalentDirectoryItem[];
  count: number;
  filters: {
    q: string;
    skill: string[];
    availability: Array<"internship" | "full-time" | "contract">;
    status: Array<"current" | "alumni">;
  };
}

export async function getFilterMetadata(db: Database): Promise<FilterMetadata> {
  const [skillRows, availabilityRows] = await Promise.all([
    db
      .select({ value: skills.name, label: skills.name })
      .from(skills)
      .orderBy(asc(skills.displayOrder), asc(skills.name)),
    db
      .select({ value: availabilityOptions.value })
      .from(availabilityOptions)
      .orderBy(asc(availabilityOptions.displayOrder), asc(availabilityOptions.value)),
  ]);

  return {
    skills: skillRows,
    availability: availabilityRows.map(({ value }) => ({
      value,
      label: labelForValue(value),
    })),
    status: TALENT_STATUS_VALUES.map((value) => ({
      value,
      label: labelForValue(value),
    })),
  };
}

export async function queryTalentDirectory(
  db: Database,
  query: TalentQuery,
): Promise<TalentDirectoryResponse> {
  const conditions: SQL[] = [eq(students.profileStatus, "published")];

  if (query.q) {
    const pattern = `%${escapeLikeLiteral(query.q)}%`;
    conditions.push(sql`(
      ${students.name} ILIKE ${pattern} ESCAPE '!'
      OR ${students.headline} ILIKE ${pattern} ESCAPE '!'
      OR EXISTS (
        SELECT 1
        FROM ${studentSkills}
        INNER JOIN ${skills} ON ${skills.id} = ${studentSkills.skillId}
        WHERE ${studentSkills.studentId} = ${students.id}
          AND ${skills.name} ILIKE ${pattern} ESCAPE '!'
      )
    )`);
  }

  for (const skillName of query.skills) {
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM ${studentSkills}
      INNER JOIN ${skills} ON ${skills.id} = ${studentSkills.skillId}
      WHERE ${studentSkills.studentId} = ${students.id}
        AND ${skills.name} = ${skillName}
    )`);
  }

  if (query.availability.length > 0) {
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM ${studentAvailability}
      WHERE ${studentAvailability.studentId} = ${students.id}
        AND ${inArray(studentAvailability.availabilityValue, query.availability)}
    )`);
  }

  if (query.status.length > 0) {
    conditions.push(inArray(students.status, query.status));
  }

  const studentRows = await db
    .select({
      id: students.id,
      name: students.name,
      headline: students.headline,
      status: students.status,
    })
    .from(students)
    .where(and(...conditions))
    .orderBy(asc(sql`lower(${students.name})`), asc(students.id));

  if (studentRows.length === 0) {
    return responseEnvelope([], query);
  }

  const studentIds = studentRows.map((student) => student.id);
  const [skillRows, availabilityRows, projectCountRows] = await Promise.all([
    db
      .select({ studentId: studentSkills.studentId, name: skills.name })
      .from(studentSkills)
      .innerJoin(skills, eq(skills.id, studentSkills.skillId))
      .where(inArray(studentSkills.studentId, studentIds))
      .orderBy(
        asc(studentSkills.studentId),
        asc(studentSkills.displayOrder),
        asc(skills.name),
      ),
    db
      .select({
        studentId: studentAvailability.studentId,
        value: studentAvailability.availabilityValue,
      })
      .from(studentAvailability)
      .where(inArray(studentAvailability.studentId, studentIds))
      .orderBy(
        asc(studentAvailability.studentId),
        asc(studentAvailability.displayOrder),
        asc(studentAvailability.availabilityValue),
      ),
    db
      .select({
        studentId: projectContributors.studentId,
        count: countDistinct(projectContributors.projectId).mapWith(Number),
      })
      .from(projectContributors)
      .where(inArray(projectContributors.studentId, studentIds))
      .groupBy(projectContributors.studentId),
  ]);

  const skillsByStudent = groupValues(skillRows, "name");
  const availabilityByStudent = groupValues(availabilityRows, "value");
  const projectCounts = new Map(
    projectCountRows.map((row) => [row.studentId, row.count]),
  );

  return responseEnvelope(
    studentRows.map((student) => ({
      ...student,
      skills: skillsByStudent.get(student.id) ?? [],
      availability: availabilityByStudent.get(student.id) ?? [],
      projectEvidenceCount: projectCounts.get(student.id) ?? 0,
    })),
    query,
  );
}

function responseEnvelope(
  items: TalentDirectoryItem[],
  query: TalentQuery,
): TalentDirectoryResponse {
  return {
    items,
    count: items.length,
    filters: {
      q: query.q,
      skill: query.skills,
      availability: query.availability,
      status: query.status,
    },
  };
}

function groupValues<T extends { studentId: string }, K extends keyof T>(
  rows: T[],
  valueKey: K,
) {
  const values = new Map<string, Array<T[K]>>();
  for (const row of rows) {
    const studentValues = values.get(row.studentId) ?? [];
    studentValues.push(row[valueKey]);
    values.set(row.studentId, studentValues);
  }
  return values;
}

function labelForValue(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
