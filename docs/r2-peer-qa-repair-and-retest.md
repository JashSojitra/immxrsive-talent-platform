# R2 peer QA repair and retest

Date: October 25, 2026 (Toronto)
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

After result: the genuine published UUID journey passed locally against an
ephemeral isolated database in both desktop and 390 px projects. Its bounding
rectangles did not intersect and neither viewport had horizontal overflow.
The issue screenshot remains the preserved before image; a deployed after
screenshot is still required by the production retest steps below.

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

Regression evidence passes at integration API and browser UI levels. The `P03`
API returned exactly two published contributors and none of the exact forbidden
values above. The external peer issue remains open and was not altered or
closed.

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

Expected and actual output matched on October 24, 2026 and passed again in the
October 25 full unit/frontend run:

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
- `npm run test:integration` - 8 files, 98/98 tests passed against two
  ephemeral localhost PostgreSQL databases. The focused public-project file
  passed 7/7.
- Targeted Playwright UUID/project-detail run - 23 passed and one intentional
  desktop skip across `desktop` and `mobile-390`; no test failed.
- Full Playwright matrix - all 122 configured entries completed without a test
  failure: 117 passed and five intentional desktop skips. On Windows, the
  runner did not exit after the final entry because its configured Next.js
  web-server child teardown hung, so it was interrupted after port 3100 had
  closed; the final reporter exit status was therefore unavailable.
- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run build` - passed with Next.js 16.3.8.

The configured hosted `TEST_DATABASE_URL` still points to an unavailable
non-production Supabase tenant. Verification was restored without editing the
environment file by temporarily overriding development and test URLs to two
separate ephemeral PostgreSQL 18.4 databases on `127.0.0.1`. Required fixture
roles were created locally, migrations and seeds completed, and the server and
temporary data were removed after testing. No production database was
contacted, migrated, reset, or used as a fallback.

Remaining limitations are the stale hosted test-database configuration, the
local Windows Playwright teardown lifecycle issue described above, and the lack
of deployed after screenshots. Deployment was intentionally not performed.

## Requested retest

1. Open the prepared PR against `main`, allow its CI to finish, and use an
   approved preview deployment or deploy only after merge authorization.
2. Confirm the deployment identifies the PR head commit/build SHA.
3. Open a newly published genuine UUID profile at its employer inquiry in
   desktop and 390 px viewports. Confirm the UUID does not overlap the candidate
   heading and neither viewport has horizontal overflow; capture both after
   screenshots.
4. In an incognito session, request `/api/v1/projects/P03` and open
   `/projects/P03`; confirm only the two published contributors appear and the
   response/page contains none of `S16`, `QA Tester`, `Nora Evans`, or
   `/students/S16`.
5. Run the named resume unit test and compare the output matrix above if the
   deployed build process differs from the verified branch build.
6. Record the deployed commit/build SHA and results in issue #1. Do not close
   any peer issue until the deployed retest is documented.
7. Separately replace the stale non-production test-database configuration for
   future CI; never point automated tests at production.

