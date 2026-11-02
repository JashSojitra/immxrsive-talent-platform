# Release 3 known issues and release gaps

Date: 2026-11-01. No failing acceptance test was found in fresh Phase 7 QA. This is not exhaustive security or device certification.

Mandatory release gaps:

- R3 remains uncommitted. Current HEAD is an R2 baseline, not the assessed R3 artifact. No public R3 deployment or deployed SHA was verified.
- `R3-submission` does not exist; R1/R2 tags are preserved.
- The latest official `evaluation_adapter_template.json` is absent. Only the R1 template is available locally. The R3 extension is provisional and must be reconciled before submission.
- Two consenting real verified accounts, a persistent public shared project, a public working demo/fallback and a real public-repository import demonstration must still be established on the assessed deployment. Removed disposable accounts/IDs are not production evidence.
- Production OAuth, affiliation email delivery, environment configuration, Supabase privileges and migration results were deliberately not contacted or verified.

Intentional limits:

- Import uses unauthenticated public GitHub metadata with bounded requests and handled upstream errors. Private/missing/rate-limited repositories do not block manual creation. Automated upstream responses are deterministic mocks; a real public import demonstration remains outstanding.
- Exact repository matching is authoritative for warnings. Optional title similarity checks up to 250 public same-domain candidates. No automatic merging, contributor inference or automatic skill inference occurs.
- Declines remain recorded. Automatic resend/reopening, multiple simultaneous roles, full audit-history UI, hard deletion and universal XR support are outside required scope.
- Embedding is restricted to reviewed providers and the immutable course fixture. Other safe URLs launch externally. Cross-origin load events cannot establish runtime health; independent fallback is always needed.
- Browser validation used Chromium desktop and 390px. Keyboard/focus, reduced motion, overflow and selected screenshots were checked. Physical devices, Firefox/Safari and a formal screen-reader audit remain unverified.

Observed diagnostic: Next logged `The destination stream closed early` during some browser navigations, as in previous phases. All browser assertions passed, including R3 journey no-page-errors assertions. No timeout, worker stall or teardown hang reproduced. Investigate if controlled deployment reproduces user-visible failures; no unrelated configuration was weakened here.

Five browser skips are desktop instances of 390px-only assertions. All mobile-390 counterparts passed; see the [exact case catalog](release-3-qa-results.json).
