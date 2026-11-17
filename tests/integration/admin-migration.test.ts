import "./setup";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, expect, test } from "vitest";
import { createDatabase } from "@/db/client";

const connection = createDatabase(process.env.TEST_DATABASE_URL!);
afterAll(() => connection.client.end());

test("0012 upgrades populated R3.1 without changing historical rows or migration evidence", async () => {
  const { db } = connection;
  const [version] = await db.execute(sql`SHOW server_version_num`);
  expect(Number(version.server_version_num)).toBeGreaterThanOrEqual(170000);
  expect(Number(version.server_version_num)).toBeLessThan(180000);
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ idx: number; tag: string }> };
  expect(journal.entries.at(-1)?.tag).toBe("0012_cooing_shatterstar");
  const historical = { ...journal, entries: journal.entries.filter(e => e.idx < 12) };
  expect(historical.entries).toHaveLength(12);
  // Keep the exact historical bytes; only the disposable copy's journal is
  // limited to R3.1. No source migration or ledger is forged or rewritten.
  const folder = await mkdtemp(join(tmpdir(), "immxrsive-admin-migration-"));
  await mkdir(join(folder, "meta"));
  await writeFile(join(folder, "meta/_journal.json"), JSON.stringify(historical));
  for (const entry of historical.entries) await copyFile(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`));
  await migrate(db, { migrationsFolder: folder });
  const owner = randomUUID(), profile = randomUUID(), member = randomUUID();
  await db.execute(sql`INSERT INTO auth_users(id,name,email) VALUES (${owner},'Synthetic existing owner',${`${owner}@example.test`})`);
  await db.execute(sql`INSERT INTO student_profiles(id,owner_user_id,publication_status,student_status) VALUES (${profile},${owner},'published','current')`);
  await db.execute(sql`INSERT INTO projects(id,title,description,domain,origin,maintainer_user_id,publication_status,version)
    VALUES ('existing-student','Existing student','Historical narrative','XR','student',${owner},'published',7),
           ('existing-legacy','Existing fixture','Original fixture','XR','legacy_fixture',NULL,'published',1),
           ('existing-private','Existing private','Private narrative','XR','student',${owner},'unpublished',3)`);
  await db.execute(sql`INSERT INTO project_memberships(id,project_id,profile_id,state,proposed_role_id,invited_by_user_id,accepted_at)
    VALUES (${member},'existing-student',${profile},'accepted','software-developer',${owner},now())`);
  await db.execute(sql`INSERT INTO project_contributions(membership_id,role_id,statement) VALUES (${member},'software-developer','Historical consented work')`);
  await db.execute(sql`INSERT INTO studio_roles(user_id,role) VALUES (${owner},'platform_super_admin')`);
  await db.execute(sql`INSERT INTO studio_submissions(project_id,submitted_by,state,title,summary,accepted_version,accepted_by,accepted_project_version,published)
    VALUES ('existing-student',${owner},'approved','Original showcase','Original owner approval',1,${owner},7,true)`);
  await db.execute(sql`INSERT INTO studio_events(project_id,actor_user_id,action,note,snapshot)
    VALUES ('existing-student',${owner},'publish','Historical immutable evidence','{"version":7}')`);
  const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  async function historicalRows() {
    const snapshots: Record<string, unknown> = {};
    for (const { tablename } of tables) {
      const [row] = await db.execute(sql`SELECT coalesce(jsonb_agg(to_jsonb(t) - 'management_mode' ORDER BY (to_jsonb(t) - 'management_mode')::text),'[]'::jsonb) AS rows FROM public.${sql.identifier(String(tablename))} t`);
      snapshots[String(tablename)] = row.rows;
    }
    return snapshots;
  }
  const before = await historicalRows();
  const ledger = await db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY id`);
  await migrate(db, { migrationsFolder: "drizzle" });
  expect(await historicalRows()).toEqual(before);
  expect(await db.execute(sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY id LIMIT 12`)).toEqual(ledger);
  expect(await db.execute(sql`SELECT id,management_mode FROM projects ORDER BY id`)).toEqual([
    { id: "existing-legacy", management_mode: "STUDENT_MANAGED" },
    { id: "existing-private", management_mode: "STUDENT_MANAGED" },
    { id: "existing-student", management_mode: "STUDENT_MANAGED" },
  ]);
  expect(await db.execute(sql`SELECT * FROM admin_project_details`)).toHaveLength(0);
  // Reapplication uses the ledger and preserves all existing records too.
  await migrate(db, { migrationsFolder: "drizzle" });
  expect(await historicalRows()).toEqual(before);
});
