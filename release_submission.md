Chosen challenge: R4.14 - Duplicate Domain Warning

# Release Submission

Release: R4
Team: team-01
Project Option: Project 1
Deployment: https://immxrsive-talent-platform.vercel.app
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: R4-submission - to be created after verified production deployment of final assessed commit
Commit: 34426d89060b500ceeb7f7c9be866fc49cfb09cc (actual currently deployed candidate; freeze pending)
Adapter: evaluation_adapter.json
Known issues: No verified Moodle submission receipt yet. Live student request was approved by a separately authorized reviewer according to the operator; final public read-back should be checked.
Test notes: Core requirements and chosen R4.14 were checked against the official brief. Live student request and pending queue were observed; a separate authorized account approved the request per the operator on November 18. Release freeze and Moodle receipt are separate final steps. No unchosen Challenge is claimed.

## Test accounts

Staff entry: https://immxrsive-talent-platform.vercel.app/admin/sign-in (existing GitHub OAuth). The owner account JashSojitra has independently verified platform_super_admin access; production UI access is confirmed. Do not share its credentials. A reviewer signs in with their own GitHub identity, shares their displayed internal account ID through the approved private course channel, and the operator independently verifies the linked identity before granting the minimum approved staff role through /admin/settings/access. The operator confirms that a separately authorized reviewer signed in and completed the course-fixture decision on November 18, 2026.

Student entry: https://immxrsive-talent-platform.vercel.app/student/sign-in. Use an existing legitimately verified student maintainer and their eligible owned student-managed project. A different staff actor must review; staff status never creates student eligibility. No student session is impersonated or provisioned synthetically.

## Release-specific evidence

- Published imported fixture partner: https://immxrsive-talent-platform.vercel.app/partners/4912f68c-6ca7-403f-8f9e-6c9e713b02bd; company ID `4912f68c-6ca7-403f-8f9e-6c9e713b02bd`. Normal fixture fetched, proposed values reviewed/applied, saved as private draft, then explicitly published. Source/time persisted.
- Sparse fixture: Algoma Field Systems, ID `8fa3db85-3ec5-4530-9585-1cd269dac3b0`, remains private draft after honest manual correction; missing sector/location were marked unspecified.
- COL01: `3719463f-6832-426f-a112-9dc4a3b0eeb7`, Industrial Safety Training Prototype, 2025/past/public/P01.
- COL02: `af393cdc-3da9-4b90-b394-bf13f01f3fb6`, XR Maintenance Training Study, 2026/current/public/P04. Both belong to the same published company. Narratives explicitly identify course fixtures; outcomes/real students were not invented.
- Public students: none attached; instructor seed supplies none and no verified real participation was established.
- Visibility: COL01 temporarily changed through staff UI to limited, then private; actual public HTML anonymized/omitted it correctly. Restored public. Evidence: `docs/course/r4/production-evidence/closeout-2026-11-18/visibility-*.json`.
- Inquiry context: https://immxrsive-talent-platform.vercel.app/inquiry/partner/4912f68c-6ca7-403f-8f9e-6c9e713b02bd. Source-locked form verified at 390px/1280px. No new inquiry was submitted in this read-only production smoke run; previous disposable integration/browser intake assertions remain separately scoped.
- R4.14: repeated normal import warned and linked the existing company; the similar-name/different-domain fixture remained a separate proposal. No unnecessary duplicate record was saved or published.
- Four exact original fixture sources and hashes: `docs/course/r4/fixture-sources.md`. Original instructor ZIP HTML bytes independently match all four deployed fixtures.
- Student requested relationship: The existing student-managed Demo project (`610a8803-f7e0-4b59-a97b-b7f6aa393367`) submitted a North Shore Simulations fixture association request. Pending state and staff review queue were seen in the UI. The operator confirmed that a different authorized staff account approved it on November 18, 2026. The earlier zero-request database snapshot predates this action. This is course-fixture acceptance, not evidence of a real external partnership.
- Live evidence/screenshots and exact IDs: `docs/course/r4/production-evidence/closeout-2026-11-18/`. Current validation: `docs/course/r4/validation-report.md`; requirements: `docs/course/r4/acceptance-matrix.md`; release notes: `docs/course/r4/release-notes.md`.

## Verification and freeze

The live importer defect was repaired in PR #12 by explicit IPv4 transport selection while retaining validated DNS pinning, TLS validation and SSRF restrictions. Actual closeout checks: 411 unit/frontend tests, 31 overlapping affected importer tests, typecheck, full lint, production build and fixture validation passed; all four real hosted fetches succeeded. Fresh isolated production checks: 23 HTTP and 20 browser passed; six screenshots at 390px/1280px. Previous isolated PG17 evidence: 216 integration and 149 browser passed with five intentional skips; these suites were not rerun against production.

Database remains at 14 migrations. No schema changes, unrelated role grants, student identity edits or destructive operations occurred in closeout. Historical release tags are preserved. The repository is public with issues enabled; assigned reviewer issue creation still requires their own authenticated confirmation.

R4-submission will be created only after the final documentation commit is merged and its exact commit is deployed and healthy. The official instructor email sets the deadline to Friday November 20, 2026, 11:59 PM Toronto; the older assignment PDF dates are superseded. Moodle draft upload is not submission: a confirmed Submit receipt is required. This package is prepared for completion, not represented as a finished course submission.
