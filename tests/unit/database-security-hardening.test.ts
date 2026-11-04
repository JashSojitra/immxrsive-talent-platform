import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";

const schemaSource = readFileSync("src/db/schema.ts", "utf8");
const migrationSource = readFileSync("drizzle/0007_harden_data_api.sql", "utf8");
const joinMigration = readFileSync("drizzle/0010_r3_project_join_requests.sql", "utf8");
const sharedMigration = readFileSync("drizzle/0009_r3_shared_projects.sql", "utf8");
const productionMigration = readFileSync(
  "docs/release-2-production-security-hardening.sql",
  "utf8",
);
const productionAudit = readFileSync(
  "docs/release-2-production-security-audit.sql",
  "utf8",
);
const productionPostcheck = readFileSync(
  "docs/release-2-production-security-postcheck.sql",
  "utf8",
);

// Source verification only: tolerate checkout CRLF, preserving every other byte.
// This helper is never used by migration application or runtime hashing.
function sourceChecksum(source: Buffer) {
  const bytes = [...source].filter((byte, index) => !(byte === 13 && source[index + 1] === 10));
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

const expectedMigrationHash = "3d9c718bef8edb14d3bcbd8bff858f6f5d822776548d69ed6c1532a63df9fe92";

function applicationTables(source: string) {
  return [...source.matchAll(/pgTable\(\s*["']([^"']+)["']/g)]
    .map((match) => match[1])
    .sort();
}

function protectedTables(source: string) {
  const array = source.match(/application_tables constant text\[\] := ARRAY\[([\s\S]*?)\];/);
  if (!array) throw new Error("Application table allowlist is missing.");
  return [...array[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
}

describe("database Data API hardening", () => {
  test("protects every application-owned table in both migrations", () => {
    const expected = applicationTables(schemaSource);

    const historical = protectedTables(migrationSource);
    expect(historical).toHaveLength(24);
    expect(protectedTables(productionMigration)).toEqual(historical);
    expect([...historical, ...protectedTables(sharedMigration), ...protectedTables(joinMigration)].sort()).toEqual(expected);
    expect(joinMigration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE/);
    expect(joinMigration).not.toMatch(/CREATE POLICY|GRANT .* TO (anon|authenticated)/);
    expect(sharedMigration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sharedMigration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE/);
    expect(sharedMigration).toMatch(/FROM PUBLIC, anon, authenticated/);
    expect(sharedMigration).not.toMatch(/CREATE POLICY|GRANT .* TO (anon|authenticated)/);
  });

  test("uses deny-by-default RLS, grants, and future-object controls", () => {
    for (const source of [migrationSource, productionMigration]) {
      expect(source).toMatch(/ENABLE ROW LEVEL SECURITY/);
      expect(source).toMatch(/REVOKE ALL PRIVILEGES ON TABLE/);
      expect(source).toMatch(/FROM PUBLIC, anon, authenticated/);
      expect(source).toMatch(/ALL SEQUENCES IN SCHEMA public/);
      expect(source).toMatch(/ALL FUNCTIONS IN SCHEMA public/);
      expect(source).toMatch(/ALTER DEFAULT PRIVILEGES FOR ROLE postgres/);
      expect(source).not.toMatch(/CREATE POLICY|GRANT .* TO (anon|authenticated)/);
    }
  });

  test("keeps production scripts target-guarded and free of row reads", () => {
    expect(productionMigration).toMatch(/current_database\(\) <> 'postgres'/);
    expect(productionMigration).toMatch(/current_user <> 'postgres'/);
    expect(productionMigration).not.toMatch(
      /TRUNCATE TABLE|DELETE FROM public\.|UPDATE public\.|INSERT INTO public\./,
    );

    expect(productionAudit).toMatch(/BEGIN TRANSACTION READ ONLY/);
    expect(productionPostcheck).toMatch(/BEGIN TRANSACTION READ ONLY/);
    expect(productionAudit).not.toMatch(/SELECT \* FROM public\./);
    expect(productionPostcheck).not.toMatch(/SELECT \* FROM public\./);
  });

  test("verifies LF and CRLF source against the same legitimate checksum", () => {
    const lf = Buffer.from(migrationSource.replace(/\r\n/g, "\n"));
    const crlf = Buffer.from(lf.toString("utf8").replace(/\n/g, "\r\n"));
    expect(sourceChecksum(lf)).toBe(expectedMigrationHash);
    expect(sourceChecksum(crlf)).toBe(expectedMigrationHash);
  });

  test("rejects content, whitespace, lone CR and final-newline changes", () => {
    const lf = migrationSource.replace(/\r\n/g, "\n");
    for (const changed of [lf.replace("REVOKE", "GRANT"), lf.replace(" ", "  "),
      lf.replace("\n", "\r"), lf.slice(0, -1), `${lf}-- changed\n`]) {
      expect(changed).not.toBe(lf);
      expect(sourceChecksum(Buffer.from(changed))).not.toBe(expectedMigrationHash);
      expect(sourceChecksum(Buffer.from(changed.replace(/\n/g, "\r\n")))).not.toBe(expectedMigrationHash);
    }
  });

  test("synchronizes production with the exact Drizzle migration", () => {
    const migrationHash = sourceChecksum(readFileSync("drizzle/0007_harden_data_api.sql"));

    expect(migrationHash).toBe(expectedMigrationHash);

    expect(productionMigration).toContain(migrationHash);
    expect(productionPostcheck).toContain(migrationHash);
    expect(productionMigration).toContain("1791999181622");
    expect(productionMigration).toMatch(/INSERT INTO drizzle\.__drizzle_migrations/);
    expect(productionMigration).toMatch(/different hash/);
    expect(productionMigration).toMatch(/different timestamp/);
  });
});
