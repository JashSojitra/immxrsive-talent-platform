import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/db/client";
import { assertSafeTestDatabaseTarget } from "../src/db/safety";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run test migrations.");
}

assertSafeTestDatabaseTarget({
  testDatabaseUrl,
  runtimeDatabaseUrl: process.env.DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL,
});

const { client, db } = createDatabase(testDatabaseUrl);

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Test database migrations completed.");
} finally {
  await client.end();
}
