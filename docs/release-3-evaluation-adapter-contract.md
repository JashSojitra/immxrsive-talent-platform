# Provisional Release 3 evaluation adapter contract

**Official-template gap:** `evaluation_adapter_template.json` referenced by Moodle is absent from the repository and supplied course documents. The available `evaluation_adapter_r1_template.json` is insufficient to establish current R3 key names. The `release_3` extension is a documented team proposal, not an invented official schema. Obtain/reconcile the latest template before assessed submission.

`evaluation_adapter.json` preserves every pre-existing root/R1 field and the entire `release_2` object unchanged. The exact prior JSON is archived in [evaluation-adapter-before-r3.json](evaluation-adapter-before-r3.json). The prior R2 submission is archived separately; this does not freeze an R3 assessed commit.

The provisional extension has these sections:

| Field | Contract |
| --- | --- |
| `adapter_status` | Exactly `PROVISIONAL_OFFICIAL_R3_TEMPLATE_MISSING` until reconciled |
| `pages` | Named relative application routes, `{projectId}` / `{studentId}` placeholders; no deployed origin invented |
| `apis` | Named objects containing actual relative `path` and exported HTTP `methods` |
| `workflows` | UI entry references, API references, fixture/setup and required consent semantics |
| `authorization` | Maintainer-only shared edits, session-derived personal ownership, reversible soft removal and stale revision behavior |
| `qa` | Setup, exact fresh results, traceability and disposable reproduction command; no passwords |
| `production_evidence` | Explicit `NOT_ESTABLISHED`; deployment/SHA/tag/project/media/import fields null and profile URL list empty |
| `planned_release_tag` | Intended `R3-submission`, not evidence of an existing tag |

Nine page mappings cover dashboard, My Projects, Add Project, edit, preview, team, private inbox, public project/profile. Eighteen APIs map collection/item/publication/team/eligible-student search/invitation/inbox/accept-decline/personal contribution/removal/restoration/transfer/import/duplicates/join request/own requests/join response. Actual HTTP methods and files are validated, not assumed from the architecture plan.

Contributor roles are in the private team API `roles` response and server-rendered editor data; there is **no standalone `/api/v1/project-roles` endpoint**. Invitation/claiming means the existing Add Project duplicate warning's Request to Join → maintainer approval → pending role invitation → independent acceptance. It never grants legacy project ownership. Public View Project remains the canonical route, not a fabricated join page. The private team/inbox surfaces manage this workflow.

The public project route exposes Play Demo/Launch Experience, video/source and View Fallback. Local static fixture paths describe deployed-compatible files; they are not verified public URLs. The deterministic GitHub QA repository is not a real public import example. Production evidence must be populated later only from verified actual records and deployed identity, with private evaluator access provided separately.

Run the read-only check:

```powershell
node scripts/validate-release-3-adapter.mjs
```

It parses JSON, checks preservation against the archived R1/R2 contract, checks available R1 field types, verifies all nine page files and eighteen API paths/exported methods, workflow references, official role/duplicate fixture counts, byte-identical playable/fallback copies, team decisions and absent production claims. Passing is **provisional team-contract validation**, not validation against the unavailable official R3 schema. After template reconciliation or real release evidence is recorded, review/update this provisional validator accordingly rather than bypassing its evidence checks.
