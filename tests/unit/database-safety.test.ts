import { describe, expect, test } from "vitest";
import { createDatabase } from "@/db/client";

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

  test("rejects remote test databases even with distinct database names", () => {
    expect(() => assertSafeTestDatabaseTarget({
      testDatabaseUrl: poolerUrl(developmentRef, "postgres", 5432),
      runtimeDatabaseUrl: poolerUrl(
        developmentRef,
        "not_immxrsive_development",
        6543,
      ),
    })).toThrow("loopback");
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

test("automated targets must be disposable local databases without URL options", () => {
  for (const target of [
    "postgres://test:secret@127.0.0.1:5432/postgres",
    "postgres://test:secret@localhost:5432/immxrsive_development",
    "postgres://test:secret@db.example.test/immxrsive_test_run",
    "postgres://test:secret@localhost/immxrsive_test_run?host=remote",
  ]) expect(() => assertSafeTestDatabaseTarget({ testDatabaseUrl: target })).toThrow();
  expect(() => assertSafeTestDatabaseTarget({
    testDatabaseUrl: "postgres://test:secret@127.0.0.1:5432/immxrsive_test_run",
    runtimeDatabaseUrl: "postgres://dev:secret@127.0.0.1:5432/development",
  })).not.toThrow();
});

test("loopback aliases cannot hide overlap with the development database", () => {
  expect(() => assertSafeTestDatabaseTarget({
    testDatabaseUrl: "postgres://test:secret@localhost:5432/immxrsive_test_run",
    runtimeDatabaseUrl: "postgres://dev:secret@127.0.0.1:5432/immxrsive_test_run",
  })).toThrow("overlaps");
});

test("database clients refuse ordinary local and remote targets during automated tests", () => {
  expect(() => createDatabase("postgres://user:secret@localhost/development")).toThrow("loopback");
  expect(() => createDatabase("postgres://user:secret@database.example.test/immxrsive_test_run")).toThrow("loopback");
});
