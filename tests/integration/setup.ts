import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll } from "vitest";
import { assertSafeTestDatabaseTarget } from "@/db/safety";
import { closeRuntimeDatabase } from "@/db/runtime";

// This module is imported before every integration file captures its target URL.
// Public-qualified SQL and the migration journal rule out search_path isolation.
// Each file gets its own database; append-only evidence needs no DELETE bypass.
const baseUrl = process.env.TEST_DATABASE_URL;
if (!baseUrl) throw new Error("TEST_DATABASE_URL is required for integration tests.");
const originalEnvironment = {
  TEST_DATABASE_URL: baseUrl,
  DATABASE_URL: process.env.DATABASE_URL,
  DEVELOPMENT_DATABASE_URL: process.env.DEVELOPMENT_DATABASE_URL,
};
const runtimeDatabaseUrl = originalEnvironment.DEVELOPMENT_DATABASE_URL ?? originalEnvironment.DATABASE_URL;
assertSafeTestDatabaseTarget({ testDatabaseUrl: baseUrl, runtimeDatabaseUrl });
const suiteName = `immxrsive_test_suite_${randomUUID().replaceAll("-", "")}`;
const control = postgres(baseUrl, { max: 1, prepare: false });
try {
  await control`CREATE DATABASE ${control(suiteName)}`;
} finally {
  await control.end();
}
const suiteUrl = new URL(baseUrl);
suiteUrl.pathname = `/${suiteName}`;
process.env.TEST_DATABASE_URL = suiteUrl.toString();
// Preserve the original runtime identity for all subsequent guards.
if (runtimeDatabaseUrl) process.env.DEVELOPMENT_DATABASE_URL = runtimeDatabaseUrl;
process.env.DATABASE_URL = suiteUrl.toString();

// Root hook runs after nested suite cleanup. DROP DATABASE does not weaken audit
// triggers or foreign keys. FORCE also releases stray test-only pooled clients.
afterAll(async () => {
  try {
    try {
      await closeRuntimeDatabase();
    } finally {
      const cleanup = postgres(baseUrl, { max: 1, prepare: false });
      try {
        await cleanup`DROP DATABASE ${cleanup(suiteName)} WITH (FORCE)`;
      } finally {
        await cleanup.end();
      }
    }
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
