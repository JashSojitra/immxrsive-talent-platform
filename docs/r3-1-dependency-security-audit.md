# R3.1 dependency security audit — 2026-11-14

## Local follow-up on 2026-11-15

The [final Windows validation report](r3-1-dependency-validation-final.md) records fresh evidence for the exact dependency patch on original HEAD `5b9803b12b8ac7bc6335caf81446d44324a9149c`. Ordinary locked install, both zero-vulnerability audits, dependency graph, production build, migrations, typecheck, lint, 200 unit, 100 frontend, 179 integration and 135 browser tests passed. The 614-test matrix has zero failures/flakes and five intentional desktop exclusions whose mobile cases passed. Both disposable containers were cleaned up. **The local dependency gate is GO for the reviewed commit and PR update.** Historical worker observations below retain their original scope and dates.

Independent review found zero blocking defects. For GHSA-39w2-rjm5-chcv, installed Next 16.4.6 executes its `/_next/mcp` origin guard before MCP middleware. Five assertions verified three hostile-browser denials and two legitimate request cases. The remaining five incomplete advisory records lack the described source/configuration prerequisites. Candidate-specific mitigation and non-exposure dispositions close the local investigation. The vendor's numeric patch field remains a metadata follow-up. Hosted runtime and manual operational release gates remain in the release-readiness checklist.

## Historical worker assessment on 2026-11-14

The worker disposition was conditional pending the local follow-up above. The locked tree had zero npm-reported critical, high or moderate entries and included maintainer-only fixes. It still required complete Windows, database, production build and browser validation. The six incomplete Next records required candidate-specific investigation, now recorded in the follow-up.

Scope: ImmXrsive Talent Platform, `feat/r3-1-xr-studio`, supplied original baseline `5b9803b`, PR #9 targeting `main`. This is a sanitized worker snapshot on dilab-5080; its transport Git SHA is not source drift. No commit, push, GitHub write, deployment, real credentials, database connection, migration or production configuration change was made. Application source and security tests are byte-unchanged.

## Counts and evidence

Counts below are affected-package entries, including inherited dependency-chain entries, not unique CVEs, distinct advisory IDs or proven exploits.

| Audit | Critical before → after | High before → after | Moderate before → after | Total before → after |
| --- | --- | --- | --- | --- |
| Full `npm audit --json` | 1 → 0 | 3 → 0 | 15 → 0 | 19 → 0 |
| `npm audit --omit=dev --json` | 1 → 0 | 3 → 0 | 7 → 0 | 11 → 0 |

The historical 11 count reproduces with `--omit=dev`; the fresh full audit finds 19. Both raw before/after JSON pairs are in [dependency-audit](dependency-audit/). The baseline lock marks some tooling chains in the production audit even though source and dependency-parent inspection show development-only use; omission flags alone are not a reachability proof. npm recalculated lockfile dependency classifications during resolution. A zero count does not cover unpublished findings, Node's bundled HTTP implementation, vendored framework code or maintainer advisories absent from the npm feed.

[locked-inventory.csv](dependency-audit/locked-inventory.csv) records every before/after locked path/version, final dev/optional flags and actual installed Linux version where present. An empty installed version denotes an omitted platform/optional package or a removed/relocated baseline path. Baseline versions are established from the supplied lockfile: no baseline `node_modules` was present to inspect. [lock-changes.csv](dependency-audit/lock-changes.csv) enumerates all version/path changes, including platform binaries and relocated auth core.

## Snapshot and workflow limits

The snapshot includes manifests, Next/Vitest/ESLint/TypeScript/Playwright/Drizzle configuration, source, migrations through 0011, security/release documentation, safe Windows runner and all four resume PDF fixtures. No `.github` CI directory, `vercel.json`, Vercel project linkage/settings, installed baseline dependencies, private environment files or disposable PostgreSQL infrastructure was supplied. Hosted Node selection, deployed dependency versions, production exploitability and bundle output cannot be inferred as verified.

No local AGENTS.md, MEMORY.md, specialist directory, or user-level service-use/research-explorer/codex-remote/subagent-use skill was available in the snapshot/accessed worker skill locations. Public npm registry and GitHub advisory reads were used; no paid LLM API was called. Service trace for this job: dilab-5080 / Codex worker / R3.1 dependency gate / unauthenticated public registry and GitHub security metadata / read-only audit and package retrieval / successful, with global GHSA API 404s for several new records resolved through the repository advisory API and maintainer pages. No service credentials were loaded. Automated service-log delivery/check was unavailable without its skill/script.

System Node 18.19.1 was unsuitable. Final project commands used Node **22.22.0**, npm **10.9.4**, via `PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH`. Temporary npm caches and original-manifest archives remained under `/tmp/imm-deps-evidence` and `/tmp/imm-deps-cache`. No system environment was altered.

## Direct changes and compatibility

| Direct package | Locked before | Locked after | Minimum security fix / rationale |
| --- | --- | --- | --- |
| `next` | 16.3.8 | 16.4.6 | 16.4.1 for October RCE/DoS; 16.4.5 for November maintainer advisories |
| `eslint-config-next` | 16.3.8 | 16.4.6 | Align lint rules/plugin with the framework release |
| `better-auth` | 1.7.7 | 1.7.16 | 1.7.16 for newly published OAuth/session/plugin fixes outside npm feed |
| `@better-auth/drizzle-adapter` | 1.7.7 | 1.7.16 | 1.7.16; align direct adapter with Better Auth and fix MySQL identifier-return path |
| `nodemailer` | 10.1.0 | 10.5.0 | 10.1.4 for all three address-parser advisories |
| `zod` | 4.6.5 | 4.6.7 | 4.6.6 for constrained collection memory exhaustion |
| `vitest` | 5.0.2 | 5.1.0 | 5.0.3 for mock registration and Windows traversal fixes |

Only security-related direct packages changed; they are pinned exactly for review and reproducibility. Next/config move within major 16; auth within 1.7; Nodemailer within 10; Zod within 4; Vitest within 5. Compatible minor/patch releases were selected within those families, rather than updating all dependencies. Vitest 5.1.0 requires obug 3 (a transitive major); its new peer/tooling requirements pass install, typecheck and selected tests. Next SWC/env/lint platform companions update together. Vite 8.3.1 → 8.3.8 (minimum fixed 8.3.3), Undici 7.30.0 → 7.30.2 (minimum 7.30.1), plus required toolchain children update in the lockfile. The complete exact transitive/platform list is in the CSV.

Runtime packages unchanged: React and React DOM **19.3.0/19.3.0**, Drizzle ORM **0.45.3**, postgres **3.4.9**, pdfjs-dist **6.4.299**, Resend **6.32.1**, dotenv **18.0.4**, GSAP **3.15.0**. React versions satisfy Next's declared peer ranges. Next requires Node >=20.9; Vite accepts >=22.12; final install reports no engine/peer failures under 22.22.0. Drizzle Kit remains 0.31.11; ORM and database schema are untouched.

The direct Better Auth and Drizzle adapter both pin 1.7.16. Its bundled adapter/telemetry family resolves 1.7.16, while peer resolution hoists `@better-auth/core` **1.7.25** and nests core **1.7.16** under Better Auth. Both satisfy declared ranges; `npm ls --all` exits 0. The independent reviewer identified this duplication as nonblocking. It is documented rather than forcing another global override without a demonstrated compatibility need. Do not describe every auth-family node as one version. Exact OAuth/session/database behavior still needs integration/browser verification.

### Scoped overrides

The pre-existing `source-map-js: 1.2.2` override is retained. No patch-package mechanism or dependency patches were found.

- `@esbuild-kit/core-utils → esbuild: 0.25.12` replaces 0.18.20. Minimum fixed is 0.25.0. This crosses esbuild's pre-1.0 compatibility boundary, narrowly scoped to Drizzle Kit's deprecated loader chain. The consumer uses retained `transform`/`transformSync` APIs, not a serving API. Both actual consumer methods were smoke-tested; Drizzle Kit version loading passed. Full disposable migration tooling verification remains required. npm's proposed downgrade to Drizzle Kit 0.18.1 would be disruptive and was rejected.
- `@typescript-eslint/typescript-estree → minimatch: 11.0.1` replaces 10.2.6. This is a scoped transitive major because no fixed TypeScript-ESLint release was published (latest checked: 8.72.2, itself in the inherited affected range). The caller uses the preserved named `minimatch(path, pattern, {dot:true})` interface. Node 22 satisfies minimatch 11's engine. Real lint and include/exclude smoke checks passed. Remove this override when a supported upstream release adopts the fix. npm's suggested downgrade of eslint-config-next to 15.5.29 was rejected.

No `npm audit fix --force`, `--legacy-peer-deps`, audit suppression, test weakening or framework major upgrade was used. Initial npm attempts to narrow versions and update the auth peer graph hit resolver `edgesOut`/ERESOLVE errors. A temporary doubled-caret range during a failed narrowing attempt caused EINVALIDTAGNAME and was corrected before final resolution. The aligned auth graph was recalculated in an isolated temporary manifest/lock copy with only stale auth-family lock nodes removed for npm to regenerate. Final ordinary `npm ci` and `npm ls --all` both succeed; no unresolved manifest/lock inconsistency remains.

## npm advisories: every affected leaf

Each row links to authoritative advisory metadata; installed versions are baseline locked versions. All rows are fixed in the final lock. Runtime/directness, reachable usage and residual limits follow in the exposure section. Minimum fixes are advisory-specific; newer compatible selected versions appear above/in the inventory.

| Package / installed | Severity | Advisory and issue | Affected range | Minimum fix |
| --- | --- | --- | --- | --- |
| @vitest/mocker 5.0.2 | moderate | [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) — Vitest: Code injection via unauthenticated manual mock registration | `>=5.0.0-beta.1 <5.0.3` | 5.0.3 |
| @vitest/mocker 5.0.2 | moderate | [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp) — Vitest: Windows backslash traversal bypasses the @vitest/mocker redirect allowlist fix | `>=5.0.0-rc.2 <5.0.3` | 5.0.3 |
| esbuild 0.18.20 | moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — esbuild enables any website to send any requests to the development server and read the response | `<=0.24.2` | 0.25.0 |
| minimatch 10.2.6 | moderate | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) — minimatch has potential denial of service via globparts amplification | `>=7.0.0 <11.0.1` | see advisory |
| next 16.3.8 | critical | [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) — Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used | `>=16.0.0 <=16.4.0` | 16.4.1 |
| next 16.3.8 | high | [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) — Next.js: Denial of Service in App Router using Server Actions | `>=16.0.0 <=16.4.0` | 16.4.1 |
| next 16.3.8 | critical | [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) — Next.js: Unauthenticated Remote Code Execution in `use cache` functions returning typed arrays | `>=16.0.0 <=16.4.0` | 16.4.1 |
| nodemailer 10.1.0 | moderate | [GHSA-8c8m-p3m8-cjg8](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8) — Nodemailer: A nested comment ends early in addressparser, releasing the rest of the comment as a recipient | `>=3.0.0 <10.1.4` | 10.1.4 |
| nodemailer 10.1.0 | moderate | [GHSA-m943-m63m-w62w](https://github.com/advisories/GHSA-m943-m63m-w62w) — Nodemailer: A ";" inside a quoted string or comment ends an address group early in addressparser, turning display text into a recipient | `>=3.0.0 <10.1.4` | 10.1.4 |
| nodemailer 10.1.0 | moderate | [GHSA-85x2-q946-cp5h](https://github.com/advisories/GHSA-85x2-q946-cp5h) — Nodemailer: A ">" inside a quoted local part ends an angle-addr early in addressparser, delivering to a domain the header does not name | `>=3.0.0 <10.1.4` | 10.1.4 |
| undici 7.30.0 | moderate | [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) — undici vulnerable to Denial of Service via unbounded memory in the EventSource parser | `>=7.0.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | moderate | [GHSA-f72v-6w45-q472](https://github.com/advisories/GHSA-f72v-6w45-q472) — undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens | `>=7.15.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | high | [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) — undici vulnerable to Denial of Service via unhandled error on excessive content-encodings | `>=7.18.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | high | [GHSA-4w7w-5xrc-9h26](https://github.com/advisories/GHSA-4w7w-5xrc-9h26) — undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects | `>=7.0.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | high | [GHSA-2m5v-pch6-74hx](https://github.com/advisories/GHSA-2m5v-pch6-74hx) — undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent | `>=7.0.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | high | [GHSA-qrxm-fqhp-jwvm](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) — undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation | `>=7.0.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | moderate | [GHSA-9fm3-97px-rjf6](https://github.com/advisories/GHSA-9fm3-97px-rjf6) — undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering | `>=7.0.0 <7.30.1` | 7.30.1 |
| undici 7.30.0 | moderate | [GHSA-55wc-3pg8-jfw6](https://github.com/advisories/GHSA-55wc-3pg8-jfw6) — undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor | `>=7.15.0 <7.30.1` | 7.30.1 |
| vite 8.3.1 | moderate | [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv) — launch-editor: escapeCmdArgs() omits % escaping on Windows | `>=8.3.0 <=8.3.2` | 8.3.3 |
| vite 8.3.1 | moderate | [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) — launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors | `>=8.3.0 <=8.3.2` | 8.3.3 |
| vite 8.3.1 | high | [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) — launch-editor: `fs.existsSync()` existence check can be bypassed on Windows | `>=8.3.0 <=8.3.2` | 8.3.3 |
| vite 8.3.1 | low | [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) — Vite: Cross origin script execution through Vite custom middleware | `>=8.3.0 <=8.3.2` | 8.3.3 |
| vite 8.3.1 | moderate | [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) — Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine | `>=8.3.0 <=8.3.2` | 8.3.3 |
| vite 8.3.1 | moderate | [GHSA-vfpm-58rq-9qcg](https://github.com/advisories/GHSA-vfpm-58rq-9qcg) — Vite: First 4 bytes of files outside of `server.fs` setting is exposed by `?vite-wasm-instance` | `>=8.3.0 <=8.3.2` | 8.3.3 |
| zod 4.6.5 | high | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) — Zod can exhaust memory while validating oversized constrained collections | `<4.6.6` | 4.6.6 |

### Inherited package entries

These entries have no additional independent advisory in npm's `via` array. They inherit one of the leaves above and clear with the corresponding leaf fix; none requires an independent downgrade.

| Package / baseline version | Severity | Direct? | Dependency path / fix |
| --- | --- | --- | --- |
| @esbuild-kit/core-utils 3.3.2 | moderate | no | esbuild; leaf remediated |
| @esbuild-kit/esm-loader 2.6.5 | moderate | no | @esbuild-kit/core-utils; leaf remediated |
| @typescript-eslint/eslint-plugin 8.71.0 | moderate | no | @typescript-eslint/parser → @typescript-eslint/type-utils → @typescript-eslint/utils; leaf remediated |
| @typescript-eslint/parser 8.71.0 | moderate | no | @typescript-eslint/typescript-estree; leaf remediated |
| @typescript-eslint/type-utils 8.71.0 | moderate | no | @typescript-eslint/typescript-estree → @typescript-eslint/utils; leaf remediated |
| @typescript-eslint/typescript-estree 8.71.0 | moderate | no | minimatch; leaf remediated |
| @typescript-eslint/utils 8.71.0 | moderate | no | @typescript-eslint/typescript-estree; leaf remediated |
| drizzle-kit 0.31.11 | moderate | yes | @esbuild-kit/esm-loader; leaf remediated |
| eslint-config-next 16.3.8 | moderate | yes | typescript-eslint; leaf remediated |
| typescript-eslint 8.71.0 | moderate | no | @typescript-eslint/eslint-plugin → @typescript-eslint/parser → @typescript-eslint/typescript-estree → @typescript-eslint/utils; leaf remediated |
| vitest 5.0.2 | moderate | yes | @vitest/mocker; leaf remediated |

## Confirmed application exposure and residual risk

- **Next: direct production framework / critical.** The [SVG optimizer RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) concerns glibc Linux, a relevant platform distinction for Vercel. Locked Sharp **0.35.5** already meets the maintainer workaround; image evidence uses `<Image unoptimized>` and no remotePatterns/dangerouslyAllowSVG configuration exists. This limits the identified application path but is not certification of the hosted optimizer or Linux native package. Next 16.4.6 fixes the vulnerable framework range. The [typed-array cache RCE](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) requires Cache Components and a cache function returning multiple typed arrays; neither `use cache` nor cacheComponents was found. The Server Actions DoS requires at least one action; no `use server` directive was found. These source observations reduce demonstrated reachability; upgrading is still required by the maintainer.
- **Zod: direct production input validation / high.** Imported by Studio policy, project/profile/inquiry validation, GitHub import and affiliation verification. Oversized failing collections can amplify issue allocation. Existing Studio JSON streaming size caps and schema bounds remain intact, but their protection is not universal validation-path certification. 4.6.7 removes the known vulnerable package range without changing schemas or HTTP guards.
- **Nodemailer: direct runtime, optional Gmail SMTP path / moderate.** `src/email/affiliation-verification.ts` supplies a fixed configured sender and explicit envelope recipient; affiliation validation restricts recipient inputs, reducing parser ambiguity exposure. Gmail is configuration-dependent; Resend is the default alternate path. All three parser fixes are included by 10.5.0. No live email was sent, and hosted provider selection is unknown.
- **Undici: transitive through jsdom, development/test-only / high aggregate.** No application Undici/EventSource/WebSocket/interceptor/Agent imports were found. These eight issues cover attacker-controlled remote data, TLS option handling, redirects/cache, decompression, EventSource and WebSocket buffering. Final jsdom resolves 7.30.2. This does not patch Node's bundled fetch/Undici; use a supported security-maintained Node release in each build/runtime. No production request path through npm Undici was demonstrated.
- **Vite: transitive test tooling peer of Vitest / high aggregate.** Six launch-editor/server/file-disclosure advisories need a running development server and particular requests/editor/platform conditions. The app uses Next, not a Vite production server; Vitest runs are local. Windows paths/editor invocation matter for the caller. Vite 8.3.8 fixes the affected 8.3.0–8.3.2 range. No exposed Vite server was started.
- **Vitest mocker: transitive development-only / moderate.** Manual mock registration/traversal flaws concern server/browser-mode interfaces, including Windows backslashes, rather than the deployed Next app. Vitest/mocker 5.1.0 resolves both. Selected Node/jsdom tests pass; full Windows suite is still pending.
- **esbuild: transitive development-only / moderate.** Vulnerable path: drizzle-kit → @esbuild-kit/esm-loader → core-utils → esbuild 0.18.20. The advisory is about its serve endpoint and cross-origin source disclosure. No esbuild serving application path/script was found. Transform-only consumer APIs survive the scoped update; running migration generation against a disposable checkout remains part of the tooling gate.
- **minimatch: transitive development-only / moderate.** Path: eslint-config-next → typescript-eslint → typescript-estree → minimatch 10.2.6. Advisory amplification requires attacker-controlled glob patterns and optimization level >=2. Source/config lint patterns are trusted and the observed call sets only dot:true. No runtime user-pattern input was found. Scoped major 11.0.1 resolves the known range and passes lint; future untrusted lint configs remain executable development inputs.

## Latest maintainer checks beyond npm audit

Public maintainer listings and repository security-advisory API results were checked on 2026-11-14 for [Next](https://github.com/vercel/next.js/security/advisories), [React](https://github.com/react/react/security/advisories), [Better Auth](https://github.com/better-auth/better-auth/security/advisories), [Drizzle](https://github.com/drizzle-team/drizzle-orm/security/advisories), and [postgres](https://github.com/porsager/postgres/security/advisories). Thirty latest records each were inspected for Next/Better Auth, plus relevant individual React advisories; this is bounded published-advisory coverage, not a claim to enumerate every historical disclosure.

### New Next records absent from the npm feed

All are moderate, fixed by **16.4.5**, and covered by selected **16.4.6**. They are not added to npm's affected-package count because Next already has an entry there.

| Advisory | Affected 16.x range | Application assessment |
| --- | --- | --- |
| [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) | `>= 16.0.0, <= 16.4.4` | Framing/desynchronization requires self-hosted upstream response forwarding and a pipelining proxy; no matching application proxy path found; hosted topology unverified. |
| [GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj) | `>= 16.0.0, <= 16.4.4` | Binary cache arguments; no use cache functions found. |
| [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf) | `>= 16.4.0, <= 16.4.4` | Fallback-shell poisoning; no cacheComponents or partial-prefetch setup found; baseline 16.3.8 is below its affected range. |
| [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) | `>= 16.0.0, <= 16.4.4` | Self-hosted SVG optimizer rejection bypass; remote evidence unoptimized, no configured remote image hosts. |
| [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) | `>= 16.3.0, <= 16.4.4` | Root params plus unstable_cache/use cache; no matching cache usage found. |
| [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8) | `>= 16.2.0, <= 16.4.4` | Nested use cache/root-param stream metadata; no matching cache usage found. |
| [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2) | `>= 16.0.0, <= 16.4.4` | HttpOnly cookie internal-header exposure on Edge routes; no Edge runtime configuration found. |

Six older published Next entries contain placeholder fixed versions (`16.3.?` / `15.5.?` or `16.3.?` with an open-ended affected range). A numeric patch floor cannot honestly be inferred from that metadata. They remain an explicit documentation uncertainty, not a claimed proven remaining exploit:

| Advisory / severity | Affected 16.x range; incomplete patch field | Production prerequisites / disposition |
| --- | --- | --- |
| [GHSA-3w37-wq28-93x7](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7) / medium | `16.3.0`; `16.3.?` | Draft Mode / cache-components preview race: no use cache, cacheComponents or Draft Mode found. |
| [GHSA-cjq9-62q9-8jv4](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4) / high | `>= 16.0.0 < 16.3.?`; `16.3.?` | Image remote-host SSRF: no images.remotePatterns, the advisory states that configuration is unaffected. |
| [GHSA-39w2-rjm5-chcv](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv) / low | `>= 16.0.0`; `16.3.?` | Development-server MCP disclosure: production does not serve the endpoint. Development exposure remains uncertain; do not run next dev while visiting untrusted sites or expose it to untrusted peers until vendor fixed-version confirmation. Loopback alone does not stop browser-origin attacks. |
| [GHSA-4jqv-mc3x-m676](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676) / medium | `>= 16.0.0`; `16.3.?` | Pages SSG/ISR cache poisoning: App Router application, intended Vercel host explicitly excluded by maintainer. |
| [GHSA-mcj8-r9mp-w47p](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p) / medium | `>= 16.0.0`; `16.3.?` | Root catch-all plus SSG/ISR cache poisoning: no root-level catch-all page or ISR config found. |
| [GHSA-f87g-xv8r-7p7x](https://github.com/vercel/next.js/security/advisories/GHSA-f87g-xv8r-7p7x) / medium | `>= 16.0.0`; `16.3.?` | Webpack metadata image dynamicParams bypass: no affected dynamic metadata-image route/generateStaticParams use found. |

The SSRF advisory is **high severity** with an unresolved numeric fix floor; its authoritative workaround explicitly excludes applications without `images.remotePatterns`, as is the case here. This is a configuration-based non-exposure finding, not accepted residual SSRF risk. Enabling remotePatterns before a definitive fixed-version check must block release of that change. The MCP disclosure is low severity, while the other four incomplete records are moderate.

Release owner must retain these source/config mitigations and obtain a vendor-confirmed fixed-version disposition before enabling those features or unrestricted development use. Do not reinterpret a guessed patch number as approved risk acceptance.

### Authentication/session updates absent from npm

The 1.7.16 patch addresses the following applicable package ranges. No auth plugins are configured in `src/auth/auth.ts`: GitHub social login, database sessions/state, disabled account linking, encrypted OAuth tokens and the PostgreSQL Drizzle adapter remain unchanged.

| Advisory / severity | Baseline affected range | Actual configured exposure |
| --- | --- | --- |
| [GHSA-g95c-wqvr-8c3j](https://github.com/better-auth/better-auth/security/advisories/GHSA-g95c-wqvr-8c3j) / medium | `< 1.7.16`; fixed 1.7.16 | Admin phone updates; admin/phone plugin absent. |
| [GHSA-4wq4-2ppv-q3hg](https://github.com/better-auth/better-auth/security/advisories/GHSA-4wq4-2ppv-q3hg) / critical | `< 1.7.16`; fixed 1.7.16 | Expo authorization proxy; Expo plugin/package absent, though advisory also ranges over better-auth. |
| [GHSA-9hm7-xhfp-cx58](https://github.com/better-auth/better-auth/security/advisories/GHSA-9hm7-xhfp-cx58) / medium | `>= 0.4.9, < 1.7.16`; fixed 1.7.16 | Provider verification/token-profile confusion; GitHub only, account linking disabled; Cognito/Zoom/genericOAuth absent. |
| [GHSA-48c2-w96j-mv3m](https://github.com/better-auth/better-auth/security/advisories/GHSA-48c2-w96j-mv3m) / medium | `< 1.7.16`; fixed 1.7.16 | MySQL concurrent insert-ID mixup; configured adapter uses PostgreSQL, not MySQL. |
| [GHSA-2f9c-7xj7-gh55](https://github.com/better-auth/better-auth/security/advisories/GHSA-2f9c-7xj7-gh55) / medium | `>= 1.3.7, < 1.7.16`; fixed 1.7.16 | Email OTP race/address binding; emailOTP plugin absent; own affiliation workflow is separate. |
| [GHSA-hwq2-v29r-p69r](https://github.com/better-auth/better-auth/security/advisories/GHSA-hwq2-v29r-p69r) / medium | `>= 1.4.0, < 1.7.16`; fixed 1.7.16 | Email-change token lifetime; email-change feature absent. |
| [GHSA-c85h-5mrr-mgx4](https://github.com/better-auth/better-auth/security/advisories/GHSA-c85h-5mrr-mgx4) / medium | `>= 1.5.5, < 1.7.16`; fixed 1.7.16 | Organization padded-role invitation; organization plugin absent. |
| [GHSA-fvxx-76fc-893x](https://github.com/better-auth/better-auth/security/advisories/GHSA-fvxx-76fc-893x) / medium | `>= 0.8.1-beta.5, < 1.7.16`; fixed 1.7.16 | Revoked sessions stale with cookie cache/secondary storage; neither configured; database sessions retained. |
| [GHSA-q747-mqgr-4gh7](https://github.com/better-auth/better-auth/security/advisories/GHSA-q747-mqgr-4gh7) / high | `>= 0.4.12-beta.7, < 1.7.16`; fixed 1.7.16 | Unverified phone claim; phoneNumber plugin absent. |

All those package ranges are cleared by the selected 1.7.16 release, including the phone-claim high and Expo critical classifications whose feature paths are absent. Other published SSO/Electron/Stripe/SCIM/passkey/OAuth-provider package findings concern packages not installed, or older ranges already excluded by 1.7.7. [OAuth state account takeover](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) and [PostgreSQL rate-limit concurrency](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf) already had minimum fix 1.7.7 and remain fixed.

### React, ORM and HTTP boundaries

[React RSC typed-array RCE](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3) and [Server Function DoS](https://github.com/react/react/security/advisories/GHSA-h3gv-c5rc-p453) target `react-server-dom-*` (19.3 branch fixed at 19.3.1), not the ordinary React/React DOM packages. The app consumes Next's vendored RSC implementation. Next's corresponding cache/action advisories prescribe 16.4.1; selected 16.4.6 is beyond it. Do not install a separate react-server-dom package or claim changing plain React alone patches Next. The vendored package's peer canary label is not independent proof of patch presence; framework maintainer release guidance is the basis here, with build/browser verification still required.

[Drizzle identifier injection](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9) is fixed at 0.45.2; supplied 0.45.3 already excludes it. postgres's maintainer page had no published advisories; npm reports none for postgres 3.4.9. This is not proof of absence of unknown driver defects. Existing SQL transaction/row-lock/RLS protections and six Studio concurrency regressions were not modified. HTTP handlers, JSON caps, CSRF/origin checks and cache headers remain unchanged. npm Undici advisories above are distinct from Vercel/Node HTTP runtime maintenance.

## Vercel/runtime compatibility

[Official Node guidance](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) lists 22.x/24.x/26.x and says a broad `>=22` engine resolves to the latest available major. Existing `node: >=22.12.0` was preserved; do not assume Vercel will use tested 22.22.0 just because that version passes here. Verify the actual project runtime/build major and validate it through ld (currently the published broad-range mapping is 26.x), or review a separate deliberate engine-pin change before deployment. No hosted setting was accessed/changed.

Next 16 remains Vercel's native framework family; peer/engine install and TypeScript/import checks pass, with React/DOM alignment preserved. PDF.js stays external with its existing worker tracing include. Server/client bundling, native Linux Sharp loading, generated route output and runtime execution were not certified because no production build was authorized on this memory-limited worker. Build and native-function smoke through ld are required. No compatibility repair to application source was necessary based on performed checks.

## Actual validation on final dependencies

All final commands below exit 0, unless explicitly marked not run. No database environment was loaded. The previous Windows 614-test pass belongs to the old dependency tree and is not credited to this patch.

| Command | Actual result |
| --- | --- |
| `npm ci --no-audit --no-fund --cache /tmp/imm-deps-cache` | 0; lifecycle scripts enabled, reproducible locked install, no manifest/lock mutations; 500 packages on final tree |
| `npm audit --json --cache /tmp/imm-deps-cache` | 0; zero vulnerabilities |
| `npm audit --omit=dev --json --cache /tmp/imm-deps-cache` | 0; zero vulnerabilities |
| `npm ls --all --json` | 0; valid declared dependency/peer graph |
| `npm run typecheck` | 0; no TypeScript errors after final auth update |
| `npm run lint` | 0; no lint errors/warnings |
| `node node_modules/vitest/vitest.mjs run tests/unit/studio-http.test.ts tests/unit/studio-policy.test.ts tests/unit/project-evidence-url.test.ts tests/unit/database-security-hardening.test.ts tests/unit/database-safety.test.ts tests/unit/auth-config.test.ts tests/unit/affiliation-verification.test.ts tests/unit/student-profile-validation.test.ts tests/unit/project-validation.test.ts tests/unit/inquiry-validation.test.ts tests/unit/resume-extraction.test.ts` | **112 passed**, 11 files, no failures/skips; actual resume PDFs included |
| `node node_modules/vitest/vitest.mjs run tests/frontend/studio-review.test.tsx tests/frontend/project-editor.test.tsx tests/frontend/student-auth.test.tsx tests/frontend/student-sign-in-page.test.tsx tests/frontend/affiliation-verification.test.tsx tests/frontend/project-demo.test.tsx tests/frontend/resume-import.test.tsx` | **31 passed**, 7 files, no failures/skips |
| Actual core-utils async/sync TypeScript transform + minimatch include/exclude smoke using `node --input-type=module` | 6 assertions passed; preserves callers' used APIs |
| `node node_modules/drizzle-kit/bin.cjs --version` | 0; Kit 0.31.11 / ORM 0.45.3 loaded |
| `npm run test:unit`, `npm run test:frontend`, complete `npm test` | Not run in full; worker limits require targeted selections only |
| `npm run build`, migration generation/full integration/browser suites | Not run; dispatch heavy checks through ld, only verified fresh disposable database infrastructure |

Install emits existing deprecated esbuild-kit loader/core-utils warnings and ESLint 9 end-of-support warning. They are maintenance work, not reported advisories, and do not justify an untested ESLint major upgrade in this patch. Full tests are still needed for runtime session semantics and bundle behavior.

## Windows handoff / PR #9

1. Keep the existing `feat/r3-1-xr-studio` branch; inspect worktree status and unrelated changes. Verify caller baseline `5b9803b` (the sanitized transport SHA differs). Update through the caller's normal branch sync procedure before applying, preserving unrelated work. Review the returned transport patch; the secondary patch is `/tmp/imm-deps-evidence/r31-dependency-security.patch` on this worker.
2. In Git Bash, from the original repo: `git apply --check /path/to/r31-dependency-security.patch`, then `git apply /path/to/r31-dependency-security.patch`. If the job transport already applied the patch, do not apply it a second time; use `git apply --reverse --check /path/to/r31-dependency-security.patch` and inspect the ten changed files instead. Never apply both transport and secondary patches.
3. With supported project Node (worker tested 22.22.0), run `node --version`, `npm --version`, `npm ci`, `npm audit --json`, `npm audit --omit=dev --json`, `npm ls --all`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:frontend`. Persist actual counts and audit JSON; stop for install/peer/audit/test failures. Full tests should retain the established 200-unit/100-frontend cases unless the runner's reporting changes; do not invent results or alter tests to match a count.
4. Dispatch production build and the safe complete regression matrix through the owning `lab-dispatch` skill and **ld**. Use an isolated snapshot and fresh disposable PostgreSQL only, matching the existing safe Windows runner's guards; include all six Studio transfer/revocation concurrency cases, migration byte/journal checks, all integration/browser cases, desktop/mobile exclusions and resume extraction. The repository's Windows command is `pwsh -NoProfile -File scripts/validate-r31.ps1 -ExpectedBranch feat/r3-1-xr-studio`; inspect its resource-creating workflow before execution. It must run only in an authorized dispatched Windows environment or under a new explicit local-heavy-compute exception, not automatically on the caller's workstation. Do not point TEST_DATABASE_URL at staging/production or reuse an existing DB resource.
5. Through ld, build for the actual Vercel Node major, inspect client/server routes and artifact tracing, exercise authentication/session sign-in/out/revocation, private Studio denial, image/native Sharp and PDF worker paths against synthetic disposable services. Network/OAuth/mail should remain test-controlled. No production credential pulls or Vercel deployment are authorized.
6. Obtain final independent review of the returned/applied patch and attach fresh validation evidence to PR #9. Suggested PR note: “Targeted dependency security update: Next/config 16.4.6, Better Auth/adapter 1.7.16, Nodemailer 10.5.0, Zod 4.6.7, Vitest 5.1.0; scoped esbuild/minimatch fixes. npm audit 19→0 full / 11→0 omit-dev. Worker selection 112 unit +31 frontend passed; full build/integration/browser validation pending. No authorization/migration changes or deployment.” Do not update GitHub from this worker.

The dependency gate becomes GO only after the final install/audit remains clean, full Windows and target-runtime build/integration/browser checks pass, and the incomplete Next maintainer records receive an explicit documented disposition. No known npm critical/high remains in the candidate; any new confirmed reachable critical/high blocks release. Existing manual persona/accessibility QA, hosted privileges, backup/restore and separately authorized migration/bootstrap/deployment gates in [release readiness](r3-1-release-readiness.md) remain in force.

Rollback: retain reviewed old/new manifests, locks and exact source SHAs. A dependency-only rollback needs a new `npm ci`/build/deploy through approved workflows, no database down migration. Rolling back to baseline restores known vulnerable package ranges; prefer the last verified patched build or an approved restricted maintenance state. Do not drop Studio tables, relax role/origin checks, rewrite 0000–0011, move historical tags or redeploy the vulnerable baseline as a claimed safe rollback. No deployment was executed here.

## Final review and patch integrity

An independent Codex reviewer checked the final manifest/lock diff, used override APIs, registry integrity, alignment and absence of source/test/security changes. No blocking defect; auth-core duplication noted above. Review was static and used the existing worker collaboration facility, not a new paid API client; separate token accounting was not exposed. The report/evidence receive a follow-up review before closeout.

Only manifests, this report, the release-readiness dependency-gate link and six evidence files change (ten paths total). Full lock paths/versions are in the CSV; all changed package entries retain HTTPS npm registry resolution and integrity. No new migrations, schema changes, secrets, generated bundles, environment files or test removals are included. Whitespace and forward/reverse patch checks are recorded after final review below.

Final checks: `git diff --check` and new-file whitespace checks passed. The secondary patch passed forward `git apply --check` and actual application in a temporary baseline directory; all ten resulting files matched this snapshot byte-for-byte. Reverse `git apply --check` passed both in that directory and the edited snapshot. No commits or original-checkout changes were made.
