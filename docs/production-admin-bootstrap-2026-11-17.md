# Production administrator bootstrap — verified

Production: https://immxrsive-talent-platform.vercel.app/admin

Target project: `acnwbxqzkcdqgbohvpil`. Previously verified deployed commit: `27fb2a3ca3dd7a44076fafcda6d27c85b7c56672`.

## Observed evidence

- The authenticated production page in Brave displays internal Better Auth ID `HTem2iL2hUrrUW47edpEcpYgWxNi91Nv`, “Administrator access required” and “no staff role.”
- Authenticated GitHub CLI identity and independent public GitHub lookup agree on `JashSojitra`, immutable GitHub account ID `132728061`.
- After the operator completed Supabase CLI login, an independent production SELECT confirmed exactly one linked GitHub account with numeric ID `132728061` for the target Better Auth user, an active session, no target role and no existing super administrators.
- Supabase CLI 3.2.0 identified the explicitly selected project as `immxrsive-talent-platform-prod` / `acnwbxqzkcdqgbohvpil`, ACTIVE_HEALTHY, PostgreSQL 17. All 14 migration journal hashes matched. The privileged operator's required write permissions passed. Existing local database profiles target other projects and were not used.
- The approved procedure is [administrator operations](admin-onboarding-operations.md): exclusive role-table lock, verified existing auth user, refusal if already bootstrapped, one `platform_super_admin` grant and both audit inserts in one transaction. It prohibits privileged SQL over HTTP.
- A disposable local PostgreSQL 17 rehearsal passed: wrong linked identity rejected; correct fixture identity granted atomically; both audit records verified; unrelated role preserved; repeat bootstrap refused; migration count preserved at 14. The owned disposable container was removed.
- The reviewed atomic procedure executed successfully through the official authenticated Supabase control plane. An independent read-only query returned `platform_super_admin` for the exact target, one super administrator, one matching bootstrap event in each audit ledger and 14 migration entries.
- Only the target role and two required audit records were inserted. No user, provider, schema or unrelated role record was modified. No production endpoint, privileged deployment, temporary token or database privilege mechanism was created.
- All five task-owned temporary SQL/preparation files and their empty directory were removed and absence verified. The operator's personal Supabase login is retained; it is not a task-created temporary credential.

## UI confirmation passed

The operator refreshed `/admin` in the authenticated Brave session and explicitly confirmed: “Administrator overview opens.” Bootstrap acceptance is complete: production identity, committed role, both audit records, temporary-file cleanup and authenticated UI access are verified.

## R4 acceptance prepared for after bootstrap

1. Use `/admin/partners` to import these exact hosted sources: `/fixtures/r4/company_normal.html`, `/fixtures/r4/company_sparse.html`, `/fixtures/r4/company_same_name_other_domain.html`, and `/fixtures/r4/company_prompt_injection.html`. Apply proposals explicitly and verify draft state before authorized publication. Record actual company IDs, source hashes and URLs. Confirm same-name/different-domain handling and R4.14 duplicate-domain warning against the existing fixture company.
2. For North Shore Simulations, create the supplied past/public 2025 “Industrial Safety Training Prototype” and current/public 2026 “XR Maintenance Training Study.” Resolve the actual canonical P01/P04 project mapping independently. Do not attach unrelated real projects or invent outcomes/student participation. Exercise limited/private visibility through authorized fixture edits and verify public output. The supplied third record is Superior Immersive Labs / “Confidential Spatial Prototype” / current 2026 / private / no project.
3. Check public directory/detail pages at 390px and contextual inquiry. Select only genuinely eligible public student profiles; leave participation empty if no authorized fixture participants exist.
4. A separate authorized test student with a genuinely eligible owned project must submit the relationship request. Verify pending state and self-approval denial; the verified staff account then approves independently. Do not manufacture affiliations in real student records.
5. Record actual outcomes, public record URLs and remaining manual checks in R4 evidence. Keep credentials out of submission files. Create `R4-submission` only after the exact assessed production build passes acceptance. Moodle submission remains a separate confirmed human action.

Production fixture imports, publication, collaborations and relationship requests remain unexecuted in this attempt. Bootstrap and its independent database read-back passed.
