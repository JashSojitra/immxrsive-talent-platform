import "dotenv/config";

import { createDatabase } from "../src/db/client";
import { assertSafeMigrationTarget } from "../src/db/safety";
import { importFixtureData } from "../src/fixtures/import";
import { loadAndValidateFixtures } from "../src/fixtures/load";

const fixtureData = await loadAndValidateFixtures();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to import fixtures. Validation completed before this check.",
  );
}

assertSafeMigrationTarget({
  migrationDatabaseUrl: process.env.DATABASE_MIGRATION_URL ?? databaseUrl,
  runtimeDatabaseUrl: databaseUrl,
});

const { client, db } = createDatabase(databaseUrl);

try {
  const counts = await importFixtureData(db, fixtureData);
  console.log("Fixture import completed in one transaction.");
  for (const [entity, count] of Object.entries(counts)) {
    console.log(`${entity}: ${count}`);
  }
} finally {
  await client.end();
}
