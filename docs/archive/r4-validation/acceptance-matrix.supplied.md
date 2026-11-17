# R4 acceptance and evidence matrix

“Implemented” describes this patch. It does not mean deployed, manually accepted or Moodle-submitted. Exact official PDF/email were not available as standalone files in this snapshot; acceptance follows the supplied implementation brief.

| Requirement | Implementation / entry point | Validation / remaining evidence |
|---|---|---|
| R4.01–.02 | Existing Better Auth session; role-locked staff HTTP/service boundaries; owner-only student requests | HTTP unit tests cover 401/403, session actor and origin checks. PG17 ownership/role/session regressions must run through ld. |
| R4.03 | `/admin` task counts; `/admin/partners` queues for verification, drafts/imports and associations | Forms/unit coverage; browser laptop/tablet execution pending. |
| R4.04–.06 | Note/evidence requests; guarded staff review sees project/contributors; independent decision; official marker on public project page | IDOR/self-review/decision-conflict scenarios added to PG17 suite; execution pending. |
| R4.07 | Manual editable company name, website, description, sector, location; draft/publish/unpublish | Frontend retention/curator checks pass; actual browser journey pending. |
| R4.08–.09 | Safe HTTPS fetch produces metadata proposal; explicit apply/save; separate explicit staff publish | All four exact parser assertions and mocked-network tests pass. Live URL import pending hosted fixtures. |
| R4.11 | Fetch/parse failure retains manual form and shows fallback message | Frontend network/save-failure retention tests pass. |
| R4.12 | Import events preserve fetched URL/time; successful applied proposal provenance attaches to company; audit history | Unit/frontend coverage; PG17 provenance persistence and actual staff evidence pending. |
| R4.14 (chosen) | Host normalization (case, www, terminal dot, path ignored), warning links to existing company, separate record acknowledgement | Domain/parser assertions pass; duplicate-domain transaction integration added, execution pending. Similar names never trigger an automatic merge. |
| R4.15–.17 | Company has many collaborations with optional date, year, current/past status, narrative/outcomes, many project edges and public-profile participants; multiple staff-approved partners per project | Exact seed setup and explicit ID mapping script included. PG17 history/association tests and browser public history pending. |
| R4.18 | Public projection excludes private entries; limited only gives anonymized title/year/status, no original details or linked people/projects | Pure projection unit tests pass; actual DB projection and browser assertions added, execution pending. |
| R4.20–.21 | Verified student maintainer requests existing/suggested company with explanation; different staff member approves selected published company | Payload/frontend tests pass; transactional ownership/staff decision scenarios pending PG17. |
| R4.22–.24 | `/partners`, detail/current/past/public related work, contextual `/inquiry/partner/<companyId>` using existing form/intake endpoint | Selected existing inquiry tests pass; partner DB intake/browser completion pending. Intake is stored, no email delivery claim. |
| R4.25–.26 | Labelled staff forms at laptop/tablet; wrapping public cards and existing mobile inquiry at 390px | Playwright scenarios supplied for 1280/768px staff and 390px public; execution pending ld. |
| R4.27 | Preserve R1–R3 code paths and historical fixture/migration bytes; targeted previous-release checks | Selected regression tests pass. Full cumulative integration/build/browser checks pending ld. |
| R4.28 | Draft adapter, release notes/submission, exact source mapping instructions; preserve historical releases | Deployment, exact SHA, public smoke, immutable tag and Moodle evidence are external release gates, all PENDING. |

Unchosen challenges R4.10/.13/.19 are not claimed. Basic role, network, text rendering and privacy hygiene are implemented regardless of challenge choice.
