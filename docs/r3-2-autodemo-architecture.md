# R3.2 AutoDemo — architecture proposal only

No worker, build execution, repository clone service, artifact bucket, simulation generator, deployment or external infrastructure is implemented by R3.1.

## Authorization and analysis

The current project owner explicitly authorizes analysis for a selected repository and immutable commit SHA. Record consent scope, actor, project version, repository identity, commit, permitted files and expiry; changes of repository/owner revoke pending authorization. Public repository visibility does not imply permission to execute code. GitHub metadata import remains R3's bounded metadata workflow. Do not infer platform contributor consent from Git history.

A future analysis adapter reads bounded source manifests and selected files without executing hooks, dependency installers or scripts. Reject private credential-bearing URLs, submodules, oversized archives, path traversal, symlink escapes and decompression bombs; cap file count/size and treat README/prompt content as untrusted data. Store provenance/digests and redact detected secrets from diagnostic output. No secrets or personal data enter model requests without separate authorization.

Strategy selection should produce a reviewable plan with evidence and uncertainty:

| Repository evidence | Proposed strategy | Visitor label |
| --- | --- | --- |
| Existing owner-reviewed hosted demo | Reuse explicit link / existing approved embed rules | Live demo, external host |
| Supported static/browser application | Isolated reproducible preview, if owner separately authorizes build | Built preview from commit SHA |
| Native Unity/Unreal, unavailable services, unsupported platform | Owner-supplied video/screenshots or documented manual export | Recorded walkthrough / supplied media |
| No runnable artifact | Optional separately authorized explanatory simulation proposal | Simulation — does not execute or verify repository behavior |

Never call a screenshot, iframe load event, generated animation or simulation a successful working build. A simulation must be a separate artifact type with conspicuous persistent labeling, source limitations and no invented performance or feature claims. No simulation generation is enabled by this document.

## Isolated builds and deployment boundary

If approved in a future release, a build scheduler accepts only immutable job descriptions; the web app never shells out. A separate security review must authorize disposable sandboxes with no production network, metadata endpoints, host mounts, privileged containers, user cookies, database access or deployment credentials. Non-root execution, fixed resource/time/process limits, audited toolchain images and a deny-by-default egress proxy constrain dependency access. Package install hooks and repository scripts are untrusted code. Pin inputs; block arbitrary redirects and DNS rebinding; record resolved dependency/toolchain digests. Scan output for secrets and executable payload risks. Do not assume containers alone are a sufficient hostile-code boundary.

Preview artifacts live on a dedicated untrusted origin with no platform cookies, isolated storage, restrictive CSP and sandboxed embedding if embedding is approved. Signed uploads/downloads have scoped short lifetimes. Never serve untrusted HTML from the main Next.js origin or deploy into the platform's Vercel project. Preview builds cannot promote to production. Any deployment requires a separate explicit human decision, credentials boundary and owning service workflow.

## Artifact and review lifecycle

Future additive records: authorized job, immutable analysis/strategy plan, attempt log, artifact manifest and owner/reviewer decisions. Each artifact records SHA256, source commit, strategy, toolchain, timestamps, simulation flag, safety review, owner and publication revision. Store binaries outside the relational database; use generated immutable keys, size/type quotas, malware review, restricted private access and retention policy. Keep private failures private. Store sanitized diagnostics separately from public descriptions.

State flow: authorized → analyzed → strategy proposed → owner authorizes build or simulation → queued → isolated attempt → artifact quarantined → owner preview/review → staff review → explicit publication. Owner approval is bound to artifact digest and showcase revision. No artifact can replace student-owned media automatically. Maintenance transfer, revocation or material source/content changes require renewed approval. Existing contributor statements/visibility remain separate. R3 stable URLs remain canonical; previews are optional evidence.

Retry only transient fetch/infrastructure failures with bounded exponential backoff, attempt ceiling and a per-project budget; never loop blindly on failed arbitrary code. Deterministic build failures produce a clear diagnostic and owner-supplied fallback path. Unsupported strategy falls back to manual video/screenshots or an expressly authorized, labeled simulation, never silently. Cancellation/revocation prevents publication and cancels queued work; running jobs have hard termination limits. Preserve attempt provenance and actor/reason in access-controlled audit.

## Gates before implementation

Threat-model hostile repositories and artifacts; verify sandbox isolation and egress denial; test credential canaries, malicious installers, resource exhaustion, traversal, artifact-origin isolation, forged approvals, stale versions, owner transfer, cancellation and retry budgets. Test that build success is distinguishable from simulation and from healthy runtime behavior. Obtain owner/product decisions for cost limits, retention, allowed ecosystems, accessibility, operational ownership and deployment authorization. R3.1 supplies none of this execution infrastructure and makes no automatic demo-quality claims.
