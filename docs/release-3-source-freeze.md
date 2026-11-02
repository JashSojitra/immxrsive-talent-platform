# Release 3 local source-freeze checkpoint

Date: 2026-11-01. Branch: `feat/release-3`. Authorized scope: local source audit, staging and commit only. No push, merge, deployment, remote database operation or R3 tag is part of this checkpoint.

The commit introducing this document is the local checkpoint. Resolve its full SHA with `git log -1 --format=%H -- docs/release-3-source-freeze.md`; it is also returned in the checkpoint report. The parent is the merged R2 QA baseline `4c8a64d7313c1401889ae97a1223090d059008de`. This local checkpoint does not establish a deployed or assessed release identity.

## Source verification

All 248 application/test/migration/configuration/original-fixture/course inputs captured for Phase 7 match their recorded SHA256 hashes. No runtime source, tests or migration statements changed after the fresh verification: 158 integration/API, 230 unit/frontend and 125 browser passes, 5 intentional desktop skips for mobile-only assertions. Full-suite reruns are unnecessary for this documentation-only checkpoint; read-only migration metadata and provisional adapter checks were repeated. Historical SQL/snapshot Git blobs match HEAD, and the original eight journal entries remain unchanged with three forward-only entries appended.

Git clean-filter normalization was used when comparing historical committed files: Windows checkout CRLF bytes can differ from stored Git blobs, but no historical SQL or snapshot is staged as modified. The new migration SQL statements are unchanged from Phase 7; normal Git clean filtering stores 0009/0010 with LF instead of the Windows worktree CRLF. Raw SHA256 therefore depends on checkout line endings, as with existing migrations; no journal checksum was edited. Compare the deployment checkout and target migration journal explicitly during the separately authorized deployment. R1/R2 tag refs and configured author Jash Sojitra <jash221434@gmail.com> remain unchanged.

## Inclusion and exclusion

[Exact committed-file manifest](release-3-source-freeze-files.txt) lists every staged R3 addition/modification. This includes the Phase 1 UUID inquiry repair, shared-project schema/services, editor/public projections, consent workflows, safe GitHub import/duplicate joining, isolated demo/fallback, tests, official R3 fixtures/course requirements and release documentation. Curated synthetic screenshots and sanitized command/result records under `docs` are retained release evidence, not deployed human-account evidence.

Excluded and preserved locally: all `tmp/` transient logs, raw JSON, extraction and disposable preservation artifacts; four unrelated R2 PDFs under `docs/course/r2/`; ignored `.env.local`, dependency/build/test caches and raw `test-results`/`playwright-report`. No environment files, actual credentials or private human account data are staged. Secret-pattern checks found only generated disposable URL interpolation, not literal credentials. Non-production synthetic test constants remain clearly scoped to tests/drivers.

## Remaining release gates

Manual human browser testing is intentionally postponed until after deployment and before final submission. Automated local desktop/390px passes do not replace that review. No production verification is claimed. The latest official R3 adapter template, durable public two-contributor example, actual public GitHub import, verified hosted demo/fallback and assessed deployment SHA remain outstanding. The adapter extension is provisional and contains null production evidence.

`R3-submission` is NOT CREATED. Existing Phase 7 reports remain point-in-time audit records, including their pre-commit baseline/uncommitted status. Follow the controlled deployment/rollback checklist only under later explicit authorization. This checkpoint is ready for a separately authorized GitHub push after review; no remote freshness/authentication or push success is asserted.

Pre-commit staged whitespace checking found three trailing spaces in the retained Next build log; only those documentation lines were trimmed. The original transient log remains preserved locally. Adapter/migration metadata checks and staged diff checks passed afterwards.
