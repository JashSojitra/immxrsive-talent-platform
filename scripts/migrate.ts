import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/db/client";
import { assertSafeMigrationTarget } from "../src/db/safety";

const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required to run migrations.");
}

assertSafeMigrationTarget({
  migrationDatabaseUrl: databaseUrl,
  runtimeDatabaseUrl: process.env.DATABASE_URL,
});

const { client, db } = createDatabase(databaseUrl);

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Database migrations completed.");
} finally {
  await client.end();
}
