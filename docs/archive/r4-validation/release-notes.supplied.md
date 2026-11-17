Chosen challenge: R4.14 - Duplicate Domain Warning

# R4 draft release notes

Adds task-oriented staff review queues; maintainer verification requests with evidence; independent approval/rejection and official project markers; manual company drafts; bounded HTTPS website import as editable metadata proposals; explicit staff publication; source URL/time history; normalized website-host duplicate warnings with existing record links; multiple collaborations with dates, year, outcomes, current/past status, many projects and public participants; public/limited/private read models; maintainer association requests; public partner directory/detail; contextual partner inquiry through existing intake.

No import or student request publishes, assigns roles, approves verification or creates an official partner link. Imported HTML is parsed to strings and rendered through React text nodes. Requests use the authenticated Better Auth actor; staff writes require XR admin or platform super admin, while XR curators inspect queues. Current student ownership and affiliation are checked server-side. Concurrent revisions and repeated decisions fail with conflicts.

Migration 0013 is additive, with deny-by-default RLS on nine new tables, revoked public/Data API privileges, foreign keys, checked states, audit immutability and deferred independent-review constraints. Existing 0000–0012 migrations and historical journal entries are preserved. Admin-managed project consent rules remain unchanged.

This release is a remote patch, not a deployed release. See overnight-sprint-report.md for actual validation and release_submission.md for remaining deployment/Moodle gates. Four exact fixture HTML files are included at public/fixtures/r4; their public source URLs are PENDING hosting and verification.
