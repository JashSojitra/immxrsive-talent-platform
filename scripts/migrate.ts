import "dotenv/config";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/db/client";

const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required to run migrations.");
}

const { client, db } = createDatabase(databaseUrl);

try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Database migrations completed.");
} finally {
  await client.end();
}
