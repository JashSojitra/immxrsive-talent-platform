import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";

const schemaSource = readFileSync("src/db/schema.ts", "utf8");
const migrationSource = readFileSync("drizzle/0007_harden_data_api.sql", "utf8");
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

    expect(expected).toHaveLength(24);
    expect(protectedTables(migrationSource)).toEqual(expected);
    expect(protectedTables(productionMigration)).toEqual(expected);
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

  test("synchronizes production with the exact Drizzle migration", () => {
    const migrationHash = createHash("sha256")
      .update(readFileSync("drizzle/0007_harden_data_api.sql"))
      .digest("hex");

    expect(productionMigration).toContain(migrationHash);
    expect(productionPostcheck).toContain(migrationHash);
    expect(productionMigration).toContain("1791999181622");
    expect(productionMigration).toMatch(/INSERT INTO drizzle\.__drizzle_migrations/);
    expect(productionMigration).toMatch(/different hash/);
    expect(productionMigration).toMatch(/different timestamp/);
  });
});
