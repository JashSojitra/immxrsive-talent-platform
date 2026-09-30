import { createDatabase } from "./client";

let runtimeConnection: ReturnType<typeof createDatabase> | undefined;
let runtimeDatabaseUrl: string | undefined;

export function getRuntimeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required by the application backend.");
  }

  if (!runtimeConnection || runtimeDatabaseUrl !== databaseUrl) {
    runtimeConnection = createDatabase(databaseUrl);
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
