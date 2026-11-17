# R4 criterion-to-source/test matrix — independently checked 2026-11-17

**Local engineering gate PASS; caller review and authorized local commit may proceed.** Full Windows cycle 4: 293 unit, 117 frontend, 216 integration passed; all runner checks/build/cleanup exit 0. Browser: 154 configured, 149 passed, 5 desktop mobile-only skips, 0 failed/flaky; all 10 R4 cases passed. Hosted/manual course acceptance and production release remain pending separately. See [current validation report](validation-report.md) for exact exclusions and evidence. Criterion meanings follow the supplied matrix/brief; official PDF/email are absent. Chosen challenge: **R4.14**.

| Criterion | Source / behavior | Executed evidence / status and remaining gate |
|---|---|---|
| R4.01 | Better Auth; `partners/http.ts`, `admin/service.ts:lockStaff` | PASS targeted: `r4-http` anonymous/session actor, `admin-session` real DB/session regression. PASS Windows synthetic Better Auth staff/student sessions. |
| R4.02 | Staff HTTP and service role checks; student ownership | PASS targeted: `r4-http`, `r4-partners` role/owner/self-review denial; curator read-only frontend. PASS Windows student/curator API and UI denial. |
| R4.03 | Admin overview counts, `PartnerStaff` task queues | Source/front-end verified; counts wired to real queries. Dashboard browser task navigation pending. |
| R4.04 | `StudentRequests`, `submitRequest`, requests page | PASS targeted: payload, verified maintainer/IDOR/strict fields in `r4-http`, frontend and PG17. PASS Windows student request journey at both staff widths. |
| R4.05 | `staffQueue`, `decideRequest`, staff review forms | PASS targeted PG17 independent decision, pending-only and concurrency. PASS Windows independent staff decision journey; human contributor inspection pending. |
| R4.06 | `publicProjectPartners`, public project page official marker | PASS targeted PG17 approved verification/query; PASS Windows public approved marker. |
| R4.07 | `companySchema`, `saveCompany`, manual staff form | PASS targeted frontend retention and PG17 draft/publish/version conflict. PASS Windows manual draft/publish; unpublish browser acceptance pending. |
| R4.08 | `fetchCompanyHtml`, URL import endpoint | PASS mocked network URL/DNS/response/size tests in `r4-import`, `r4-network`; actual hosted fetch pending. |
| R4.09 | `parseCompanyHtml`, proposal/apply UI, explicit publication | PASS all four exact HTML parser fixtures, inert text, explicit apply frontend, PG17 draft provenance; hosted acceptance pending. |
| R4.10 | Unchosen challenge | NOT CLAIMED. Basic security tests do not imply completion of an unchosen challenge. |
| R4.11 | Import fallback and retained editable manual fields | PASS `r4-partners` frontend failure/stale save and PG17 import failure; browser pending. |
| R4.12 | Import events, company sources, append-only audit | PASS PG17 persistence/proposal consumption/audit protection; fixed wrong-company provenance frontend regression. Hosted-source evidence pending. |
| R4.13 | Unchosen challenge | NOT CLAIMED. |
| R4.14 | Normalized domain, advisory lock, duplicate warning/link/ack | PASS normalization parser/unit, frontend existing-link regression, PG17 duplicate/concurrent creation. Hosted duplicate/similar-name journey pending. |
| R4.15 | Company-to-many `partner_collaborations`, date/year/status | PASS PG17 current/past content and strict schema. PASS Windows exact seed CLI with explicit synthetic mapping; live mapping pending. |
| R4.16 | Collaboration narrative/outcome, project edges | PASS PG17 saved public narrative/project projection. PASS Windows exact seed CLI; human acceptance pending. |
| R4.17 | Public-profile participants; multiple approved project partners | PASS PG17 multiple associations, company-specific trigger, existing public-profile privacy regression; browser participant rendering pending. |
| R4.18 | `publicPartner`, public/limited/private projection | PASS unit/PG17 private omission, limited anonymization, unpublished company omission. PASS full Windows cycle 4 390px privacy/inquiry scenario in both projects. |
| R4.19 | Unchosen challenge | NOT CLAIMED. |
| R4.20 | Existing/suggested company request with note | PASS frontend payload and PG17 owner/selected/suggested-company scenarios. PASS Windows synthetic student browser request. |
| R4.21 | Independent staff selection/approval | PASS PG17 self-review/current owner/repeated and concurrent decision/multiple partners; PASS Windows full independent student/staff decision journey. |
| R4.22 | `/partners` published directory | Query/source verified and PG17 published/unpublished behavior; PASS full Windows cycle 4 directory scenario in both projects. |
| R4.23 | `/partners/[companyId]`, current/past work/public links | PASS targeted PG17 projection, existing project/profile regression. Exact seed CLI PASS Windows; detail/privacy/inquiry browser scenario PASS cycle 4; human acceptance pending. |
| R4.24 | Partner inquiry page, `createContextualInquiry`, existing intake | PASS PG17 partner intake and old inquiry regressions; malformed UUID rejection fixed with three unit regressions. PASS full Windows cycle 4 HTTP201, source-locked request and persisted inquiry/content assertions. |
| R4.25 | Labelled staff forms at laptop/tablet | PASS Windows manual staff and independent approval at 1280/768px (eight configured cases); human screenshots pending. |
| R4.26 | Wrapping public cards/inquiry at 390px | PASS full Windows cycle 4 390px layout/privacy/inquiry including API/DB assertions; human accessibility evidence pending. |
| R4.27 | Historical fixtures/migrations; compatibility with 0011/0012 | PASS canonical historical content/13 journal-prefix entries, 2 populated PG17 upgrade cases, selected admin/session/inquiry/project/profile regressions. Full Windows unit/frontend/integration/build PASS; browser 149 PASS/5 skipped/0 FAIL/0 flaky in full Windows cycle 4. |
| R4.28 | Submission, adapter, release notes, candidate fingerprint | PASS local engineering checks and source traceability. PENDING external hosted fixtures, staff access/manual course evidence, live/deployed SHA, immutable tag and Moodle receipt. |

Files in test references use repository paths under `tests/unit`, `tests/frontend`, `tests/integration`; `r4-partners` is present in frontend/integration/browser. Browser discovery is not test execution. Public fixture URL requirements are in [fixture sources](fixture-sources.md); all four remain PENDING. Final executed case counts and deduplicated coverage are in `validation-report.md`, not inferred from this matrix.
