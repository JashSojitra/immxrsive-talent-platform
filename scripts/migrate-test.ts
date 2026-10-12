import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/db/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run test migrations.");
}

const isValidatedBrowserRuntime = process.env.IMMXRSIVE_BROWSER_TEST_RUNTIME === "1";

if (testDatabaseUrl === process.env.DATABASE_URL && !isValidatedBrowserRuntime) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL.");
}

const { client, db } = createDatabase(testDatabaseUrl);

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Test database migrations completed.");
} finally {
  await client.end();
}
