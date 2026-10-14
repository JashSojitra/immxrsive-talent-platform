const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export const PRODUCTION_SUPABASE_PROJECT_REF = "acnwbxqzkcdqgbohvpil";

export type LogicalDatabaseIdentity = {
  kind: "supabase" | "postgres";
  projectRef: string | null;
  host: string;
  port: string;
  database: string;
  key: string;
};

export function logicalDatabaseIdentity(databaseUrl: string): LogicalDatabaseIdentity {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Database URL is invalid; refusing database operation.");
  }
  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Database URL must use PostgreSQL; refusing database operation.");
  }

  const host = parsed.hostname.toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!host || !database) {
    throw new Error("Database URL lacks a host or database name; refusing database operation.");
  }

  const directProject = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
  const username = decodeURIComponent(parsed.username);
  const poolerProject = username.match(/^[^.]+\.([a-z0-9]+)$/i)?.[1];
  const isSupabase = host.endsWith(".supabase.com");
  const projectRef = (directProject ?? poolerProject)?.toLowerCase() ?? null;
  if (isSupabase && !projectRef) {
    throw new Error(
      "Supabase project identity could not be determined; refusing database operation.",
    );
  }

  const port = parsed.port || "5432";
  return projectRef
    ? {
      kind: "supabase",
      projectRef,
      host,
      port,
      database,
      key: `supabase:${projectRef}/${database}`,
    }
    : {
      kind: "postgres",
      projectRef: null,
      host,
      port,
      database,
      key: `postgres:${host}:${port}/${database}`,
    };
}

export function assertSafeTestDatabaseTarget(input: {
  testDatabaseUrl: string;
  runtimeDatabaseUrl?: string;
}) {
  const testIdentity = logicalDatabaseIdentity(input.testDatabaseUrl);
  assertNotProduction(testIdentity, "Automated tests");

  if (input.runtimeDatabaseUrl) {
    const runtimeIdentity = logicalDatabaseIdentity(input.runtimeDatabaseUrl);
    assertNotProduction(runtimeIdentity, "Development runtime");
    if (testIdentity.key === runtimeIdentity.key) {
      throw new Error(
        "TEST_DATABASE_URL overlaps the logical development database; refusing destructive tests.",
      );
    }
  }

  return testIdentity;
}

export function assertSafeMigrationTarget(input: {
  migrationDatabaseUrl: string;
  runtimeDatabaseUrl?: string;
}) {
  const migrationIdentity = logicalDatabaseIdentity(input.migrationDatabaseUrl);
  assertNotProduction(migrationIdentity, "Development migrations");

  if (input.runtimeDatabaseUrl) {
    const runtimeIdentity = logicalDatabaseIdentity(input.runtimeDatabaseUrl);
    assertNotProduction(runtimeIdentity, "Development runtime");
    if (migrationIdentity.key !== runtimeIdentity.key) {
      throw new Error(
        "Migration and runtime URLs identify different logical databases; refusing migration.",
      );
    }
  }

  return migrationIdentity;
}

function assertNotProduction(identity: LogicalDatabaseIdentity, operation: string) {
  if (identity.projectRef === PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error(`${operation} cannot target the protected production Supabase project.`);
  }
}
