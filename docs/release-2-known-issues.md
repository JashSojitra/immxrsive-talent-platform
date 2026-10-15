# Release 2 known issues and limitations

No known application defect blocks the reviewed Release 2 workflow. Production
security migration `0007_harden_data_api` passed its complete read-only postcheck
on October 15, 2026.

- Resume extraction supports readable PDFs with selectable text. Image-only or
  malformed PDFs fail safely and require manual profile entry.
- Resume skills are accepted only on exact case-insensitive matches to the
  canonical vocabulary. Other grounded skills remain reviewable but do not create
  public filter values.
- Gmail SMTP is subject to provider limits, anti-abuse decisions, and
  spam/quarantine handling; successful submission cannot guarantee inbox placement.
- Existing Release 1 fixture profiles cannot be claimed by newly authenticated
  student accounts.
- `npm audit --omit=dev` reports four moderate esbuild findings through the
  development-only Drizzle tooling. The full audit also reports five high findings
  in the development-only ESLint globbing toolchain. Neither is bundled into the
  application runtime, and the proposed forced fixes cross breaking boundaries.
