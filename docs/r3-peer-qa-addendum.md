# R3 peer QA repair addendum

This proposed patch addresses Team 08 issues #3–#7 after submission. No tag, remote issue, production record, private account, migration, deployment or Studio file was changed. It requires caller review and explicit approval before application to the real repository.

## Evidence and adapter inspection (#3)

The current submission document now distinguishes owner confirmations from independently inspected behavior and missing evidence. The original input documents are preserved in `docs/archive/r3-peer-qa/`; they do not claim to be retrieved tagged artifacts.

`evaluation_adapter.json` parses as JSON and contains all keys from the repository's `evaluation_adapter_r1_template.json`, including the four query mappings, result/ID/skills/contributor fields and route placeholders. `optional_broken_project_id: P07` is a deliberate official legacy fixture identifier, not the UUID student demo project. Additional R2/R3 metadata exists. No official R3 schema or downloaded R3 adapter template is present, so strict schema compliance (including whether extra keys are allowed and expected evidence types) cannot be certified. Obtain the official course schema and validate before claiming compliance. Owner-reported tag/import evidence is now explicit; two-human public URLs remain empty. Do not translate automated collaboration success into human acceptance. Assessed tag/deployed SHA reconciliation remains manual.

## Directory filters (#4)

Known skill names are canonicalized against authoritative metadata with case-insensitive comparison, then deduplicated. Unknown skills still receive structured HTTP 400 and never fall through to an unfiltered query. The UI identifies invalid filters, offers clearing them, and does not offer an ineffective retry for that validation error. Known mixed-case filters appear checked and can be unchecked. Transient request failures retain retry.

## Saved demo data and safe owner correction (#5)

A read-only GET to `/api/v1/projects/02bf74ba-fe2a-4707-9b62-30d45fc08b01` returned:

- title: `ImmXrsive platform`
- technologies: `[]`
- only asset: playable / `website demo` / `https://immxrsive-talent-platform.vercel.ap/`

The public query maps saved technology rows and media URLs directly; it neither removes technologies nor rewrites the hostname. This supports persisted-data diagnosis. No database connection or credential was used. A syntactically valid HTTPS hostname is not proof of reachability; existing requirements do not justify automatically rewriting arbitrary user URLs. No new URL restriction was added.

The project maintainer should:

1. Sign in through the normal student flow, open My projects, select this project, then open `/student/projects/02bf74ba-fe2a-4707-9b62-30d45fc08b01/edit`. Only the maintainer can edit shared fields. If inaccessible, ask the actual maintainer; do not use another person's account.
2. In **05 / Evidence**, locate the row with **Playable web URL** and label **website demo**. Set its **Media N URL** to `https://immxrsive-talent-platform.vercel.app/` if the intended demo is the platform homepage. For the course's interactive fixture instead, deliberately set `/fixtures/r3/working_demo.html`. Confirm the intended target; these are different demonstrations.
3. In **Project technologies**, enter only technologies actually used by this project, separated by commas or newlines. Verify against its repository; do not copy personal skills or invent technology claims.
4. Choose **Add media link**, set the new **Media N type** to **Fallback image**, label it `Demo fallback`, and set its URL to `/fixtures/r3/fallback.svg` (or an owner-approved public HTTPS fallback image). Add an accurate description if appropriate.
5. Choose **Save project**, then **Preview saved project**. Verify the playable destination, technology labels and fallback. If already published, saved edits affect the public project; otherwise publish only when ready. Check **View public project** signed out, and recheck the public API. Preserve the same canonical project ID. No production data correction has been performed by this patch.

## HTTP status and sign-in (#6–#7)

The public project layout checks the same cached public-only projection before the segment's loading boundary can stream a successful response. Existing published/private visibility rules and maintainer preview routes are unchanged. Missing and unpublished projects should both remain unavailable to anonymous visitors. Page-level checks remain defensive; database failures still throw rather than becoming false 404s. HTTP tests cover invalid ID, missing UUID and an existing published legacy fixture. Run them on a built server to verify actual streaming semantics before deployment.

Student sign-in now says `Student access`, without a release number. A browser assertion protects that wording.

## Validation and review status

See the worker's final validation report for actual counts. Database/browser checks need verified disposable infrastructure. No production credentials or database were accessed. Full build and broader regression suites are caller-side work through `ld`, as required by the remote job limits. Independent final Codex review remains required before application/commit; this worker did not launch another agent.

## Suggested truthful issue replies (do not post automatically)

- #3: “Proposed a post-submission correction separating owner-confirmed tag/import evidence from the remaining two-human public example gap. The assessed tag is unchanged. Official R3 adapter schema and tag/deployment SHA reconciliation still need confirmation.”
- #4: “Proposed canonical skill matching and an actionable invalid-filter state, with API and UI regressions. Snapshot test results are in the repair report; deployed behavior still needs retesting after approved application.”
- #5: “The read-only public API exposes the misspelled playable URL, empty technologies and no fallback. This is saved data; maintainer-only correction steps are documented. Production data was not edited.”
- #6: “Proposed a public-project existence gate above the loading boundary and HTTP status regressions. Built-server verification on disposable infrastructure remains required before claiming the soft 404 fixed in production.”
- #7: “Proposed release-neutral Student access wording and a regression assertion. Deployment and live verification remain pending.”
