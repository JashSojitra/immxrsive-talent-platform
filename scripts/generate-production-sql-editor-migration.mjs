import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const migrationsDirectory = "drizzle";
const journal = JSON.parse(
  readFileSync(join(migrationsDirectory, "meta", "_journal.json"), "utf8"),
);
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();

if (journal.dialect !== "postgresql" || journal.entries.length !== migrationFiles.length) {
  throw new Error("Drizzle journal and SQL migration files do not align.");
}

const migrations = migrationFiles.map((file, index) => {
  const sql = readFileSync(join(migrationsDirectory, file), "utf8");
  const entry = journal.entries[index];
  const tag = basename(file, ".sql");

  if (entry.idx !== index || entry.tag !== tag) {
    throw new Error(`Migration ${file} does not match journal entry ${index}.`);
  }

  return {
    ...entry,
    file,
    hash: createHash("sha256").update(sql).digest("hex"),
    sql: sql.replaceAll("--> statement-breakpoint", ""),
  };
});

const baseline = migrations[0];
const expectedRows = migrations
  .map(
    (migration) =>
      `    (${migration.idx}, '${migration.tag}', '${migration.hash}', ${migration.when}::bigint)`,
  )
  .join(",\n");

const precheck = `-- NOT ImmXrsive Release 2 production precheck (READ ONLY)
-- In Supabase, first confirm the selected project is acnwbxqzkcdqgbohvpil.
-- Expected database: postgres. This script makes no changes.

BEGIN TRANSACTION READ ONLY;

SELECT
  current_database() AS database_name,
  current_user AS database_user,
  current_setting('transaction_read_only') AS transaction_read_only;

SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY id;

WITH expected(id, tag, hash, created_at) AS (
  VALUES
${expectedRows}
), actual AS (
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
)
SELECT
  (SELECT count(*) FROM actual) AS actual_journal_rows,
  1 AS required_journal_rows,
  (SELECT id = 1 AND hash = '${baseline.hash}' AND created_at = ${baseline.when}::bigint
     FROM actual ORDER BY id LIMIT 1) AS migration_0000_matches,
  '${baseline.hash}' AS expected_0000_hash,
  ${baseline.when}::bigint AS expected_0000_created_at;

SELECT 'students' AS relation, count(*)::bigint AS row_count FROM public.students
UNION ALL SELECT 'projects', count(*)::bigint FROM public.projects
UNION ALL SELECT 'skills', count(*)::bigint FROM public.skills
UNION ALL SELECT 'inquiries', count(*)::bigint FROM public.inquiries
ORDER BY relation;

SELECT
  to_regclass('public.students') AS students_table,
  to_regclass('public.projects') AS projects_table,
  to_regclass('public.skills') AS skills_table,
  to_regclass('public.inquiries') AS inquiries_table,
  to_regclass('public.auth_users') AS auth_users_must_be_null,
  to_regclass('public.student_profiles') AS student_profiles_must_be_null;

COMMIT;
`;

const migrationSections = migrations
  .slice(1)
  .map(
    (migration) => `-- ${migration.file}\n${migration.sql.trim()}\n\nINSERT INTO drizzle.__drizzle_migrations (hash, created_at)\nVALUES ('${migration.hash}', ${migration.when}::bigint);`,
  )
  .join("\n\n");

const expectedJournalValues = migrations
  .map(
    (entry) => `      ('${entry.hash}', ${entry.when}::bigint)`,
  )
  .join(",\n");

const migration = `-- NOT ImmXrsive Release 2 production migration for Supabase SQL Editor
-- Generated from drizzle/0001-0006 and drizzle/meta/_journal.json.
-- Run only in project acnwbxqzkcdqgbohvpil after the read-only precheck matches exactly.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $preflight$
DECLARE
  journal_rows bigint;
  baseline_id integer;
  baseline_hash text;
  baseline_created_at bigint;
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database: expected postgres, got %', current_database();
  END IF;

  IF to_regclass('drizzle.__drizzle_migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing drizzle.__drizzle_migrations';
  END IF;

  SELECT count(*) INTO journal_rows FROM drizzle.__drizzle_migrations;
  IF journal_rows <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one production journal row, found %', journal_rows;
  END IF;

  SELECT id, hash, created_at
  INTO baseline_id, baseline_hash, baseline_created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id
  LIMIT 1;

  IF baseline_id <> 1
     OR baseline_hash <> '${baseline.hash}'
     OR baseline_created_at <> ${baseline.when}::bigint THEN
    RAISE EXCEPTION 'Migration 0000 journal mismatch';
  END IF;

  IF (SELECT count(*) FROM public.students) <> 18
     OR (SELECT count(*) FROM public.projects) <> 9
     OR (SELECT count(*) FROM public.skills) <> 24
     OR (SELECT count(*) FROM public.inquiries) <> 3 THEN
    RAISE EXCEPTION 'Release 1 row-count baseline mismatch';
  END IF;

  IF to_regclass('public.auth_users') IS NOT NULL
     OR to_regclass('public.student_profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'Release 2 schema objects already exist while the journal is at 0000';
  END IF;
END
$preflight$;

${migrationSections}

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 7 THEN
    RAISE EXCEPTION 'Expected seven journal rows after migration';
  END IF;

  IF (
    WITH expected(hash, created_at) AS (
      VALUES
${expectedJournalValues}
    )
    SELECT count(*)
    FROM expected
    INNER JOIN drizzle.__drizzle_migrations actual USING (hash, created_at)
  ) <> 7 THEN
    RAISE EXCEPTION 'One or more journal hashes or timestamps do not match';
  END IF;

  IF (SELECT count(*) FROM public.students) <> 18
     OR (SELECT count(*) FROM public.projects) <> 9
     OR (SELECT count(*) FROM public.skills) <> 24
     OR (SELECT count(*) FROM public.inquiries) <> 3 THEN
    RAISE EXCEPTION 'Release 1 data counts changed during migration';
  END IF;

  IF to_regclass('public.auth_users') IS NULL
     OR to_regclass('public.student_profiles') IS NULL
     OR to_regclass('public.student_profile_education') IS NULL
     OR to_regclass('public.student_profile_experience') IS NULL THEN
    RAISE EXCEPTION 'Required Release 2 tables are missing';
  END IF;
END
$postflight$;

COMMIT;
`;

const postcheck = `-- NOT ImmXrsive Release 2 production post-migration verification (READ ONLY)
-- Run only in Supabase project acnwbxqzkcdqgbohvpil after the migration succeeds.

BEGIN TRANSACTION READ ONLY;

WITH expected(tag, hash, created_at) AS (
  VALUES
${migrations
  .map(
    (entry) => `    ('${entry.tag}', '${entry.hash}', ${entry.when}::bigint)`,
  )
  .join(",\n")}
)
SELECT
  expected.tag,
  actual.id,
  actual.hash,
  actual.created_at,
  (actual.hash = expected.hash AND actual.created_at = expected.created_at) AS matches
FROM expected
LEFT JOIN drizzle.__drizzle_migrations actual
  ON actual.hash = expected.hash AND actual.created_at = expected.created_at
ORDER BY expected.created_at;

SELECT 'students' AS relation, count(*)::bigint AS row_count FROM public.students
UNION ALL SELECT 'projects', count(*)::bigint FROM public.projects
UNION ALL SELECT 'skills', count(*)::bigint FROM public.skills
UNION ALL SELECT 'inquiries', count(*)::bigint FROM public.inquiries
ORDER BY relation;

SELECT
  to_regclass('public.auth_users') AS auth_users,
  to_regclass('public.student_affiliations') AS student_affiliations,
  to_regclass('public.student_profiles') AS student_profiles,
  to_regclass('public.student_profile_education') AS student_profile_education,
  to_regclass('public.student_profile_experience') AS student_profile_experience;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'student_profiles'
ORDER BY ordinal_position;

COMMIT;
`;

writeFileSync("docs/release-2-production-precheck.sql", precheck);
writeFileSync("docs/release-2-production-migration.sql", migration);
writeFileSync("docs/release-2-production-postcheck.sql", postcheck);

console.log(
  JSON.stringify(
    {
      baseline: {
        tag: baseline.tag,
        hash: baseline.hash,
        createdAt: baseline.when,
      },
      pending: migrations.slice(1).map(({ tag, hash, when }) => ({
        tag,
        hash,
        createdAt: when,
      })),
    },
    null,
    2,
  ),
);
