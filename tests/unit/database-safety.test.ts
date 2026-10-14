import { describe, expect, test } from "vitest";

import {
  assertSafeMigrationTarget,
  assertSafeTestDatabaseTarget,
  logicalDatabaseIdentity,
} from "@/db/safety";

const productionRef = "acnwbxqzkcdqgbohvpil";
const developmentRef = "usjhhvrarrpxlivnppvl";

function poolerUrl(projectRef: string, database: string, port: 5432 | 6543) {
  return `postgresql://postgres.${projectRef}:secret@aws-0-us-east-1.pooler.supabase.com:${port}/${database}`;
}

describe("database safety", () => {
  test("normalizes Supabase session and transaction poolers to one logical target", () => {
    expect(logicalDatabaseIdentity(poolerUrl(developmentRef, "postgres", 5432)).key)
      .toBe(logicalDatabaseIdentity(poolerUrl(developmentRef, "postgres", 6543)).key);
  });

  test("treats separate database names in one Supabase project as isolated", () => {
    expect(logicalDatabaseIdentity(poolerUrl(developmentRef, "postgres", 5432)).key)
      .not.toBe(logicalDatabaseIdentity(
        poolerUrl(developmentRef, "not_immxrsive_development", 6543),
      ).key);
  });

  test("refuses destructive tests across different ports of the same database", () => {
    expect(() => assertSafeTestDatabaseTarget({
      testDatabaseUrl: poolerUrl(developmentRef, "postgres", 5432),
      runtimeDatabaseUrl: poolerUrl(developmentRef, "postgres", 6543),
    })).toThrow("overlaps the logical development database");
  });

  test("allows test and development databases with distinct database names", () => {
    expect(() => assertSafeTestDatabaseTarget({
      testDatabaseUrl: poolerUrl(developmentRef, "postgres", 5432),
      runtimeDatabaseUrl: poolerUrl(
        developmentRef,
        "not_immxrsive_development",
        6543,
      ),
    })).not.toThrow();
  });

  test("always refuses the protected production project", () => {
    expect(() => assertSafeTestDatabaseTarget({
      testDatabaseUrl: poolerUrl(productionRef, "postgres", 5432),
    })).toThrow("protected production");
    expect(() => assertSafeMigrationTarget({
      migrationDatabaseUrl: poolerUrl(productionRef, "postgres", 5432),
    })).toThrow("protected production");
  });

  test("requires development migrations to match the runtime database", () => {
    expect(() => assertSafeMigrationTarget({
      migrationDatabaseUrl: poolerUrl(developmentRef, "postgres", 5432),
      runtimeDatabaseUrl: poolerUrl(
        developmentRef,
        "not_immxrsive_development",
        6543,
      ),
    })).toThrow("different logical databases");
  });
});
