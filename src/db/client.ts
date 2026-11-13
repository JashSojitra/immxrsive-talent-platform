import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { assertSafeTestDatabaseTarget } from "./safety";

export function createDatabase(databaseUrl: string, maxConnections = 1) {
  if (process.env.VITEST || process.env.IMMXRSIVE_BROWSER_TEST_RUNTIME === "1") {
    assertSafeTestDatabaseTarget({ testDatabaseUrl: databaseUrl });
  }
  const client = postgres(databaseUrl, {
    max: maxConnections,
    prepare: false,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
