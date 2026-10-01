import { createDatabase } from "./client";

let runtimeConnection: ReturnType<typeof createDatabase> | undefined;
let runtimeDatabaseUrl: string | undefined;

export function getRuntimeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required by the application backend.");
  }

  if (!runtimeConnection || runtimeDatabaseUrl !== databaseUrl) {
    // The directory loads results and filter metadata concurrently. Keep the
    // runtime pool small, but allow independent requests to make progress.
    runtimeConnection = createDatabase(databaseUrl, 5);
    runtimeDatabaseUrl = databaseUrl;
  }

  return runtimeConnection.db;
}

export async function closeRuntimeDatabase() {
  if (runtimeConnection) {
    await runtimeConnection.client.end();
    runtimeConnection = undefined;
    runtimeDatabaseUrl = undefined;
  }
}
