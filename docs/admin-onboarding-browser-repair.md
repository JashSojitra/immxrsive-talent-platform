# Bounded administrator browser repair

Final coordinator integration and Windows/browser results supersede the pending-check status of this worker report; see [final validation and release handoff](admin-onboarding-final-validation.md). Historical execution results below remain attributed to their original run.

The Windows desktop and 390px lifecycle cases pressed Tab immediately after
`page.goto("/admin/projects/new")`, before checking for the destination editor.
`src/app/admin/loading.tsx` supplies a streamed loading boundary. Navigation
completion and a polished eventual screenshot do not establish that the editor
was present and hydrated when that single key was sent. Playwright retries the
focus assertion, but does not replay the preceding keyboard action.

The supplied trace does not identify the active element at keypress time. This
worker could not reproduce the Windows failure. Inspection of the installed
Next 16.4.6 `InnerScrollHandler` in
`node_modules/next/dist/client/components/layout-router.js` found that it
explicitly leaves focus untouched; this repair does not assume Next automatically
focuses the main element or steals focus from the skip link.

## Changes

- The editor exposes `data-editor-ready="true"` from its mount effect. Its server
  HTML starts with `false`, so waiting for this signal also waits for hydration,
  rather than just visible server-rendered inputs. This follows the existing
  browser suite's use of client readiness attributes such as `data-motion`.
- The lifecycle test waits for the destination heading and hydrated editor,
  then focuses the document body with a temporary negative tabindex, restoring
  its original attribute immediately. This sets a deterministic document-level
  keyboard starting position without focusing the asserted link, adding a tab
  stop, or installing application autofocus behavior. Blurring alone would not
  reliably reset the browser's sequential focus starting point.
- The original first-Tab skip-link assertion remains. Enter must then focus
  the administration main landmark, and the following Tab must reach the
  repository input. The actual main target now has `tabIndex={-1}` so native
  fragment activation can focus it without adding it to the normal tab order.
- The import now explicitly verifies the applied summary, full description and
  technology values. All subsequent lifecycle steps and original assertions
  remain, including draft privacy, preview, successful/blocked/failed embeds,
  focus restoration, direct publish, manual credit privacy, no student records,
  discovery, access grant/revoke, archive/restore, overflow and revoked access.

There are no sleeps, removed assertions, forced skip-link focus, student account
requirements, approval gates, authentication changes or fixture transport changes.

## Fixture and remaining flow checks

The existing `tests/fixtures/github-fetch.mjs` preload handles both
`/repos/qa/xr-studio` and `/repos/qa/xr-studio/languages`. Its public metadata,
canonical repository identity, description and language map satisfy the admin
importer's schema. The description supplies both required publication narrative
fields; the test supplies the fallback and HTTPS embed URL. No homepage or
timestamp is required. The actual preload, importer and content validation were
run together successfully, without GitHub network access. No fixture payload
change was needed.

Static inspection found compatible preview/editor return URLs, manual credit
serialization, access request fields and archive/restore buttons. These checks
do not establish runtime success of the remaining lifecycle steps.

## Worker validation

Used Node 22.23.4 (the host's default Node 18 is below the project requirement),
with dependencies installed from the existing local npm cache using
`npm ci --ignore-scripts --offline --cache /tmp/immxrsive-admin-npm-cache --no-audit --no-fund`.
Commands below assume Node 22.12+ on PATH.

```sh
npm run typecheck
node node_modules/eslint/bin/eslint.js src/admin/AdminShell.tsx src/admin/Editor.tsx tests/browser/admin-onboarding.spec.ts
node node_modules/vitest/vitest.mjs run tests/frontend/admin-onboarding.test.tsx tests/unit/admin-policy.test.ts
DATABASE_URL=postgresql://localhost/immxrsive_dev_browser_check TEST_DATABASE_URL=postgresql://localhost/immxrsive_test_browser_check node node_modules/@playwright/test/cli.js test tests/browser/admin-onboarding.spec.ts --list
git diff --check
```

All passed: 43 unit/frontend tests; Playwright discovered both cases on both
viewport projects (four cases total). The database URLs in the listing command
are placeholders only; `--list` did not connect to PostgreSQL or run the browser.

The actual fixture compatibility check used:

```sh
node --import=./tests/fixtures/github-fetch.mjs --import=tsx --input-type=module <<'JS'
import assert from "node:assert/strict";
import { adminGitHubSuggestions } from "./src/admin/github.ts";
import { adminContentSchema, emptyContent, publicationIssues } from "./src/admin/policy.ts";
const suggestions = await adminGitHubSuggestions("https://github.com/qa/xr-studio");
assert.equal(suggestions.title, "XR Studio Suggestions");
assert.equal(suggestions.summary, "Public repository metadata for deterministic QA.");
assert.equal(suggestions.description, suggestions.summary);
assert.deepEqual(suggestions.technologies, ["TypeScript", "CSS"]);
assert.equal(suggestions.originalRepository, "https://github.com/qa/xr-studio");
const { updatedAt, ...fields } = suggestions;
const content = adminContentSchema.parse({
  ...emptyContent, ...fields,
  originalRepository: "https://github.com/synthetic/admin-00000000-0000-4000-8000-000000000000",
  demoMode: "embed", liveUrl: "https://demo.example.com/experience",
  fallbackText: "Synthetic fallback description of the experience.",
  credits: [{ name: "Descriptive creator", role: "Developer", statement: "", profileId: "" }],
});
assert.deepEqual(publicationIssues(content), []);
console.log("Actual browser fixture and lifecycle content validation passed.");
JS
```

## Coordinator verification still required

No configured PostgreSQL test database, production `.next` build or installed
Playwright browser was available in this snapshot. No browser execution or
database integration success is claimed. The coordinator owns integration and
Windows/PostgreSQL acceptance. With the established isolated database environment
loaded, run the production build through `ld` and then the focused browser cases:

```sh
# Heavy production build: execute through the coordinator's lab-dispatch/ld workflow.
npm run build
# On the coordinator's Windows/PostgreSQL acceptance environment, using that build:
npx playwright test tests/browser/admin-onboarding.spec.ts --project=desktop --project=mobile-390
```

The focused command retains both signed-out and complete lifecycle cases. Keep
the Playwright trace on any failure so the active element and readiness state can
be inspected. No commit, push, production write or additional worker job was made.
