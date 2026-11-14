# PR title

R3.1: add XR Studio curation and retain private-read authorization through retrieval

# Ready-to-paste PR body

## Result

Adds the owner-controlled XR showcase workflow: maintainers submit curated text/evidence, curators review and suggest, and administrators publish only approved content accepted by the current owner of the unchanged public canonical project. Transfers, canonical edits/unpublication, withdrawal and moderation hide stale gallery output. Contributor consent stays in the separate R3 team workflow; no public staff-assignment endpoint is introduced.

The independent pre-release audit found one medium privacy race: an ownership/grant decision could become stale before later private data was retrieved. Detail reads now hold project then actor-grant share locks in one transaction through history retrieval; queues retain the actor-grant lock through retrieval. The local pass retained the audited service repair and added three reverse-order regressions, for six PostgreSQL concurrency cases plus nine HTTP boundary cases. No migration history, dependency manifest/lockfile, public DTO or browser privilege changed in this security patch.

## Review and validation

- Independent source/final-diff review was supplied by the remote audit; local review checked the seven files and project/role lock order. No new cycle or privilege inconsistency was found in supported paths; no claim of arbitrary-load/deployment certification.
- Fresh Windows matrix: **200 unit, 100 frontend, 179 integration, 135 browser passed**. Five unchanged desktop exclusions cover mobile-only cases that execute on 390px. Zero failures/flakes. Migrations, typecheck, lint, production build and disposable cleanup passed.
- Targeted: **58 unit/frontend plus 21 Studio integration passed**, including all six concurrency regressions, zero skips. Focused counts overlap the complete matrix. Original tracked resume PDFs were exercised.
- Exact baseline: `388497c2b5d99f402071af9e79311c4fe7a6f5bd`, source `feat/r3-1-xr-studio`, intended PR target `main`. No final commit SHA is invented; changes remain uncommitted/unstaged. The original submission tag and all 24 migration files are unchanged.
- Full sanitized results: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-1dd3714792b842fbbe47461c10641bd9`. Detailed source, dependency and resource evidence: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-security-local-16d6ed5957404934bbd7272a44de5275`.

## Release controls

**GO for final reviewed commit/PR; NO-GO for production pending remaining gates.** Current npm audit reported 11 affected-package entries (7 moderate / 3 high / 1 critical); reachability and remediation/accepted-risk disposition are incomplete. The security report records the installed Sharp workaround for one Next advisory. No broad dependency upgrade was mixed into this patch.

Authenticated staff/persona, populated-gallery, long-content/mobile/accessibility QA and hosted privilege/journal, backup/restore and rollback evidence remain operational gates. Migration 0011, real staff bootstrap and deployment require separate explicit authorization. This hardening patch introduces no new migration. Retain additive schema/audit records on application rollback.

Issues #3/#5 and official course evidence remain separate and unresolved here. R3.2 AutoDemo is excluded. No commit, push, merge, tag, issue update or production/staging operation was performed.

Details: [security review](r3-1-premerge-security-review.md), [release-readiness checklist](r3-1-release-readiness.md).
