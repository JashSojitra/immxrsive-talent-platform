# Release 2 environment assumptions

## Local and automated-test isolation

- Local runtime and migrations identify Supabase project
  `usjhhvrarrpxlivnppvl`, database `not_immxrsive_development`.
- Automated integration and browser tests identify the same non-production
  Supabase project but database `postgres`.
- Production is the distinct protected Supabase project
  `acnwbxqzkcdqgbohvpil`. Local guards reject that project explicitly.
- `npm run env:check` must pass before `npm run dev`. Destructive test setup also
  compares logical project/database identities and rejects overlap with runtime.
- `.env.local` is ignored. Credentials must never be committed or pasted into
  reports. `vercel env pull .env.local` must not be used because it replaces the
  file; pull to a separate review file if inspection is authorized.

## Authentication and email

- GitHub OAuth requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `BETTER_AUTH_SECRET`, and an environment-correct `BETTER_AUTH_URL`.
- Affiliation delivery explicitly selects `EMAIL_PROVIDER=gmail` or `resend`.
  Gmail requires `GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD`; Resend requires
  `RESEND_API_KEY` and `AFFILIATION_EMAIL_FROM`.
- `ALGOMA_APPROVED_EMAIL_DOMAINS` defaults to the reviewed institutional domain
  configuration and verification TTL is capped at 30 minutes.
- Environment changes require a process restart locally and a new deployment on
  Vercel. Adding a variable does not modify an already-running process/deployment.

## Release assumptions

- Node.js 22.12 or newer and npm 11 or newer are available.
- Production migrations and fixture imports are separate, explicit human actions.
- No production data is copied to development or tests.
- The evaluator supplies a GitHub account and approved institutional mailbox;
  repository fixtures contain synthetic data only.
- Application data is accessed only by Next.js through the protected `DATABASE_URL`
  role. Supabase `anon` and `authenticated` Data API roles have no privileges or
  RLS policies on the 24 application-owned tables.
- Production migration `0007_harden_data_api` is applied with the reviewed SQL
  Editor script, which atomically records the exact migration hash in Drizzle's
  journal. The read-only postcheck must pass before application deployment.
