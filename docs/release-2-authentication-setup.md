# Release 2 M1 authentication setup

Release 2 M1 uses Better Auth with GitHub OAuth, PostgreSQL-backed sessions,
and the existing Drizzle database layer. The GitHub account's immutable numeric
ID is stored as `auth_accounts.account_id`. ImmXrsive's generated
`auth_users.id` is the ownership key for future student-owned records.

## Register the GitHub OAuth App

1. In GitHub, open **Settings → Developer settings → OAuth Apps**.
2. Choose **New OAuth App**.
3. Set **Application name** to a recognizable environment-specific name, such
   as `ImmXrsive Talent Platform (local)`.
4. Set **Homepage URL** to the application origin.
5. Set **Authorization callback URL** to the exact Better Auth callback:
   - Local: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://immxrsive-talent-platform.vercel.app/api/auth/callback/github`
6. Create the app, then generate a client secret. Store the client ID and
   client secret only in local/Vercel environment variables.

Use separate OAuth Apps for local development and production when possible.
GitHub OAuth Apps accept a single callback URL, so preview deployments require
a dedicated stable preview alias and matching OAuth App if provider testing is
needed there.

## Environment variables

Copy the placeholders from `.env.example` into `.env.local` for development:

```text
BETTER_AUTH_SECRET=<random value with at least 32 characters>
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=<OAuth App client ID>
GITHUB_CLIENT_SECRET=<OAuth App client secret>
```

For Vercel production, configure the same four names in the **Production**
environment and set `BETTER_AUTH_URL` to the production origin. Do not expose
the secret or GitHub client secret with a `NEXT_PUBLIC_` prefix. Do not use a
GitHub personal access token as the OAuth client secret.

## Permissions and security

The application explicitly requests only GitHub's `user:email` OAuth scope.
GitHub public profile data needs no repository scope. No repository read or
write permission is requested. Better Auth manages OAuth state and PKCE,
same-site HTTP-only session cookies, database-backed sessions, and encrypted
OAuth token storage.

## Database rollout

Generate migrations with `npm run db:generate`, review the SQL, and apply them
with `npm run db:migrate` against the intended non-production environment.
Production migration must be an explicit reviewed release operation; do not use
automatic schema push.

Tests that mutate authentication records must use `TEST_DATABASE_URL` and the
guarded `npm run db:migrate:test` command.

## Local validation boundary

Automated tests mock or exercise local auth behavior without contacting GitHub.
A real provider test still requires valid OAuth App credentials and a human to
complete GitHub consent. Do not report provider authentication as live until
that manual validation succeeds.
