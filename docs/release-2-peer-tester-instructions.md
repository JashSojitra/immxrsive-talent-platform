# Release 2 peer tester instructions

## Before testing

- Use the submitted deployment URL, not a local server.
- Use your own GitHub account and an approved Algoma University email address.
- Do not share a verification link; it is account-bound, expiring, and single-use.
- Use only synthetic content and the repository's `data/fixtures/r2` resume PDFs.
- Record browser, viewport, route, exact steps, expected result, actual result,
  screenshot, and time for every issue.

## Core workflow

1. Open `/student/sign-in`, operate it with the keyboard, and sign in with GitHub.
2. At `/student/verify`, confirm an external domain is rejected with a recovery
   message, then request a link for an approved address. Check sender, branding,
   expiry wording, plain-text/HTML content, and the application origin in the link.
3. Open the link in the same signed-in account, verify once, then confirm replay is
   rejected. Sign out and back in and confirm verified state persists.
4. Create a private draft. Refresh and use browser back/forward before saving and
   after saving. Confirm the profile is absent from `/talent` while unpublished.
5. Import each approved resume fixture. Test accept/edit/reject, merge/replace,
   cancel, double upload, malformed PDF, and manual recovery after failure. Confirm
   no profile field changes before explicit application. Confirm unsupported
   skills are disclosed but not added, and test a synthetic single-column
   Word-exported PDF with common headings and a protocol-less LinkedIn URL.
6. Toggle every visibility field. Compare owner preview with the public API and
   public route. Hidden values must not appear in markup or API responses.
7. Exercise every presentation preset, hero treatment, and section-order control.
   Confirm search behavior does not change.
8. Publish, locate the profile in `/talent`, reload and sign back in, then unpublish
   and confirm both directory and direct public access disappear while the draft
   remains editable.
9. Repeat the entire self-service flow at exactly 390 CSS pixels and with keyboard
   navigation. Check visible focus, labels, validation association, and overflow.
10. Run the Release 1 directory, profile, project, search, and inquiry journeys.

## Exploratory checks

Try empty and maximum-length biography values, malformed links, repeated
verification requests, repeated invalid confirmations, refresh during a draft,
cancelled resume review, and rapid repeated actions. Do not deliberately send
high-volume email or attempt denial-of-service behavior.
