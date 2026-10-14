# ImmXrsive Talent & Industry Platform

NOT ImmXrsive is a data-backed talent and project evidence platform. Release 1
provides the public directory, profiles, projects, advanced search, and contextual
employer inquiries. The Release 2 development branch adds GitHub authentication,
Algoma affiliation verification, private student profile editing, reviewed PDF
resume import, privacy-controlled publication, and allowlisted portfolio
customization.

## Requirements

- Node.js 22.12 or newer (Node.js 24 is recommended)
- npm 11 or newer
- PostgreSQL for migrations, fixture import, and integration tests

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local`. The database npm scripts load `.env.local` when it exists and otherwise accept variables supplied by the shell. Never commit real credentials.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Next.js development |
| `npm run env:check` | Validate local database isolation and email readiness without printing credentials |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm test` | Run credential-free unit tests |
| `npm run test:integration` | Run PostgreSQL integration tests using `TEST_DATABASE_URL` |
| `npm run test:api` | Run only the PostgreSQL-backed M2 API tests |
| `npm run fixtures:validate` | Validate the three official JSON fixture files without database mutation |
| `npm run fixtures:verify` | Verify imported M1 fixture counts and key relationships using `DATABASE_URL` |
| `npm run db:generate` | Generate a reviewed SQL migration from the Drizzle schema |
| `npm run db:migrate` | Apply checked-in migrations using `DATABASE_MIGRATION_URL`, falling back to `DATABASE_URL` |
| `npm run fixtures:import` | Validate and transactionally import official fixtures using `DATABASE_URL` |

## Safe database workflow

Run `npm run env:check` before any local application session. `npm run dev`
runs it automatically and refuses to start if the runtime or migration URL
targets the protected production Supabase project, if runtime and migration
identify different logical databases, or if the configured test target overlaps
development.

Do not run `vercel env pull .env.local`: that command replaces the whole file
and can silently substitute Production-scoped values. Pull into a separate,
explicitly named review file when needed, then copy only reviewed variables and
rerun `npm run env:check`.

1. Set `DATABASE_MIGRATION_URL` to the reviewed migration-capable PostgreSQL
   connection for the same logical database as `DATABASE_URL` and run
   `npm run db:migrate`.
2. Run `npm run fixtures:validate`.
3. Set `DATABASE_URL` to the application/runtime connection and run `npm run fixtures:import`.

The application does not read JSON fixtures during normal runtime. The importer validates all fixture files before opening its database connection, then reconciles fixture-owned child rows for the supplied student/project IDs inside one transaction. It does not truncate the database, delete students/projects absent from a later fixture, or delete inquiry records.

## Integration-test safety

`npm run test:integration` only uses `TEST_DATABASE_URL`. It migrates and clears application tables in that database, so the variable must point to a dedicated disposable test database—never development or production.

If `TEST_DATABASE_URL` is absent, the PostgreSQL suite is reported as skipped. Unit tests and fixture validation do not require credentials.

## Public directory API

- `GET /api/v1/talent` accepts `q` and repeated `skill`, `availability`, and `status` parameters.
- `GET /api/v1/skills` returns database-backed skills plus availability and status metadata.

Skill filters use AND semantics. Repeated availability and status values use OR semantics within their category, while all categories combine with AND. Invalid filter values return a structured `400` response.
