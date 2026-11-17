# R4 remote implementation report — 2026-11-17

## Result and provenance

R4 implementation patch prepared against the supplied acceptance brief, with release verification still blocked on external infrastructure/evidence. This is not a deployed or fully accepted course release.

`R4_SNAPSHOT_PROVENANCE.txt` records `refs/remotes/origin/feat/admin-student-project-onboarding` at `8bbf9228a7b59602297f3d53697e1ca4a23b66dd`. The actual local Git head is the synthetic runner baseline `2f18209`; its origin is local snapshot storage, not GitHub. No independent original-remote head verification was possible. Intended caller integration branch: `feat/r4-staff-industry-collaborations`, created from the verified admin head. No Windows worktree, original branch, commit, push, PR, merge, tag, production database or deployment was changed.

Authoritative input read: `_r4_sprint_reference/R4_IMPLEMENTATION_BRIEF.md`, all four exact HTML fixtures, fixture README, expected_company_imports.json and collaboration_seed.json. No standalone official R4 PDF or Nov 16 email was found; their summaries in the supplied brief govern this patch. Existing R3 PDF is not represented as an R4 source.

## Implemented scope

- Staff dashboard counts/queues for verification, company drafts/import proposals and associations; staff role checks at HTTP and transactional service boundaries.
- Current verified student maintainer submits review note/evidence, existing/suggested company request; independent staff approve/reject with rationale, no self-review, pending-only decisions and current-maintainer checks. Official marker and multiple approved partners appear on canonical public project pages.
- Manual editable company drafts; explicit publish/unpublish; HTTPS website import returning editable proposals only, explicit application/save, persisted pending proposal review, source URL/time history and append-only audit.
- R4.14 normalized host warning with existing-company links, deliberate separate-record acknowledgement, no name-based automatic merge; advisory locking protects concurrent domain checks.
- Multiple dated/year/current/past collaborations, narratives/outcomes, many project edges and account public-profile participants. Public projection omits private entries and strips identifying data/links from limited entries. Currently unpublished related projects/profiles are rechecked before public output.
- Public partner directory/detail and contextual inquiry using existing form/intake. Partner inquiries are stored separately while retaining existing R1–R3 inquiry behavior. No email-delivery claim.
- Additive generated 0013 schema/migration/snapshot, nine deny-by-default RLS tables, privilege revocations, FKs/state/version checks, immutable audit and deferred independent-review constraints. Historical migrations and journal entries are unchanged.
- Exact fixture copies, explicit-mapping disposable PG17 collaboration setup, targeted tests, browser scenarios, draft submission/adapter/release notes and evidence matrix. Previous root R3 submission/adapter retained in docs/archive/r4-preparation/.

Website metadata and fetch provenance are separate. Exact fixture `.example.test` company websites are allowed as reserved metadata, displayed as non-hosted test values, and rejected as fetch-source URLs. Real fetch sources require public HTTPS. Connections pin validated DNS addresses, reject private/reserved or IPv6 results, redirects, compressed/non-HTML responses, cap 500 KB, bound DNS to 2 seconds and HTTP to 8 seconds. Parser never runs scripts, external resources or an LLM. React renders all imported strings as text.

## Validation evidence

Default worker Node 18.19.1 is unsupported. Dependencies were installed with existing Node 22.22.0 and an isolated writable npm cache. package.json/package-lock.json did not change. No system environment was modified.

The following final commands used `PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH`:

| Check | Exit / result |
|---|---|
| `npm ci --cache /tmp/r4-npm-cache --ignore-scripts --no-audit --no-fund` | 0; locked dependencies installed |
| `npm run typecheck` | 0 |
| Changed-file ESLint command below | 0 |
| Focused Vitest command below | 0; **165 tests / 14 files passed**, sequential file execution |
| Drizzle generateDrizzleJson/generateMigration comparison of schema and 0013_snapshot | 0; no migration delta |
| Byte comparison of four HTML and two JSON copies to supplied originals | 0; all six exact |
| Historical journal prefix comparison against synthetic baseline | 0; only 0013 appended |
| `git -c safe.directory="$PWD" diff --check` | 0 |
| `node node_modules/vitest/vitest.mjs run tests/integration/r4-partners.test.ts` | **1, infrastructure blocker**: `TEST_DATABASE_URL is required for integration tests`; **zero DB tests executed** |
| Production build, PG17 service/build suites, Playwright | **Not run**; memory-limited snapshot rules route heavy runs through caller's ld. No disposable DB/dispatcher workflow supplied here. |

Focused test command (selected R1–R3 regressions plus new R4 tests, not the full cumulative suite):

```sh
node node_modules/vitest/vitest.mjs run tests/unit/r4-import.test.ts tests/unit/r4-network.test.ts tests/unit/r4-http.test.ts tests/unit/admin-policy.test.ts tests/unit/admin-http.test.ts tests/unit/inquiry-template.test.ts tests/unit/database-security-hardening.test.ts tests/frontend/r4-partners.test.tsx tests/frontend/admin-onboarding.test.tsx tests/frontend/inquiry.test.tsx tests/frontend/project-editor.test.tsx tests/frontend/project-detail.test.tsx tests/frontend/student-profile.test.tsx tests/frontend/talent-directory.test.tsx
```

Changed-file lint command:

```sh
node node_modules/eslint/bin/eslint.js src/partners src/app/partners src/app/inquiry/partner 'src/app/student/projects/[projectId]/requests' src/app/api/admin/partners src/app/api/v1/student/partner-requests src/db/schema.ts src/db/queries/inquiry.ts src/lib/inquiry-template.ts src/validation/inquiry.ts 'src/app/admin/[[...section]]/page.tsx' 'src/app/projects/[projectId]/page.tsx' src/components/inquiry/InquiryPage.tsx src/components/project-editor/ProjectEditor.tsx src/components/project-editor/ProjectWorkspace.tsx src/admin/AdminShell.tsx tests/unit/r4*.test.ts tests/integration/r4-partners.test.ts tests/frontend/r4-partners.test.tsx tests/browser/r4-partners.spec.ts tests/unit/database-security-hardening.test.ts scripts/seed-r4-collaborations.ts
```

Iterations fixed mock exports, test-environment IntersectionObserver cleanup, JSX lint boundaries, typed testing-library options, importer website/source separation and the reserved-fixture metadata handling. These earlier failures are not reported as passing runs. Self-review covered authorization, IDOR, self-review, transaction/version conflicts, public serialization, SSRF boundaries and unchanged admin-managed publication rules. No separate agent/independent review was performed; caller review remains required.

## Reproducible blockers and release gates

1. No TEST_DATABASE_URL or PG17 service supplied. Run the new PG17 integration file and cumulative DB/auth/migration regressions through ld before integration acceptance. The new SQL has not been executed against PostgreSQL by this worker.
2. Run production build and new/cumulative Playwright suites through ld. Browser scenarios include 390px public privacy/inquiry and 1280/768px staff publication but are not execution evidence yet.
3. Four public fixture import-source URLs remain PENDING hosting and independent byte/hash verification. Mocked network/parser tests do not prove live fixture import.
4. Actual staff access, real maintainer request/review, published imported company, current/past collaboration demonstration, viewport screenshots, deployed revision, immutable tag and Moodle receipt are outstanding.
5. Production migration journal 0011/0012, identity, backup/PITR, roll-forward, staff bootstrap and auto-deployment ordering remain unverified. Preserve PR #9/#10/main/history and old tags. No deployment authorization is inferred.
6. Staff console displays latest 100 import/audit events; company-attached source history persists separately. Large datasets need pagination. Import intentionally falls back manually for IPv6-only/dual-stack or compressed/redirecting sites.

## Return and morning action

All work is in this snapshot's changed files, enumerated in `changed-files.txt`; the existing codex-remote return mechanism carries the patch. `/tmp/r4-changes.patch` is also exported locally after the final file inventory. No feature branch or commits were created because this worker's Git metadata is read-only.

**Next single action:** review/apply the returned patch onto the caller's new R4 branch from the verified admin head. Then use `operator-validation.md` for independent review and ld validation before committing/pushing a draft PR or addressing production release gates.
