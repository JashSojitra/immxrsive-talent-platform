# PR title

R3.1: add XR Studio curation, harden private reads and validate security dependencies

# Ready-to-paste PR body

## Result

Adds the owner-controlled XR showcase workflow: maintainers submit curated text/evidence, curators review and suggest, and administrators publish only approved content accepted by the current owner of the unchanged public canonical project. Transfers, canonical edits/unpublication, withdrawal and moderation hide stale gallery output. Contributor consent stays in the separate R3 team workflow; no public staff-assignment endpoint is introduced.

The independent pre-release audit found one medium privacy race. An ownership/grant decision could become stale before later private data was retrieved. Detail reads now hold project then actor-grant share locks in one transaction through history retrieval. Queues retain the actor-grant lock through retrieval. The local pass retained the audited service repair and added three reverse-order regressions, for six PostgreSQL concurrency cases plus nine HTTP boundary cases.

The dependency follow-up pins Next/config 16.4.6, Better Auth/adapter 1.7.16, Nodemailer 10.5.0, Zod 4.6.7 and Vitest 5.1.0, with scoped esbuild/minimatch security overrides and transitive updates. Both current full and production npm audits report zero vulnerabilities. Application source and security tests passed with the dependency patch.

## Review and validation

- Final engineering/peer QA added five Studio frontend regressions for all staff roles, saved-revision owner acceptance and canonical-to-submission revision switching. The worker reports 131 distinct selected unit/frontend passes across overlapping runs, plus typecheck/lint; its local logs were not returned. Local integration reviewed the patch and independently executed the 64-test selection below. No new independent review agent was launched; GitHub release review remains outstanding. [Final engineering QA](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-final-engineering-qa.md).
- Independent source/security review covered the private-read repair and lock order. A fresh independent dependency review found zero blocking findings and passed scoped override APIs and five installed Next MCP origin-guard assertions.
- Dependency-updated Windows matrix on Node 24.14.1/npm 11.11.0 passed **200 unit, 100 frontend, 179 integration and 135 browser tests**, 614 total. Five intentional desktop exclusions cover mobile-only scenarios that passed at 390px. Zero failures/flakes. Migrations, typecheck, lint, production build and both disposable container cleanups passed.
- Focused inquiry integration passed **26** and focused auth/inquiry/project-import browser verification passed **33**, with one intentional desktop exclusion and zero failures/flakes. Focused counts overlap the complete matrix. Original tracked resume PDFs and all six Studio concurrency regressions were exercised.
- Final integration commits: `0663e9b` dependency remediation and `37c390e` five additional Studio frontend regressions, followed by the release-documentation commit. Source `feat/r3-1-xr-studio`, target `main`. The original submission tag and all 24 migration files retain their bytes/targets; unrelated `docs/course/r2/` is untouched.
- Final local integration: **64 targeted tests passed** across six files, including Studio and issues #4/#6/#7 regressions; typecheck/lint passed. These overlap the prior 614-test matrix. No application or migration behavior changed in the remote patch, so the complete matrix was not repeated. Both exact tested dependency hashes match. [Local integration report](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-final-local-integration.md).
- Full sanitized results are at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-6e221132b5e24c3fb85cd3c843779188`. Focused build/results are at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-a622c0dee6db4c90b3c242370eed92c3`. Audits/review evidence are at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-dependency-final-20261115`. The complete report records commands, hashes, resource isolation and advisory dispositions. [Dependency validation report](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-dependency-validation-final.md).

## Release controls

**Ready for production-release review; NO-GO for production execution.** Full npm audit falls from 19 affected-package entries to zero, production from 11 to zero. These retained audits match the validated dependency candidate; no redundant audit was run during final integration. Six Next advisories retain placeholder vendor fixed-version metadata. Five lack application prerequisites. The installed MCP origin guard passes five executable cases and precedes its middleware. These candidate-specific dispositions are documented alongside vendor metadata follow-up.

Authenticated staff/persona, populated-gallery, long-content/mobile/accessibility QA and hosted privilege/journal, backup/restore and rollback evidence remain operational gates. Migration 0011, real staff bootstrap and deployment require separate explicit authorization. This hardening patch introduces no new migration. Retain additive schema/audit records on application rollback.

Issue #3 remains open for two consenting real contributors and assessed-release evidence/provenance reconciliation. Issue #5 remains open for an authorized maintainer correction of the playable URL, truthful technologies and independent fallback, followed by persistence/public-page/external-launch retest. No current live-data correction is claimed. Issues #4/#6/#7 remain closed; targeted regressions passed. R3.2 AutoDemo is excluded. Production actions and merge remain unauthorized.

Supporting documentation includes the security review, dependency audit, final validation report and release-readiness checklist. [Security review](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-premerge-security-review.md), [dependency audit](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-dependency-security-audit.md), [final validation report](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-dependency-validation-final.md), [release-readiness checklist](https://github.com/JashSojitra/immxrsive-talent-platform/blob/feat/r3-1-xr-studio/docs/r3-1-release-readiness.md).
