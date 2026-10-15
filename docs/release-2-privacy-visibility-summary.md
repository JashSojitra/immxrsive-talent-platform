# Release 2 privacy and visibility summary

Student authentication, affiliation, private profile data, and public profile
data are separate concerns. GitHub sign-in creates an internal user identity;
GitHub email alone does not confer student status. Verification requires control
of an approved Algoma University mailbox. Raw verification tokens are never
stored, each link is user-bound, expires in at most 30 minutes, and is single-use.

Profiles begin unpublished. Authenticated API routes derive ownership from the
server session and require verified affiliation; client-supplied owner or profile
identifiers are rejected. A private draft can be previewed by its owner without
making it publicly addressable. Publishing and unpublishing are explicit actions.
The public directory and profile endpoints query only published records.

All application tables are server-only. Migration `0007_harden_data_api` enables
RLS without client policies and revokes table, sequence, and function access from
`PUBLIC`, `anon`, and `authenticated`. Future objects created by the application's
`postgres` migration role inherit the same private defaults. The Next.js server
uses its protected direct PostgreSQL connection; browser clients never receive
database credentials or direct table access.

The public projection is assembled server-side from an allowlist. Name, headline,
biography, program, student status, standardized skills, and permitted portfolio
presentation fields form the public professional profile. Availability, location,
education, experience, and supported professional links are exposed only when
their individual visibility controls are enabled. Authentication records,
institutional email, verification state, internal owner identifiers, draft
revision metadata, and hidden field values are never part of the public response.

Resume PDFs are treated as untrusted input. Processing is limited by file size,
page count, extracted text size, and time. Extraction returns grounded candidates
for review; it does not silently update a profile, invent missing facts, or persist
the original PDF. Skill candidates must exactly match the canonical vocabulary;
grounded unsupported skill text is disclosed separately and is not auto-added or
mapped to a different skill. The student explicitly accepts, edits, or rejects
candidates and chooses merge or replace behavior before saving the resulting
structured fields.

Portfolio customization is constrained to allowlisted presets, hero treatments,
and semantic section ordering. User-entered text remains text; arbitrary HTML,
CSS, and scripts are not accepted. Presentation choices do not change the profile
fields used by public search.
