# R3.1 final local integration

2026-11-15, America/Toronto. Branch `feat/r3-1-xr-studio`, PR #9 to `main`; original local/remote HEAD `5b9803b12b8ac7bc6335caf81446d44324a9149c`.

## Reviewed changes

Remote patch `bca5abc42e98426ab1af3abd50a384e1.patch` contains six paths: five documents (including an archived proposal) and `tests/frontend/studio-review.test.tsx`. Its five new executable cases strengthen staff/owner boundaries, exact saved-content consent and revision switching. No source, dependency, migration, fixture, credential or unrelated feature changes occur in that patch. Forward application check passed against the actual branch; application succeeded without conflicts. The snapshot worktree is the sanitized baseline; its returned changes are in the patch. No separate manifest/report artifact was present beside that patch; its file headers and embedded engineering report supply the manifest and findings.

The dependency remediation was already present locally but uncommitted. Both files match the tested Windows hashes exactly and the snapshot after CRLF normalization. It was committed once, without reapplying the dependency patch. All snapshot source/tests/migrations match local content after line-ending normalization except the deliberately added frontend tests. Review found no test weakening, historical migration edit, fabricated human consent or exposed credential. Remote results remain explicitly attributed to their worker; inaccessible worker-local logs are not claimed as inspected evidence.

Logical commits:

- `0663e9b`: dependency manifests, six audit/inventory artifacts and two dependency reports.
- `37c390e`: five new Studio frontend regressions (52 added lines).
- The following documentation commit records the reviewed remote handoff and current release gates. PR #9 records its actual final SHA after commit.

Existing private-read security repair `5b9803b` is preserved: transactional project/grant locks persist through private retrieval; the six concurrency regressions remain unchanged. Dependencies retain Next/config 16.4.6, Better Auth/adapter 1.7.16, Nodemailer 10.5.0, Zod 4.6.7, Vitest 5.1.0 and scoped esbuild/minimatch overrides. Both retained npm audits have zero vulnerabilities. Better Auth core duplication and six candidate-specific Next advisory dispositions retain their documented limits; vendor numeric fix metadata remains follow-up.

## Actual verification

Final local Windows Node 24.14.1/npm 11.11.0:

- `node node_modules/vitest/vitest.mjs run tests/frontend/studio-review.test.tsx tests/unit/talent-query.test.ts tests/unit/talent-route.test.ts tests/frontend/talent-directory.test.tsx tests/unit/public-project-layout.test.ts tests/frontend/student-sign-in-page.test.tsx`: **64 passed, six files, zero failures/skips**, exit 0. This includes all seven Studio frontend cases and regressions for #4/#6/#7.
- `npm run typecheck` and `npm run lint`: exit 0.
- `git diff --check`, staged whitespace checks and targeted credential-pattern checks: passed.
- All 24 committed migration hashes match `docs/r3-1-audit-migration-sha256.txt`. Environment files, physical migration bytes and unrelated course R2 bytes match the pre-integration preservation baseline. `R3-submission` remains `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`.

Prior dependency-updated isolated Windows/PostgreSQL 17 evidence was inspected directly: `results.json` has exit 0 for migrations/type/lint/unit/frontend/integration/browser/cleanup; logs record 200 unit, 100 frontend and 179 integration passes; browser JSON records 135 passed, five intentional exclusions, zero unexpected failures/flakes. Total **614 passed**. The separate focused run supplied the successful build reused by that identical candidate. Dependency hashes match `preservation-final.json`; retained independent review has zero findings. See [dependency validation](r3-1-dependency-validation-final.md) for exact evidence paths, build/native checks and isolation details. Counts overlap final targeted checks. No new full matrix, install, online audit, database container or production probe was needed for this test/documentation-only integration.

Final diff review is bounded to this integration. No new independent review agent or remote Codex job was launched. GitHub review/CI is reported separately for the pushed head; absence of checks or reviews is not approval.

## Issues and release handoff

GitHub inspection confirms #3/#5 open and #4/#6/#7 closed as completed. Targeted regressions for the latter pass; current deployed behavior was not re-certified. #3 requires two consenting real contributors on one public canonical project with truthful roles/statements, consented evidence, deployed SHA/date and assessed-submission provenance reconciliation. Preserve historical tags; any official adapter/instructor evidence must be genuine. #5 requires explicit production-data authorization and the real maintainer's normal edit flow: verify the intended playable destination, record truthful technologies and accurate independent fallback, then reload editor/public API/page and test external launch/fallback at desktop/390px. Never infer that the historical `.vercel.ap` observation is current without rereading production. Neither issue meets verified closure criteria here.

Production remains **NO-GO** until hosted Node/Linux/native/runtime verification, approved staff/persona lifecycle and populated mobile/accessibility QA, withdrawal visibility-scope confirmation, hosted database identity/journal/hash/effective privilege checks, encrypted backup plus timed restricted restore and compatible rollback evidence are complete. Unpaginated pilot limits and vendor advisory metadata remain documented follow-ups. The ordered migration 0011, backup/restore, deployment and bootstrap procedures are prepared in [release readiness](r3-1-release-readiness.md).

Exact separate approvals needed:

1. PR merge approval following review/CI disposition, for the exact reviewed head.
2. Approved hosted access and handling of real backup data: environment, operator, restricted restore destination, retention and acceptable RTO/RPO; recovery owner signs off actual restore evidence.
3. Production migration approval: exact release SHA, environment, verified journal state, migration 0011 hash, operator/window and stop/rollback owner. Verify an already-installed 0011 instead of blindly replaying it; never bypass test guards or rewrite history.
4. Production deployment approval: exact SHA/build, Vercel project/environment, verified runtime and rollback build. Retain additive 0011 tables and all audit/submission records on application rollback.
5. Administrator bootstrap approval: independently verified real internal account ID, environment, approver/operator and ticket/reason. Use the reviewed locked transaction with matching audit event; no signup/RPC grant or invented consent.
6. Separate maintainer production-data correction authorization for #5 and real contributor consent/evidence for #3. Any whole-database restoration needs additional explicit data-loss approval.

No production migration, deployment, merge, real admin grant, production write, force push or historical tag change was performed.
