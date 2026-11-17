Chosen challenge: R4.14 - Duplicate Domain Warning

# R4 draft release notes

Adds task-oriented staff review queues; maintainer verification requests with evidence; independent approval/rejection and official project markers; manual company drafts; bounded HTTPS website import as editable metadata proposals; explicit staff publication; source URL/time history; normalized website-host duplicate warnings with existing record links; multiple collaborations with dates, year, outcomes, current/past status, many projects and public participants; public/limited/private read models; maintainer association requests; public partner directory/detail; contextual partner inquiry through existing intake.

No import or student request publishes, assigns roles, approves verification or creates an official partner link. Imported HTML is parsed to strings and rendered through React text nodes. Requests use the authenticated Better Auth actor; staff writes require XR admin or platform super admin, while XR curators inspect queues. Current student ownership and affiliation are checked server-side. Concurrent revisions and repeated decisions fail with conflicts.

Migration 0013 is additive, with deny-by-default RLS on nine new tables, revoked public/Data API privileges, foreign keys, checked states, audit immutability and deferred independent-review constraints. Existing 0000–0012 migrations and historical journal entries are preserved. Admin-managed project consent rules remain unchanged.

This release is a remote patch, not a deployed release. See validation-report.md for current validation and release_submission.md for remaining deployment/Moodle gates. Four exact fixture HTML files are included at public/fixtures/r4; their public source URLs are PENDING hosting and verification.

## Independent validation repairs

Approved associations now require the exact company reviewed by staff at the database constraint boundary. Opening an existing duplicate company clears unapplied import provenance. Malformed public partner inquiry UUIDs return unavailable instead of reaching a DB cast error. Upgrade regressions now cover both 0011 and 0012 prefixes.

Full Windows cycle 4 engineering verification PASS: 293 unit, 117 frontend, 216 integration; Playwright 154 configured, 149 passed, 5 desktop mobile-only skips, 0 failed/flaky. All 10 R4 browser cases passed, including HTTP201/DB inquiry assertions and independent student/staff approval. All 12 runner checks including cleanup exit 0. Windows runtime: Node 24.14.1, npm 11.11.0, disposable PG17, Docker 29.9.2. Final source review found no remaining confirmed defect; this cycle changes documentation only. Ready for caller review and authorized local commit; four hosted fixture URLs/hashes, manual course acceptance and later authorized production operations remain pending. See [current validation report](validation-report.md); overnight reports and prior failures remain historical. No deployment, tag, merge, commit or push occurred.
