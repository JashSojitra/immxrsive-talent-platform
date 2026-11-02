# Release 3 Phase 6 — playable demos and resilient evidence

Date: October 31, 2026. Branch: `feat/release-3`. Result: implemented and ready for review. Final complete verification passed; final Release 3 QA is unblocked after review. No deployment or final release claim is made.

## Implemented experience

Public project pages now have a dedicated experience section, with separate Play Demo / Launch Experience, Watch Demo, View Source, and View Fallback actions when those types are supplied. The canonical project, editor, repositories and Phase 3 typed media schema remain authoritative; no migration or new mutation API was needed. Legacy supplied links remain intact, including the intentionally broken P07 link. Generic historical `demo` links are not silently reclassified as playable content.

No iframe exists until visitor launch. The player uses `sandbox="allow-scripts"`, with no same-origin, forms, popups, downloads, top-navigation, pointer-lock or storage-access privileges. Camera, microphone, geolocation, payment, USB, fullscreen and XR spatial tracking are not granted. The frame has a descriptive title and no-referrer policy. It receives a URL, never student-authored HTML, script, iframe markup or `srcdoc`.

Embedding is limited to the reviewed course demo and static hosting providers: subdomains of `github.io` and exact `html-classic.itch.zone`. Other validated HTTPS experiences retain explicit external launch. Application pages cannot be embedded through this control. The reviewed static fixture is also protected by a response CSP with scripts/styles authorized by hashes of the supplied inline code, no network connections, no forms/objects/base URL, `frame-ancestors 'self'`, and a scripts-only sandbox. Application project/profile/student/API pages deny framing. Existing application scripts/motion are not subjected to a new incompatible blanket script policy.

An iframe navigation/load event never reports success. The UI says navigation finished but does not confirm a working demo. A frame still loading after ten seconds gets uncertain slow/blocked/unsupported guidance. Retry replaces the frame, Stop removes it and returns keyboard focus to launch, and timers are cleaned up on stop/retry/unmount. There is no server availability probe, cross-origin DOM health check or untrusted readiness message. These choices follow the [documented iframe limitations and sandbox guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Fallback descriptions, image/video/link evidence and external launch remain outside the frame lifecycle. Missing images or unplayable videos retain their description, original link and other evidence. Public images load directly in the visitor's browser using unoptimized images; arbitrary evidence URLs are not sent through the server image optimizer. Videos have native controls, no autoplay, inline playback and `preload="none"`; primary video elements are created only after Watch Demo. Video portal URLs can be opened externally when they are not directly playable files.

The new section reuses the existing palette, expressive typography and responsive layout. Native controls have visible focus and touch sizes, long content wraps, and reduced motion is supported. The existing GSAP page owner now observes page-height changes and schedules a refresh when media/player dimensions change; its observer, scheduled frame and GSAP context are disposed together. No expensive interactive runtime is requested before visitor intent.

## Static hosting and URL validation

The professor's originals remain unchanged and are copied byte-for-byte to:

- `public/fixtures/r3/working_demo.html` → `/fixtures/r3/working_demo.html`
- `public/fixtures/r3/fallback.svg` → `/fixtures/r3/fallback.svg`

Validation permits only those two exact reviewed relative evidence paths, alongside safe public HTTPS URLs. Arbitrary relative paths, protocol-relative URLs, unsafe schemes, local/private literal addresses, local hostnames, credentials and custom ports remain rejected. There is no general localhost/test exception in application validation. The editor's media URL field accepts these paths and explains them. Repository validation still rejects relative fixture paths.

Typed fallback descriptions now pass through the existing public asset projection as optional `altText` when nonempty. Existing fields remain unchanged; legacy responses are unchanged. Published-project gating remains in the shared public projection and metadata lookup. Unpublishing removes project media from public API/HTML and all portfolio evidence. Removed memberships do not expose that project's media through the removed student's portfolio. The model has no whole-project removal feature; project public removal is unpublication, while contributor removal remains the Phase 4 reversible relationship action.

## Files changed in this phase

The much larger uncommitted diff contains preserved prior phases. This list is Phase 6 only.

| Files | Purpose |
| --- | --- |
| `src/components/project-detail/ProjectDemo.tsx` | Lazy sandbox player, separate actions, uncertain status, retry/stop and resilient fallback/video controls |
| `src/components/project-detail/project-demo.module.css` | Premium responsive experience presentation, focus and reduced-motion rules |
| `src/components/project-detail/ProjectDetailView.tsx` | Integrates the experience section and resets its lifecycle when project evidence changes |
| `src/components/project-detail/ProjectDetailMotion.tsx` | Resize-aware GSAP refresh and lifecycle cleanup |
| `src/projects/evidence-url.ts` | Shared browser/server evidence URL and embed-provider policy |
| `src/projects/validation.ts` | Safe public URL validation plus exact hosted fixture paths |
| `src/projects/public-evidence.ts`, `src/db/queries/project-detail.ts` | Optional public descriptions for typed media |
| `src/components/project-editor/ProjectEditor.tsx` | Relative fixture media entry and explanatory help |
| `next.config.ts` | Application framing protection and restrictive reviewed fixture response headers |
| `public/fixtures/r3/working_demo.html`, `fallback.svg` | Unmodified public static copies |
| `tests/frontend/project-demo.test.tsx`, `tests/unit/project-evidence-url.test.ts` | Lifecycle, policy, type-only media, unsafe URLs, copy integrity and failure UI tests |
| `tests/integration/project-demo-api.test.ts` | Typed media persistence/publication/removal privacy and independent media types |
| `tests/browser/project-demo.spec.ts` | Real supplied demo interaction, security, failures, privacy, desktop and 390px workflow |
| `scripts/verify-project-demo.mjs` | Bounded full disposable verification including prior phases |
| `docs/release-3-phase6-verification.md` | This report and release evidence reproduction |

No database schema, journal, SQL migration, historical snapshot, release submission/adapter, production infrastructure or release tag was changed in Phase 6. New public paths are static resources; project/API routes remain the existing canonical routes.

## Official R3.18–R3.23 acceptance mapping

| Official requirement | Implemented evidence |
| --- | --- |
| R3.18 Add Demo | Separate optional playable/video/source links, repository links and fallback types; playable-only, video-only, source-only, fallback-only and mixed evidence remain valid |
| R3.19 No Arbitrary Embed Code | Strict structured schemas, shared URL validation, fixed iframe construction, scripts-only sandbox and no injected HTML/srcdoc |
| R3.20 Visitor Action | Explicit launch/external access, no automatic iframe or video runtime load |
| R3.21 Fallback Evidence | Image/video/link and meaningful descriptions remain available independently; official SVG and missing-image recovery tested |
| R3.22 Broken Demo Isolation | Unavailable DNS response, actual browser frame denial headers and slow load simulations; retry/stop/external access; content/profile/navigation remain available |
| R3.23 Mobile Project Page | Exact 390px layout, usable controls, roles/evidence, no horizontal overflow, keyboard interaction and reduced motion |

R3.24–R3.26 and cumulative R1/R2 regression coverage are retained. Phase 3 creation/publication, Phase 4 consent/ownership/transfer, and Phase 5 import/duplicates/joining remain in the complete matrix.

## Disposable database and migration verification

All database work used newly created Docker PostgreSQL 18.6 instances with dedicated random credentials, unique names/run labels/cluster identity, tmpfs data and localhost-only ports. Every database variable in migration/build/test/server processes was explicitly overridden. The runner verifies exact container ID/label/binding plus database, user, server port 5432 and cluster before migration/test operations. No development/production/Supabase connection was used and no credentials were printed.

| Run | Container / cluster | Container ID | Local binding |
| --- | --- | --- | --- |
| Initial complete verification | `immx-phase6-93aaed09119e` | `f2a9a56fa5e90c63fa8ac559299e4e6403770aeb7ada1a48fb76629543c56127` | `127.0.0.1:61630` |
| Final verification | `immx-phase6-e82993fed649` | `ea1b2a046e4b2f6dd28c793959a446a015d6eefe285f904ec46da5cbe6e877bd` | `127.0.0.1:55218` |

Final user/database prefix is `phase6_e82993fed649`; separate databases end in `_fresh`, `_upgrade`, `_guard`. Image ID is `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`.

Fresh 0000–0010 migration completed with eleven journal entries. A separate populated pre-0010→0010 rehearsal preserved full snapshots of legacy data and account-owned projects, profile, accepted membership, repository, versioned personal statement and visibility. Legacy ownership remained null; account ownership/version stayed unchanged; project-only and UUID inquiry protections remained valid. Existing live RLS/client privilege tests also ran. There is no new Phase 6 migration.

## Test commands, results and observed failures

```powershell
npm run typecheck
npm run lint
node node_modules/drizzle-kit/bin.cjs check
git diff --check
node --import tsx scripts/verify-project-demo.mjs --run-disposable
```

The runner performs identity checks, migration rehearsals, seven targeted integration files and four existing API regression files, production build, all unit/frontend tests and the complete Playwright matrix. Tests use a bounded single worker. GitHub transport remains deterministically mocked by the existing test-only preload. No normal environment file was modified. Browser failure simulations intercept safe external HTTPS URLs; they do not make live availability or provider-compatibility claims.

| Check | Actual final result |
| --- | --- |
| Typecheck / lint | Passed |
| New focused frontend/policy tests | 15 passed |
| Media + prior-phase domain/security/inquiry integration | 82 passed in seven files |
| Directory/profile/project/private-profile API regression | 63 passed in four files |
| Production build | Passed |
| Full unit/frontend | 230 passed in 31 files |
| Full desktop and mobile browser matrix | 125 passed, five intentional skips, 130 entries; 4.2 minutes |
| Drizzle metadata / historical migration / diff inspection | Passed; existing Git LF/CRLF informational warnings only |

The initial complete run passed 145 database/API tests, 228 unit/frontend tests and 123 browser tests, but failed both existing manual-project journeys because a new fallback link duplicated their accessible link-name match. Both new demo journeys already passed the actual fixture counter, parent DOM isolation, failure, layout and privacy assertions. The fix distinguishes new evidence controls while retaining legacy links and the existing Phase 3 test assertion. The final run also includes the reviewed provider policy, hash-authorized fixture CSP and media-resize cleanup. No test was weakened to obtain a pass.

Final totals: **145 database/API tests, 230 unit/frontend tests and 125 browser tests passed; five intentional skips**. The five skips are existing 390px-only cases skipped in the desktop project. There were no final test failures, selected integration/unit skips or command timeouts. Both new demo journeys passed without browser page errors. The actual fixture reached `Interactions: 2`, retry restored `Ready.`, and parent access to the sandbox document was denied. The provided SVG loaded with nonzero natural image dimensions. Screenshots were visually inspected at desktop and 390px. Final visual polish corrected the experience chapter label to 01; typecheck/lint were rerun after that text-only change.

Both containers and their disposable data were removed by exact verified run label/ID. Post-run Docker inventory confirmed none of this task's labeled containers remained. The final driver hash-checked 94 pre-existing untracked inputs and all SQL migrations unchanged. Planning-document and Phase 1 migration hashes matched the prior recorded values. Sanitized commands/results remain in `tmp/phase6-verification-last.log`; initial failure evidence remains in `tmp/phase6-verification-attempt1.log`. Screenshot paths: `test-results/project-demo-official-play-7de3c-navigation-survive-failures-{desktop,mobile-390}/demo-fallback.png`.

Known regression-server observation: Next can log `The destination stream closed early` during navigation, as in earlier phases. This is recorded separately from the new browser journey's no-page-errors assertion. Browser iframe error/load events cannot conclusively diagnose remote health; UI text remains uncertain. Real video codecs, device-specific XR support, every provider's embedding policy and hostile-runtime CPU behavior are not certified by these simulations.

## Release evidence preparation and independent reproduction

Planned public URLs, based on the deployment origin documented in `release_submission.md`:

- `https://immxrsive-talent-platform.vercel.app/fixtures/r3/working_demo.html`
- `https://immxrsive-talent-platform.vercel.app/fixtures/r3/fallback.svg`

These are deployment-compatible planned URLs, **not verified live Phase 6 URLs**. No production fetch or deployment was performed. Relative stored evidence paths will follow the eventual deployment origin and also work on previews.

QA project: **R3 Demo and Fallback QA**, description “Playable fixture with independent resilient evidence”, domain XR, technologies HTML/JavaScript, standard role XR Developer. Browser tests create an account-owned canonical project with this title in each disposable database; the assigned ID is recorded in its `disposable-qa-project` Playwright attachment. Final-run temporary QA IDs were `44605b3d-0923-4d72-b5db-f75c2f7dd544` (desktop) and `0b53c245-8f92-4d53-b550-699635bc936e` (390px), also visible in the QA screenshots. Those temporary records are removed, and their IDs are not deployed release evidence. A verified maintainer can reproduce the project through Add Project with:

1. Playable URL `/fixtures/r3/working_demo.html`, label “Course interactive demo”.
2. Fallback image `/fixtures/r3/fallback.svg`, label “Course fallback”, description “Alternate evidence for the interactive course fixture”.
3. Optional video, source and written fallback evidence supplied independently. Save/preview, then explicitly publish and record the assigned permanent canonical URL.

Independent QA: open the public project; confirm no iframe before launch; activate Play Demo by keyboard; focus Interact inside the supplied frame and press Enter/click twice; the actual supplied status must read `Interactions: 2`. Retry should restore `Ready.`. Stop removes the frame and returns focus to launch. View Fallback should focus the independent fallback region and display the SVG/description. Open Externally provides another access path. At 390px and with reduced motion, repeat without losing content, role evidence or navigation. Unpublish and verify public API 404/no private media in HTML or portfolios.

For deterministic failures, the browser test aborts an allowed-provider request with a DNS-style failure, serves a response with X-Frame-Options DENY/CSP frame-ancestors none, delays a response for twelve seconds, and returns a fallback SVG 404. These exercise real browser transport/policy/error handling without proving a particular live provider is currently down or frameable. The professor fixture itself is served from the actual public static file and is not substituted with mocked HTML or a screenshot.

Final Release 3 QA is unblocked after review; no concrete implementation blocker was found. Release evidence still needs authorized deployment/live URL verification, the actual two-human shared project and public GitHub import example, final submission/adapter/notes and assessed tag. No commit, push, deployment or tag has been performed. Existing authorship, HEAD, R1/R2 tags, prior work, original fixtures and planning documents remain preserved.
