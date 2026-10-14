import {
  assertSafeMigrationTarget,
  assertSafeTestDatabaseTarget,
} from "../src/db/safety";

const runtimeDatabaseUrl = requireEnvironment("DATABASE_URL");
const migrationDatabaseUrl = requireEnvironment("DATABASE_MIGRATION_URL");

const development = assertSafeMigrationTarget({
  migrationDatabaseUrl,
  runtimeDatabaseUrl,
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
const test = testDatabaseUrl
  ? assertSafeTestDatabaseTarget({ testDatabaseUrl, runtimeDatabaseUrl })
  : null;

const emailProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
if (emailProvider !== "gmail" && emailProvider !== "resend") {
  throw new Error("EMAIL_PROVIDER must explicitly select gmail or resend for local development.");
}

const emailReady = emailProvider === "gmail"
  ? isEmailAddress(process.env.GMAIL_SMTP_USER) && isConfiguredSecret(
    process.env.GMAIL_SMTP_APP_PASSWORD,
  )
  : Boolean(
    process.env.AFFILIATION_EMAIL_FROM?.trim()
      && isConfiguredSecret(process.env.RESEND_API_KEY),
  );

if (!emailReady) {
  throw new Error(`${emailProvider} verification-email configuration is incomplete.`);
}

console.log(`Development database: ${describe(development)}`);
console.log(`Automated-test database: ${test ? describe(test) : "not configured"}`);
console.log(`Verification email: ${emailProvider} configuration present`);
console.log("Local environment safety check passed.");

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for local development.`);
  return value;
}

function describe(identity: {
  kind: "supabase" | "postgres";
  projectRef: string | null;
  database: string;
}) {
  return identity.kind === "supabase"
    ? `Supabase ${identity.projectRef}/${identity.database}`
    : `PostgreSQL database ${identity.database}`;
}

function isConfiguredSecret(value: string | undefined) {
  const candidate = value?.trim();
  return Boolean(candidate && !candidate.startsWith("REPLACE_WITH_") && !candidate.startsWith("YOUR_"));
}

function isEmailAddress(value: string | undefined) {
  return Boolean(value?.trim() && /^[^\s@]+@[^\s@]+$/.test(value.trim()));
}
