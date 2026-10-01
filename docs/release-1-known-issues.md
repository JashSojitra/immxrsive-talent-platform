# Release 1 Known Issues

Audit date: 2026-10-01

## Blocking issues

No known blocking issues remain after M7 acceptance.

## Accepted non-blocking limitations

- The official P07 fixture intentionally points to `https://example.invalid/demo`. The application exposes it as an optional external link and never fetches it during render, so it cannot break the project page or core workflow.
- Release 1 inquiry anti-abuse is intentionally proportional: server validation, a 16 KiB body limit, a honeypot, and duplicate-submit prevention are present; CAPTCHA, IP rate limiting, authentication, CRM, and moderation are outside the approved scope.
- Automated axe tooling is not installed. Keyboard, semantics, announcements, focus, reduced motion, and 390 px behavior are covered by component/Playwright checks and the M7 manual audit.

## Release actions intentionally pending

- No deployment has been performed.
- No `R1-submission` tag has been created.
- Commit, push, deployment, and release tagging remain pending review and M8 authorization.
