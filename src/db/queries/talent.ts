import {
  and,
  asc,
  countDistinct,
  eq,
  inArray,
  or,
  type SQL,
  sql,
} from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  availabilityOptions,
  authUsers,
  projectContributors,
  skills,
  studentAvailability,
  studentProfileAvailability,
  studentProfiles,
  studentProfileSkills,
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
  availability?: Array<"internship" | "full-time" | "contract">;
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
  const [legacyItems, selfServiceItems] = await Promise.all([
    queryLegacyTalentDirectory(db, query),
    querySelfServiceTalentDirectory(db, query),
  ]);
  const items = [...legacyItems, ...selfServiceItems].toSorted((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id.localeCompare(b.id));
  return responseEnvelope(items, query);
}

async function queryLegacyTalentDirectory(db: Database, query: TalentQuery) {
  const conditions: SQL[] = [eq(students.profileStatus, "published")];

  for (const group of query.searchGroups) {
    const groupCondition = or(...group.map(searchTermCondition));
    if (groupCondition) conditions.push(groupCondition);
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
    return [];
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

  return studentRows.map((student) => ({
      ...student,
      skills: skillsByStudent.get(student.id) ?? [],
      availability: availabilityByStudent.get(student.id) ?? [],
      projectEvidenceCount: projectCounts.get(student.id) ?? 0,
    }));
}

async function querySelfServiceTalentDirectory(
  db: Database,
  query: TalentQuery,
): Promise<TalentDirectoryItem[]> {
  const rows = await db.select({
    id: studentProfiles.id,
    name: authUsers.name,
    headline: studentProfiles.headline,
    status: studentProfiles.studentStatus,
    showAvailability: studentProfiles.showAvailability,
  }).from(studentProfiles)
    .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
    .where(eq(studentProfiles.publicationStatus, "published"));
  const publishableRows = rows.filter((row): row is typeof row & {
    status: "current" | "alumni";
  } => row.status !== null);
  if (publishableRows.length === 0) return [];

  const profileIds = publishableRows.map(({ id }) => id);
  const [skillRows, availabilityRows] = await Promise.all([
    db.select({ profileId: studentProfileSkills.profileId, name: skills.name })
      .from(studentProfileSkills)
      .innerJoin(skills, eq(skills.id, studentProfileSkills.skillId))
      .where(inArray(studentProfileSkills.profileId, profileIds))
      .orderBy(asc(studentProfileSkills.displayOrder), asc(skills.name)),
    db.select({
      profileId: studentProfileAvailability.profileId,
      value: studentProfileAvailability.availabilityValue,
    }).from(studentProfileAvailability)
      .where(inArray(studentProfileAvailability.profileId, profileIds))
      .orderBy(asc(studentProfileAvailability.displayOrder)),
  ]);
  const skillsByProfile = groupValuesByKey(skillRows, "profileId", "name");
  const availabilityByProfile = groupValuesByKey(availabilityRows, "profileId", "value");

  return publishableRows.flatMap((profile) => {
    const profileSkills = skillsByProfile.get(profile.id) ?? [];
    const publicAvailability = profile.showAvailability
      ? availabilityByProfile.get(profile.id) ?? []
      : undefined;
    if (!matchesSelfServiceQuery(profile, profileSkills, publicAvailability, query)) return [];
    return [{
      id: profile.id,
      name: profile.name,
      headline: profile.headline,
      status: profile.status,
      skills: profileSkills,
      ...(publicAvailability ? { availability: publicAvailability } : {}),
      projectEvidenceCount: 0,
    }];
  });
}

function matchesSelfServiceQuery(
  profile: { name: string; headline: string; status: "current" | "alumni" },
  profileSkills: string[],
  availability: Array<"internship" | "full-time" | "contract"> | undefined,
  query: TalentQuery,
) {
  const searchable = [profile.name, profile.headline, ...profileSkills].map((value) => value.toLowerCase());
  if (!query.searchGroups.every((group) => group.some((term) =>
    searchable.some((value) => value.includes(term.toLowerCase()))))) return false;
  if (!query.skills.every((skill) => profileSkills.includes(skill))) return false;
  if (query.availability.length > 0 && !query.availability.some((value) =>
    availability?.includes(value))) return false;
  if (query.status.length > 0 && !query.status.includes(profile.status)) return false;
  return true;
}

function searchTermCondition(term: string): SQL {
  const pattern = `%${escapeLikeLiteral(term)}%`;
  return sql`(
    ${students.name} ILIKE ${pattern} ESCAPE '!'
    OR ${students.headline} ILIKE ${pattern} ESCAPE '!'
    OR EXISTS (
      SELECT 1
      FROM ${studentSkills}
      INNER JOIN ${skills} ON ${skills.id} = ${studentSkills.skillId}
      WHERE ${studentSkills.studentId} = ${students.id}
        AND ${skills.name} ILIKE ${pattern} ESCAPE '!'
    )
  )`;
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

function groupValuesByKey<
  T extends Record<K, string>,
  K extends keyof T,
  V extends keyof T,
>(rows: T[], key: K, value: V) {
  const values = new Map<string, Array<T[V]>>();
  for (const row of rows) {
    const current = values.get(row[key]) ?? [];
    current.push(row[value]);
    values.set(row[key], current);
  }
  return values;
}

function labelForValue(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
