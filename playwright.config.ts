import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

import { assertSafeTestDatabaseTarget } from "./src/db/safety";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const developmentDatabaseUrl = process.env.DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for browser tests.");
}
if (!developmentDatabaseUrl) {
  throw new Error("DATABASE_URL is required to verify browser test isolation.");
}
assertSafeTestDatabaseTarget({
  testDatabaseUrl,
  runtimeDatabaseUrl: developmentDatabaseUrl,
});

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run db:migrate:test && npm run start -- --hostname 127.0.0.1 --port 3100",
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      DEVELOPMENT_DATABASE_URL: developmentDatabaseUrl,
      IMMXRSIVE_BROWSER_TEST_RUNTIME: "1",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
      BETTER_AUTH_SECRET: "browser-test-secret-with-at-least-thirty-two-characters",
      GITHUB_CLIENT_ID: "browser-test-client-id",
      GITHUB_CLIENT_SECRET: "browser-test-client-secret",
    },
    url: "http://127.0.0.1:3100/talent",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  ],
});
