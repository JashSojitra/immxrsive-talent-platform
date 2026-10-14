import { assertSafeTestDatabaseTarget } from "@/db/safety";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  assertSafeTestDatabaseTarget({
    testDatabaseUrl,
    runtimeDatabaseUrl: process.env.DATABASE_URL,
  });
}
