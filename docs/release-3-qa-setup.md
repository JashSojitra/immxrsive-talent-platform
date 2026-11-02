# Release 3 QA setup and reproduction

Date: 2026-11-01. These instructions distinguish disposable automated QA from the still-missing public submission example. Never point tests, fixture import, cleanup or this driver at development/production databases.

## Disposable automated environment

Prerequisites: installed Node compatible with `package.json`, project dependencies, running Docker engine and installed Playwright Chromium. Phase 7 used Node 24.14.1, Docker 29.9.2 and PostgreSQL 18.6. No software installation was required.

From the repository root, run:

```powershell
node scripts/verify-release-3-final.mjs --run-disposable
```

The explicit opt-in creates a new randomly named/labeled PostgreSQL container with unique random credentials, localhost-only random port, tmpfs data and dedicated fresh/upgrade/guard databases. Credentials are never printed. Before migrations/test stages, the driver verifies container ID, run label, exact port binding, SQL database/user/server port/cluster identity. It overrides every test/runtime/migration database variable; `.env.local` cannot replace those existing values. A guard database is distinct from the fresh test target. Failure to verify identity stops work. Do not substitute a Supabase URL or use the unscoped `npm run db:migrate`, fixture-import or environment-loading integration scripts.

The driver applies 0000–0010, rehearses populated R2 0007→0010, runs the full integration directory once, builds, runs all unit/frontend and all browser tests, validates fixtures and removes only its exact verified labeled container/data and scratch folder in `finally`. Its command log redacts connection strings. Tests use synthetic accounts and independently authenticated sessions created directly inside the disposable database. No production mail or GitHub OAuth account is used. Do not copy test-only auth/environment settings to deployment.

`tests/fixtures/github-fetch.mjs` is an opt-in Node preload used only by the disposable runner, not an application feature switch. `https://github.com/qa/xr-studio` is a mocked QA URL, **not a verified real public repository**. `limited` produces a deterministic rate-limit failure. Real import evidence requires an actual public repository selected by the team later.

Results are under `tmp/phase7-*-results.json`, `tmp/phase7-verification-last.log` and `test-results/`. The retained sanitized case catalog, log and selected screenshots are linked from final QA. Accounts/projects are deleted during tests and the whole container is removed afterwards; recorded IDs must not be reused as deployed evidence.

## Reproduce the acceptance journey

Use two independent verified student sessions A and B and publish both profiles with explicit consent. For automated QA, the browser helpers create these only in the verified disposable database. For later public QA, each human signs in and verifies their own approved affiliation; do not invent credentials or modify production verification records with SQL.

1. A opens Dashboard → My Projects → Add Project. Manually enter title, description, domain/type, technologies, project date/status and independent public/media links. Save with zero repositories; confirm draft is private to anonymous visitors. Add two repositories, edit/remove them and retain the same project ID.
2. On Add Project, import the deterministic GitHub fixture. Review suggestions, change title/description/technologies and explicitly apply. Cancel/error/rate-limit must preserve manual draft input. For public evidence later, repeat with a real accessible public repository and record the URL and editable review.
3. Use an existing published project's normalized repository in a new draft. Confirm duplicate warning, View Project opens its canonical page, and Request to Join creates only a pending request. Maintainer approves with a standard role, then the intended student independently accepts the resulting invitation. Similar-title/different-repository/domain fixture cases remain distinct; no automatic merging.
4. A opens Team → Add Teammate, selects eligible B and proposes one official role. B sees project details/proposed role in their private invitation inbox. Decline/accept are recipient-only; pending/declined users do not appear publicly.
5. B accepts and edits their own role, optional role description, statement and personal featuring/attribution. Attempt A/outsider forged writes; expect denial. Hide/re-feature without deleting accepted membership. Toggle attribution separately. Unpublished B disappears from public attribution; republish restores eligible evidence.
6. With both profiles published and consenting, confirm both link to exactly the same `/projects/{id}`, with understandable accepted roles and personal statements. Project technologies must not change either student's personal skills.
7. A soft-removes B and restores the same membership; verify ID, original acceptance, statement and preferences survive. Offer maintenance to B, reject once then offer/accept. Confirm URL unchanged, outgoing A cannot edit shared fields, incoming B can.
8. Open two editor sessions of the current maintainer. Save one then the stale other. Expect 409, preserved unsaved input and explicit reload confirmation. Repeat unauthorized identifier and stale transfer cases through integration tests.
9. Add playable `/fixtures/r3/working_demo.html` and fallback image `/fixtures/r3/fallback.svg` with an explanatory description. Publish. Before Play Demo, no iframe exists. Activate by keyboard, interact twice inside the real supplied HTML and assert `Interactions: 2`; Retry resets, Stop removes frame and restores focus. No substituted HTML mock proves this step.
10. Use deterministic transport failure, framing refusal, delay and missing fallback responses from `project-demo.spec.ts`. Verify uncertain/broken demo does not remove roles, details, fallback links, profile/inquiry navigation or keyboard controls. Repeat at 390×844 and with reduced motion; no horizontal document overflow.
11. Run directory search/filter, profile publication/customization/privacy and inquiry regressions. UUID profile form submission must persist only its trusted profile FK. Unpublished/unverified profiles return non-disclosing 404, while legacy student and project-only inquiries persist correctly.

Official fixtures: `Release 3 Fixtures-20261030/standard_roles.json` (12 roles), `project_duplicate_cases.json` (all three cases), `working_demo.html`, `fallback.svg`. Originals are unchanged; static demo/fallback copies are byte-identical. Browser failure simulations are scoped request interception, not claims about current third-party outages.

## Public submission setup still required

After controlled deployment authorization, create one durable project with two real consenting verified/published contributors using normal UI, record the canonical ID/URL, role acceptance and both profile URLs. Record a real public repository import and hosted playable/fallback URLs. Provide evaluator account access through an appropriate private course channel; never commit passwords/session cookies. Update null evidence fields only with verified actual values, then reconcile the official adapter template and assessed SHA/tag. See [deployment checklist](release-3-deployment-rollback-checklist.md).
