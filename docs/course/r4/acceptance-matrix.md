# R4 acceptance matrix — 2026-11-18

Chosen challenge: **R4.14 - Duplicate Domain Warning**. Official Project 1 R4 brief and templates reviewed. Production candidate `34426d89060b500ceeb7f7c9be866fc49cfb09cc`. R4 is deployed; staff fixture acceptance is complete. Required live student request/review, reviewer access and immutable freeze remain pending. Test evidence does not substitute for missing production scenarios.

| Criterion | Official behavior | Actual evidence / remaining gate |
|---|---|---|
| R4.01 | Authorized staff role | PASS: verified owner staff identity/role and UI; bootstrap evidence linked. |
| R4.02 | Server-side authorization | PASS implementation tests; live anonymous API 401 checks. Separate real-student denial remains part of pending request acceptance. |
| R4.03 | Task-oriented home | PASS live staff queues and actual pending import/draft counts. |
| R4.04 | Verification request | Historical unit/PG17/browser PASS; live independent student demonstration pending. |
| R4.05 | Staff project review | Historical independent actor/decision tests PASS; live request needed. |
| R4.06 | Protected verification | Historical self-review/ownership/concurrency tests PASS; no live student affiliation invented. |
| R4.07 | Manual partner draft | PASS live editable normal/sparse drafts and explicit fixture publication. |
| R4.08 | Website import | PASS live normal/sparse/similar-name proposals after PR #12 transport repair; all four real fetches passed. |
| R4.09 | Draft-only import | PASS read-only proof of normal draft/version 1 before publication; sparse remains draft. |
| R4.10 | Untrusted website content | UNCHOSEN Challenge; not claimed. Earlier safe text rendering still applies. |
| R4.11 | Manual fallback | PASS earlier tests; observed failed live fetch retained form; sparse manual correction saved without invented company facts. |
| R4.12 | Provenance | PASS live staff source URL/time display and independent fixture-only DB read-back. |
| R4.13 | Preserve staff edits | UNCHOSEN Challenge; not claimed. |
| R4.14 | Duplicate Domain Warning | CHOSEN: PASS live same-domain warning/existing-company link; similar-name different-domain remains separate; no duplicate saved. |
| R4.15 | Add collaboration | PASS live exact titles/years/statuses/projects for COL01/COL02; no student participation invented. |
| R4.16 | Multiple collaborations | PASS two distinct IDs under one published company, 2025/past and 2026/current. |
| R4.17 | Multiple associations | PASS historical PG17 multiple-project/partner tests; live exact P01/P04 links. No genuine eligible participant mapping established. |
| R4.18 | Visibility | PASS live limited anonymization/private omission/public restoration through staff UI and independent HTTP assertions. |
| R4.19 | Server-side privacy | UNCHOSEN Challenge; not claimed. |
| R4.20 | Student association request | Implementation tests PASS; REQUIRED LIVE EVIDENCE PENDING separate eligible authenticated student maintainer. |
| R4.21 | No self-verification | Implementation tests PASS; REQUIRED LIVE pending-to-independent-review/public result and denial evidence pending. |
| R4.22 | Partner page | PASS live published company directory/detail, narratives, projects, website fixture notice and inquiry action. |
| R4.23 | Current versus past | PASS live current and past headings and exact seed records. |
| R4.24 | Contextual inquiry | PASS live source-locked partner form at both widths; current run read-only. Earlier disposable HTTP201/persistence tests PASS. |
| R4.25 | Staff usability | PASS operator UI import/review/publish/collaboration journey; no independent human usability study claimed. |
| R4.26 | 390px public experience | PASS fresh 390px/1280px browser checks, no horizontal overflow; six screenshots visually reviewed. |
| R4.27 | Cumulative regression | PASS current 23 HTTP/20 browser checks plus 411 unit/frontend. Earlier 216 PG17/149 browser results retained as historical scope. |
| R4.28 | Assessed version | PENDING R4-submission tag and exact assessed build freeze; no Moodle receipt. |

See validation-report.md and production-evidence/closeout-2026-11-18/. Source remains under src/partners, src/admin, src/auth and the existing student/project services; unit, frontend, integration and browser tests retain their execution scope. Unchosen Challenges earn no completion claim.
