# Release 2 known issues and readiness blockers

## Blocking before submission

- The two files in `docs/course/r2/final/` are malformed PDFs. Their compressed
  streams cannot be decoded and all four rendered pages are blank. Clean copies
  are required before the final R2.01–R2.32 and Peer QA A–K audit can be signed
  off. The current evidence matrix is explicitly provisional against the readable
  preview PDFs and the final-change callouts supplied by the project owner.
- Gmail configuration is present locally, but no real SMTP submission or inbox
  delivery has been attempted during this sprint. An approved Algoma mailbox must
  complete the documented manual test after the relevant environment is restarted
  or redeployed.
- The Release 2 production commit, tag, deployment, and production database
  migration are intentionally pending human authorization.

## Operational limitations

- Gmail SMTP is suitable for the course-scale workflow but is subject to Google
  account sending limits, anti-abuse decisions, and spam/quarantine handling. A
  successful SMTP submission does not guarantee inbox placement.
- Resume extraction supports readable PDFs with selectable text. Image-only or
  malformed PDFs fail safely and require manual profile entry.
- Resume skills are added only on exact case-insensitive matches to the canonical
  vocabulary. Unsupported but grounded resume skills are shown for manual review
  and are not silently converted to a different standardized skill.
- Existing Release 1 fixture profiles are not claimed by newly authenticated
  student accounts.
- `npm audit --omit=dev` reports four moderate esbuild findings through the
  `drizzle-kit` development/migration toolchain. The full audit also reports five
  high findings in the ESLint globbing toolchain. Neither path is bundled into the
  application runtime. npm's proposed forced fixes cross breaking downgrade
  boundaries, so they were not applied; re-evaluate when upstream releases expose
  a non-breaking remediation.
