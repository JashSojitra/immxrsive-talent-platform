# Release 1 Technology and Deployment Summary

ImmXrsive Release 1 is a Next.js application written in React and TypeScript. Public pages use the App Router, while backend operations are implemented with Next.js Route Handlers under `/api/v1`. The complete Release 1 workflow is public and does not require authentication.

Persistent data is stored in Supabase PostgreSQL and accessed through Drizzle ORM. The checked-in migration defines the relational schema for students, standardized skills, availability, professional links, canonical projects, contributor roles, project technologies, project assets, and contextual inquiries. Official fixtures are validated and imported transactionally by an operator command; production deployments do not seed or truncate the database automatically. Runtime code reads PostgreSQL rather than fixture JSON.

GSAP and Three.js provide progressive visual enhancement. Semantic page content, navigation, filtering, profiles, project evidence, and inquiries remain functional with reduced motion or unavailable WebGL. Browser-only motion code is isolated from server database and route-handler code.

Verification uses Vitest for unit, frontend, and API behavior; PostgreSQL integration tests against a separate disposable test database; and Playwright for desktop, keyboard, reduced-motion, WebGL-fallback, and exact 390 CSS px browser coverage. Production smoke tests exercise the deployed Vercel URL and persistent Supabase data separately from local testing.

Vercel hosts the Next.js application. Only `DATABASE_URL` is required by the deployed runtime. `DATABASE_MIGRATION_URL` is retained for operator migration work, and `TEST_DATABASE_URL` is restricted to local/integration testing; neither belongs in the browser bundle. Local secrets are stored in ignored `.env.local` files, and no `NEXT_PUBLIC_` database credential is used.
