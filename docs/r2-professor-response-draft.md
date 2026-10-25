# Professor response draft

Subject: COSC 3506 R2 QA repair and requested retest - ImmXrsive Talent Platform

Hello Professor Lin,

Thank you for the extension. I preserved the immutable `R1-submission` and
`R2-submission` tags and completed the focused post-R2 repair on branch
`fix/r2-peer-qa-repair`.

Repair/build input SHA: `1e7ab8c75693ddc7b39fb798350433c1d8939548`

- Issue #1: the genuine published UUID used the oversized legacy-ID typography
  and overlapped the candidate heading. Long IDs now use bounded compact
  metadata typography, while short IDs retain the original design. The
  regression journey creates/publishes a UUID profile and checks non-overlap and
  horizontal overflow in desktop and 390 px projects.
- Existing issue #2 was located at
  <https://github.com/Plathiya24/immxrsive-platform/issues/2>, not in my
  repository. Independent review found that my submitted public `P03` response
  exposed only synthetic unpublished contributor metadata: ID `S16`, project
  membership, and role `QA Tester`; it did not expose a private resume, contact
  data, authentication data, or real-person data. The server query now excludes
  unpublished contributors entirely. I retained Moderate severity for the
  server-side visibility inconsistency and did not close the peer issue.
- Resume finding: I retested the already-used fictional Word-style sample. The
  expected and actual results matched: 3 standardized skills, 5 unsupported
  skills, 1 bounded education entry, 4 distinct experience entries, 1 normalized
  LinkedIn URL, and no project-text bleed. Because the issue did not reproduce,
  I made no parser change. No private resume was committed or transmitted.

Retest results: 160/160 non-integration tests passed; the focused 28/28 resume/UI
tests passed; typecheck, lint, and the production build passed. The configured
isolated PostgreSQL test tenant currently returns `tenant/user ... not found`,
so the database-backed integration and desktop/mobile Playwright executions
could not reach their assertions. I did not substitute the production database
or reset any records. Exact retest commands and before/after criteria are in
`docs/r2-peer-qa-repair-and-retest.md`.

I am requesting a deployed retest of issue #1 and the public `P03` response once
the isolated test database/preview is available. I will not close the peer issue
without documented retest evidence.

Regards,  
Jash Sojitra

