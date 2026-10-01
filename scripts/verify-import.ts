import "dotenv/config";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to verify the imported fixtures.");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const [counts] = await sql<
    Array<{
      students: number;
      publishedStudents: number;
      projects: number;
      skills: number;
      contributors: number;
      studentSkills: number;
      availabilityOptions: number;
      studentAvailability: number;
      professionalLinks: number;
      projectTechnologies: number;
      projectAssets: number;
    }>
  >`
    select
      (select count(*)::int from students) as students,
      (select count(*)::int from students where profile_status = 'published') as "publishedStudents",
      (select count(*)::int from projects) as projects,
      (select count(*)::int from skills) as skills,
      (select count(*)::int from project_contributors) as contributors,
      (select count(*)::int from student_skills) as "studentSkills",
      (select count(*)::int from availability_options) as "availabilityOptions",
      (select count(*)::int from student_availability) as "studentAvailability",
      (select count(*)::int from professional_links) as "professionalLinks",
      (select count(*)::int from project_technologies) as "projectTechnologies",
      (select count(*)::int from project_assets) as "projectAssets"
  `;

  assertEqual(counts.students, 18, "student count");
  assertEqual(counts.publishedStudents, 17, "published student count");
  assertEqual(counts.projects, 9, "project count");
  assertEqual(counts.skills, 24, "standardized skill count");
  assertEqual(counts.contributors, 24, "project contributor count");
  assertEqual(counts.studentSkills, 53, "explicit student skill count");
  assertEqual(counts.availabilityOptions, 3, "availability option count");
  assertEqual(counts.studentAvailability, 22, "student availability count");
  assertEqual(counts.professionalLinks, 18, "professional link count");
  assertEqual(counts.projectTechnologies, 31, "project technology count");
  assertEqual(counts.projectAssets, 9, "project asset count");

  const multiValuedAvailability = await sql<
    Array<{ id: string; values: string[] }>
  >`
    select
      s.id,
      array_agg(sa.availability_value::text order by sa.display_order) as values
    from students s
    join student_availability sa on sa.student_id = s.id
    group by s.id
    having count(*) > 1
    order by s.id
  `;
  assertEqual(multiValuedAvailability.length, 4, "multi-availability student count");
  assertArrayEqual(
    requiredRow(multiValuedAvailability, "S02").values,
    ["internship", "contract"],
    "S02 availability",
  );

  const [s16] = await sql<Array<{ profileStatus: string }>>`
    select profile_status::text as "profileStatus"
    from students
    where id = 'S16'
  `;
  assertEqual(s16?.profileStatus, "unpublished", "S16 profile status");

  const [separation] = await sql<
    Array<{ projectUsesCSharp: boolean; studentHasCSharp: boolean }>
  >`
    select
      exists(
        select 1 from project_technologies
        where project_id = 'P01' and technology_name = 'C#'
      ) as "projectUsesCSharp",
      exists(
        select 1
        from student_skills ss
        join skills sk on sk.id = ss.skill_id
        where ss.student_id = 'S06' and sk.name = 'C#'
      ) as "studentHasCSharp"
  `;
  assertEqual(separation.projectUsesCSharp, true, "P01 C# technology evidence");
  assertEqual(separation.studentHasCSharp, false, "S06 explicit C# skill absence");

  const [sharedProject] = await sql<
    Array<{ projectRows: number; contributorRows: number }>
  >`
    select
      (select count(*)::int from projects where id = 'P01') as "projectRows",
      (
        select count(*)::int from project_contributors where project_id = 'P01'
      ) as "contributorRows"
  `;
  assertEqual(sharedProject.projectRows, 1, "canonical P01 row count");
  assertEqual(sharedProject.contributorRows, 3, "P01 contributor count");

  console.log("Imported fixture verification passed.");
  console.log(JSON.stringify({ counts, multiValuedAvailability, s16, separation, sharedProject }, null, 2));
} finally {
  await sql.end();
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function assertArrayEqual(actual: string[], expected: string[], label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

function requiredRow<T extends { id: string }>(rows: T[], id: string) {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) {
    throw new Error(`Expected imported row ${id} was not found.`);
  }
  return row;
}
