# R3.1 dependency validation on Windows

Validation date 2026-11-15, America/Toronto. Candidate source is `feat/r3-1-xr-studio` at `5b9803b12b8ac7bc6335caf81446d44324a9149c`, with the existing uncommitted dependency patch. PR #9 targets `main`. Node **24.14.1**, npm **11.11.0**, PowerShell **7.7.0** and Docker Desktop were used locally.

## Result

**PASS. 614 tests passed, zero failures, five intentional desktop exclusions and zero browser flakes.** The dependency-updated candidate passed validation. The owner subsequently authorized local integration, reviewed commits, normal push and factual PR/issue updates on 2026-11-15; production actions remain separately gated.

| Check | Actual result |
| --- | --- |
| Locked install, `npm ci --no-audit --no-fund` | Exit 0, 492 installed packages, lifecycle scripts enabled |
| Fresh PostgreSQL 17 migrations | Exit 0 in both focused and full runs |
| Typecheck | Exit 0 |
| Lint | Exit 0 |
| Unit | 200 passed, 23 files, zero failures/skips |
| Frontend | 100 passed, 16 files, zero failures/skips |
| Integration | 179 passed, 14 files, zero failures/skips |
| Production build | Exit 0, Next 16.4.6 |
| Full Playwright desktop and 390px | 135 passed, five intentional desktop exclusions, zero failures/flakes |
| Full npm audit | Exit 0, zero vulnerabilities of every severity |
| Production npm audit, `--omit=dev` | Exit 0, zero vulnerabilities of every severity |
| `npm ls --all --json` | Exit 0, valid dependency/peer graph |
| Drizzle generation against a disposable migration-directory copy | 35 tables, no schema changes, nothing to migrate |
| Native Sharp PNG generation and PDF worker build trace | Both assertions passed |
| Independent dependency review | Zero blocking findings, four override API assertions and five MCP origin-guard assertions passed |
| Task-owned container cleanup | Exit 0 in both runs, full container absence independently verified |

Focused checks preceded the full matrix. Inquiry integration passed **26/26**. Focused auth/inquiry/project-import browser checks passed **33**, with **1** intentional desktop exclusion and zero failures/flakes. These counts overlap the complete matrix. The full run reused the immediately preceding successful production build from the identical source and dependency tree, with another fresh database. All six Studio concurrency regressions and the four original resume PDFs are covered by the complete suites.

The five full-suite exclusions are desktop executions of the mobile-only inquiry, project-detail, complete-workflow Scenario F, student-profile and talent-directory overflow scenarios. Their 390px executions passed. Full browser JSON reports `expected=135`, `skipped=5`, `unexpected=0`, `flaky=0`.

## Failure diagnosis and repair

The supplied `runner-error.log` was read before investigation. Its exception at `scripts/validate-r31.ps1` line 109 was `Dependencies missing; use -InstallDependencies.` The exact isolated worktree had neither `node_modules` nor its hidden lockfile. The original checkout's successful install did not install dependencies in that separate directory.

Ran ordinary locked `npm ci` directly in `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-validation-5dc09ec5`. The manifest and lockfile stayed byte-identical to the original feature branch's dependency patch. The runner then passed its dependency guard and started actual tests. Application source, tests and runner required no compatibility changes.

An additional Drizzle smoke initially used an absolute Windows output path. Existing Drizzle Kit concatenates that path with the working directory and prints ENOENT while returning exit 0. Retrying with a sibling-relative disposable output path completed normally and reported no schema changes. Both logs are retained. The repository's normal relative-path migration configuration needs no repair.

## Isolation and preservation

The existing isolated worktree contains only the example environment file. The runner supplies synthetic auth values, disabled mail, test-controlled GitHub fetch and disposable database identities, and restores its process environment afterward. Each database is a unique `postgres:17` container with tmpfs storage, a generated test database/password and an ephemeral port published exclusively on `127.0.0.1`. The full run's recorded container was `immxrsive-r31-599ce893cf434aa7bdb01a29d123eb3f`, bound at `127.0.0.1:56716`. Its cleanup verifies the task ownership label before removal.

Original preservation checks passed for the `.env*` bytes, all 24 migration SQL/metadata files and unrelated `docs/course/r2/` bytes. Source/tests/security fixes match the isolated validation candidate. The original HEAD remains `5b9803b12b8ac7bc6335caf81446d44324a9149c` and `R3-submission` remains `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`. Both task containers were cleaned up. The pre-existing stopped `immxrsive-r31-test-db` container remains present.

## Dependency and advisory dispositions

The retained patch pins Next/config **16.4.6**, Better Auth/adapter **1.7.16**, Nodemailer **10.5.0**, Zod **4.6.7** and Vitest **5.1.0**. Existing security updates and the source-map override remain present. Scoped esbuild **0.25.12** and minimatch **11.0.1** overrides passed their actual consumer APIs and complete relevant tooling checks. All 224 changed package records retain HTTPS npm resolution and integrity. The lockfile also updates its root manifest record. Better Auth core is **1.7.25** hoisted and **1.7.16** nested. The declared graph and exercised authentication/session paths pass with that documented duplication.

Both fresh audits have zero affected-package entries. Prior evidence records full **19 to 0** and production **11 to 0** reductions. The six Next records with placeholder vendor fixed versions receive the following current-candidate dispositions. A numeric vendor fix floor remains a metadata follow-up.

| Advisory | Candidate disposition |
| --- | --- |
| GHSA-3w37-wq28-93x7 | Source lacks Draft Mode, `use cache` and Cache Components prerequisites |
| GHSA-cjq9-62q9-8jv4 | Source lacks `images.remotePatterns`, explicitly excluded by the vendor workaround |
| GHSA-39w2-rjm5-chcv | Installed Next 16.4.6 origin guard covers `/_next/mcp` before hot-reloader middleware. Hostile Origin, opaque Origin and cross-site no-CORS each return 403. Loopback Origin and origin-free native access are accepted. Five executable assertions passed |
| GHSA-4jqv-mc3x-m676 | Application lacks the Pages Router prerequisite |
| GHSA-mcj8-r9mp-w47p | Application lacks a root catch-all page and the described SSG/ISR configuration |
| GHSA-f87g-xv8r-7p7x | Application lacks dynamic metadata-image routes and associated dynamic-params configuration |

The MCP disposition is candidate-specific mitigation evidence. Reassess before changing these features, origins or framework versions. Maintainer patch metadata remains `16.3.?` on the freshly checked pages. Full historical advisory details and links remain in the [dependency security audit](r3-1-dependency-security-audit.md). The vendor separately confirms the image configuration exclusion and development-only MCP scope. [SSRF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4), [MCP advisory](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv).

Existing deprecated esbuild-kit packages, ESLint 9 maintenance status and harmless FORCE_COLOR/NO_COLOR warnings remain maintenance follow-ups. Current npm audits report zero advisories for this candidate.

## Evidence and reproducibility

All paths below are local, sanitized evidence directories retained for review.

- Focused migrations/integration/build/browser and cleanup logs, `results.json` and Playwright JSON at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-a622c0dee6db4c90b3c242370eed92c3`.
- Complete matrix logs, `results.json`, browser JSON and failure-retention artifacts at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-6e221132b5e24c3fb85cd3c843779188`.
- Fresh audit JSON, complete npm dependency graph, independent reproducible review script/JSON, native/tracing checks, Drizzle generation logs and container binding at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-dependency-final-20261115`.
- Preservation baseline at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-preservation-20261115.json`.

Final independent closeout review confirmed all suite counts, zero-failure browser JSON, both clean audits, successful build and cleanup, preserved hashes/provenance and the twelve-file manifest. It found zero blocking defects. Final preservation evidence is `preservation-final.json` in the dependency evidence directory and covers 30 protected files, including environment files. `git diff --check`, all twelve intended-file existence/whitespace checks and targeted private-key/token/credential-URL pattern checks passed. The dependency manifests retain their exact tested hashes.

Exact candidate SHA-256 values are `8a8637faf260fa363f3152a92b5f150b7f8ee5b8cc473bb9e9e81f9b59b31977` for `package.json` and `422aa746be8321f2db556aa33cb8e7025bbf0a063f5c12dba046cac41a0e7909` for `package-lock.json`.

The unchanged runner was invoked with `-ExpectedBranch feat/r3-1-deps-validation-5dc09ec5 -FocusedOnly -InstallBrowser`, then with `-ExpectedBranch feat/r3-1-deps-validation-5dc09ec5 -ReuseBuild`. Normal production `start` served the browser matrix. Migration generation used `--out=../immxrsive-r31-dependency-final-20261115/drizzle-generation` against a copied journal/snapshot tree.

## Exact commit and PR preparation

Proposed dependency commit subject is `fix(deps): validate R3.1 security updates on Windows`.

Proposed commit body follows.

```text
Pin the reviewed framework, auth, mail, validation and test security updates.
Retain scoped esbuild/minimatch fixes and the existing security hardening.
Record complete Windows/PostgreSQL 17 validation and clean npm audits.
Document candidate-specific Next advisory dispositions and release gates.
```

The original proposed combined commit had these twelve paths. Final integration separates dependency remediation from release documentation: paths 3 and 6 are included in the release-documentation commit; the other ten form the dependency commit.

1. `package.json`
2. `package-lock.json`
3. `docs/r3-1-release-readiness.md`
4. `docs/r3-1-dependency-security-audit.md`
5. `docs/r3-1-dependency-validation-final.md`
6. `docs/r3-1-pr-description.md`
7. `docs/dependency-audit/audit-before.json`
8. `docs/dependency-audit/audit-after.json`
9. `docs/dependency-audit/audit-production-before.json`
10. `docs/dependency-audit/audit-production-after.json`
11. `docs/dependency-audit/lock-changes.csv`
12. `docs/dependency-audit/locked-inventory.csv`

The branch already contained the exact tested dependency files, so reconciliation requires only documentation updates. Unrelated course files remain outside this manifest. The prepared PR body is [r3-1-pr-description.md](r3-1-pr-description.md). GitHub read-only inspection found PR #9 open, draft and mergeable at the expected head, no review threads and no combined-status entries. Those observations precede the pending dependency commit.

## Remaining release gates

The hosted Node major, Linux native artifacts and actual target-Vercel runtime remain unverified. The current broad engine constraint does not establish the hosted runtime. Authenticated staff/persona, populated-gallery, long-content, mobile/accessibility manual QA and hosted identity/privileges, migration journal, backup/restore and rollback evidence retain their existing release gates. Vendor numeric fixed-floor follow-up remains documented. Production migration, real staff bootstrap, deployment and merge each retain separate authorization requirements. See the [release-readiness checklist](r3-1-release-readiness.md).

The owner's final-integration instruction authorizes the reviewed dependency commit, normal push of `feat/r3-1-xr-studio`, and PR #9 preparation for release review. Actual integration results and commit identities are recorded in the final local integration report and PR description. This authorization does not include merge or production actions.
