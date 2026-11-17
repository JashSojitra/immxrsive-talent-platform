import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../../src/db/client";
import { assertSafeTestDatabaseTarget } from "../../src/db/safety";
import { importFixtureData } from "../../src/fixtures/import";
import { loadAndValidateFixtures } from "../../src/fixtures/load";

export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for browser setup.");
  assertSafeTestDatabaseTarget({
    testDatabaseUrl,
    runtimeDatabaseUrl: process.env.DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL,
  });
  const { client, db } = createDatabase(testDatabaseUrl);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await importFixtureData(db, await loadAndValidateFixtures());
  } finally {
    await client.end();
  }
}
