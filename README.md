# ImmXrsive Talent & Industry Platform

Release 1 is a public, data-backed talent and project evidence platform. The current implementation is **M1 only**: the Next.js foundation, relational database schema, fixture validation, deterministic import, and automated M1 tests. Public directory, profile, project, inquiry, and API workflows are intentionally not implemented yet.

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
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm test` | Run credential-free unit tests |
| `npm run test:integration` | Run PostgreSQL integration tests using `TEST_DATABASE_URL` |
| `npm run fixtures:validate` | Validate the three official JSON fixture files without database mutation |
| `npm run fixtures:verify` | Verify imported M1 fixture counts and key relationships using `DATABASE_URL` |
| `npm run db:generate` | Generate a reviewed SQL migration from the Drizzle schema |
| `npm run db:migrate` | Apply checked-in migrations using `DATABASE_MIGRATION_URL`, falling back to `DATABASE_URL` |
| `npm run fixtures:import` | Validate and transactionally import official fixtures using `DATABASE_URL` |

## Safe database workflow

1. Set `DATABASE_MIGRATION_URL` to a direct PostgreSQL connection and run `npm run db:migrate`.
2. Run `npm run fixtures:validate`.
3. Set `DATABASE_URL` to the application/runtime connection and run `npm run fixtures:import`.

The application does not read JSON fixtures during normal runtime. The importer validates all fixture files before opening its database connection, then reconciles fixture-owned child rows for the supplied student/project IDs inside one transaction. It does not truncate the database, delete students/projects absent from a later fixture, or delete inquiry records.

## Integration-test safety

`npm run test:integration` only uses `TEST_DATABASE_URL`. It migrates and clears application tables in that database, so the variable must point to a dedicated disposable test database—never development or production.

If `TEST_DATABASE_URL` is absent, the PostgreSQL suite is reported as skipped. Unit tests and fixture validation do not require credentials.
