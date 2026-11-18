# R4 validation report — 2026-11-18

Production candidate: `34426d89060b500ceeb7f7c9be866fc49cfb09cc` at https://immxrsive-talent-platform.vercel.app. R4 is deployed; production staff fixture acceptance passes. Final student/request, reviewer-access and freeze gates remain pending.

| Execution | Actual result | Scope |
|---|---|---|
| Closeout unit/frontend | 411 passed across 48 files | Final IPv4 importer repair; full suite |
| Affected importer | 31 passed across 2 files | Overlaps full suite; do not add counts |
| Typecheck / full lint / production build / fixture validation | PASS | Isolated closeout worktree |
| Real hosted importer fetch | Four passed | Public fixture URLs, no DB writes |
| Fresh production HTTP | 23 passed | Cumulative public APIs/pages, anonymous denials, four exact hashes |
| Fresh production browser | 20 passed | Isolated unauthenticated sessions, 390px/1280px; six screenshots |
| Earlier Windows cycle 4 integration | 216 passed | Disposable PostgreSQL 17; historical engineering evidence |
| Earlier Windows cycle 4 browser | 149 passed, 5 intentional skips, 0 failures/flaky | Historical full R1–R4 engineering suite; 10 R4 cases passed |

Staff UI actually imported/reviewed/saved/published the normal fixture, saved the manually corrected sparse draft, displayed duplicate warning and existing-record link, retained different-domain similar-name proposal, and saved two distinct exact seed collaborations. Limited/private projections passed independent HTTP assertions, then public seed visibility was restored. Source history and final fixture IDs were independently queried read-only. No real student participant was inferred merely from a published profile.

Official Project 1 R4 brief, instructor deadline email, Moodle assignment PDF, original fixture ZIP and current generic submission templates were reviewed. All four HTML files match original ZIP bytes. JSON fixture differences are checkout CRLF only; decoded content matches exactly. Audit: production-evidence/closeout-2026-11-18/official-source-audit.json.

R4.04–R4.06/R4.20–R4.21 retain unit/integration/browser implementation evidence, but required live student pending-to-review evidence is absent. Do not mark it production-passed. Request count zero at read-back. No R4-submission tag or Moodle receipt exists. Authorized reviewer account access and issue creation need real reviewer authentication.

Current evidence: production-evidence/closeout-2026-11-18/. Historical logs: validation-evidence/windows-cycle4/. Source changed only for the reviewed transport fix; no migrations, privilege changes, destructive resets or fabricated identities in closeout. Prior 775-test aggregate refers to the earlier build and must not be presented as a newly rerun total.
