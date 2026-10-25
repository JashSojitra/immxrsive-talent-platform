# R2 peer QA repair and retest

Date: October 24, 2026 (Toronto)  
Frozen baseline: `R2-submission` at `7627b70e640b5dfe8f1cbe33adf833023cd2bf5d`  
Post-R2 branch: `fix/r2-peer-qa-repair`  
Focused repair commit/build input: `1e7ab8c75693ddc7b39fb798350433c1d8939548`

The existing `R1-submission` and `R2-submission` tags were not moved or
overwritten. No database migration or record reset is part of this repair.

## Finding A: inquiry UUID overlap

Source issue: <https://github.com/JashSojitra/immxrsive-talent-platform/issues/1>

The issue records a genuine published self-service profile at
`/inquiry/student/b533f0c0-df6b-4fac-9656-2160a1a14dfb` and includes the before
screenshot. On the submitted build, the identifier inherited the same
`clamp(3rem, 6vw, 6rem)` display treatment used for short legacy IDs. The grid's
identifier column had no minimum-size containment, so the 36-character UUID
overflowed into the candidate name/headline area.

Repair: IDs longer than 12 characters receive a compact monospace metadata
treatment with bounded width and emergency wrapping. The original display rule
is unchanged for short identifiers such as `S01` and `P01`.

Regression evidence:

- Frontend coverage distinguishes the short-ID and long-ID treatments.
- The existing browser journey creates and publishes a real UUID profile, opens
  its employer inquiry, and now asserts that the UUID and candidate heading
  rectangles do not intersect and that the document does not overflow.
- That browser journey is configured to run in both `desktop` and `mobile-390`.

After result: source, frontend test, typecheck, lint, and production build pass.
The database-backed desktop/mobile execution remains unverified locally because
the configured `TEST_DATABASE_URL` returns PostgreSQL fatal error
`tenant/user postgres.usjhhvrarrpxlivnppvl not found`. The live pre-repair page
could not be independently reopened by the available browser controller. The
issue screenshot is therefore the preserved before image; a deployed after
screenshot still needs the retest steps below.

## Finding B: unpublished synthetic contributor metadata

There is no issue #2 in `JashSojitra/immxrsive-talent-platform` (GitHub returns
404). The existing issue is
<https://github.com/Plathiya24/immxrsive-platform/issues/2>. It records the same
privacy principle in another team's implementation: unpublished synthetic
student `S16` must not appear in an ordinary public project representation.

Independent evidence in this repository was stronger than a hypothetical
claim: the submitted public project query and its tests deliberately returned
the unpublished fixture contributor as `studentId: "S16"` with role
`"QA Tester"`, while withholding the synthetic name/headline and link. Thus the
observed exposure was exactly a synthetic contributor identifier, project
membership, and role. No private resume, contact detail, authentication record,
or real-person data was shown. Severity remains **Moderate** because this is a
server-side publication-state inconsistency under R2.19/R2.21/R2.22, with
limited synthetic-data impact in the observed fixture.

Repair: the public project query now filters contributors to
`students.profileStatus = "published"` before mapping the response. For `P03`,
the public contributor count changes from three to two and the response/UI must
contain none of `S16`, `QA Tester`, `Nora Evans`, or `/students/S16`.

Regression evidence exists at integration API and browser UI levels. The
frontend projection tests pass; the database-backed integration/browser
execution is pending restoration of the isolated test database. The external
peer issue remains open and was not altered or closed.

## Finding C: sample-specific resume parsing

Related existing issue:
<https://github.com/Plathiya24/immxrsive-platform/issues/3>. Its evidence was
explicitly based on one personal PDF in another team's parser and is not treated
as a universal failure or copied into this repository.

The safe sample already used here is the inline synthetic Word-style structure
in `tests/unit/resume-extraction.test.ts`, test `parses Word-style heading
variants, distinct experience entries, and split links`. It contains fictional
`Northern University`, four fictional organizations, and the synthetic LinkedIn
slug `synthetic-student`. No private resume was read, committed, or transmitted.

Expected and actual output matched on October 24, 2026:

| Candidate type | Expected | Actual |
| --- | --- | --- |
| Standardized skills | `JavaScript`, `Python`, `React` | Exact match |
| Unsupported skills | `Next.js`, `Tailwind CSS`, `Java`, `SQL`, `HTML/CSS` | Exact match |
| Education | One bounded `Northern University` entry | Exact match |
| Experience | Four distinct entries | Exact match |
| Link | `https://linkedin.com/in/synthetic-student` | Exact match |
| Later project text | Excluded from education/experience | Excluded |

The targeted resume suite passed, so no parser repair was justified.

## Verification performed

- `npx vitest run tests/unit/resume-extraction.test.ts tests/frontend/inquiry.test.tsx tests/frontend/project-detail.test.tsx` - 28/28 passed.
- `npm test` - 24 files, 160/160 tests passed.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.3.8.
- Focused project integration test - not run to assertions; isolated PostgreSQL
  rejected the configured test tenant before setup. No production database was
  used as a fallback.
- Desktop/mobile Playwright - not run for the same test-database blocker.

## Requested retest

1. Configure a valid isolated `TEST_DATABASE_URL` that does not overlap
   `DATABASE_URL`; do not point tests at production.
2. Run
   `node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run tests/integration/project-detail-api.test.ts`.
3. Run `npx playwright test tests/browser/private-student-profile.spec.ts tests/browser/project-detail.spec.ts`.
4. Confirm both Playwright projects pass. In particular, verify the generated
   UUID does not overlap the candidate heading and 390 px has no horizontal
   overflow.
5. In an incognito session, request `/api/v1/projects/P03` and open
   `/projects/P03`; confirm only the two published contributors appear and the
   response/page contains none of `S16`, `QA Tester`, `Nora Evans`, or
   `/students/S16`.
6. Run the named resume unit test and compare the output matrix above.
7. Capture desktop and 390 px after screenshots, record the deployed commit SHA,
   and add the retest result to issue #1. Do not close any peer issue until that
   deployed retest is documented.

