# Administrator onboarding architecture and access matrix

Real source base: `9302e6487ee3efa4a9a9da29a701dca02c822702` (R3.1), as recorded in admin-onboarding-requirements.md. Snapshot transport commits are not provenance.

| Capability | Anonymous/student | xr_curator | xr_admin | platform_super_admin |
| --- | --- | --- | --- | --- |
| Published projects/showcases | Read | Read | Read | Read |
| Admin drafts, preview, activity and technical review list | Denied | Read | Read | Read |
| Import suggestions, create/edit/demo/publish/unpublish/archive/restore | Denied | Denied | Allowed | Allowed |
| Access list and assign/revoke roles | Denied | Denied | Denied | Allowed |
| Convert/seize student projects or approve for a student | Denied | Denied | Denied | Denied |

Existing `studio_roles` govern platform-wide admin-managed intake, regardless of project domain; xr_admin is deliberately a platform intake operator. Curator review is advisory only and never a publication gate. Existing student XR Studio retains its independent owner approval policy.

Canonical `projects` retain IDs, public URLs, inquiry references and common presentation. Add immutable authoritative `management_mode`, with existing records STUDENT_MANAGED and new admin records ADMIN_MANAGED, origin `admin`, NULL student maintainer. Separate `admin_project_details` holds actual staff creator/provenance, lifecycle and versioned structured presentation. No student membership, fake identity, invitation or consent fields are created. Admin credits are descriptive; optional explicitly configured public profile associations have a separate table and disappear from projection when the profile becomes private. Associations never grant membership or skill evidence.

Each private read and mutation checks a current database role under a transaction-held SHARE row lock. Content mutations lock canonical project first, then role, then details; revocation waits or is observed before proceeding. Every write increments the canonical version and records an append-only snapshot in the same transaction. Stale writes return 409. Access mutations take the same EXCLUSIVE studio_roles table lock as the existing operational role function, then verify the session actor, previous target role and last-super-admin count. No HTTP route forwards a request actor into a privileged SQL function. Browser database roles have neither table grants nor RPC permissions. Runtime uses the existing trusted server connection; it must never be exposed to a browser.

GitHub import uses fixed public API endpoints, bounded streaming and timeout, without tokens, redirects, README execution or builds. Suggestions are applied only on explicit user action. Exact repository duplicates are serialized with existing repository advisory locks; admin duplicates are rejected while student-managed matches are warnings, never merged or seized. No private student titles are disclosed to staff through duplicate checks.

Public project projection selects only published canonical records and published admin lifecycle. Admin content is excluded from student contribution/skill projections. `/showcase` includes both admin showcases and existing owner-approved Studio showcases, explicitly described separately. No public projection returns audit, role or private profile data. Public routes remain dynamic/no-store.

Demo configuration uses structured HTTPS URLs, never supplied HTML. Web frames start on click, use an opaque sandbox, deny sensitive device permissions and retain fallback outside the frame. No server fetches arbitrary demo/media URLs. Native/XR content uses platform instructions and external launch, with no claim of browser compatibility. Cross-origin frame load cannot prove successful rendering; timeout and persistent alternate links make that limitation explicit.

Implementation sequence: additive schema/migration + snapshot, validated service/API boundary, portal/shared projection/demo, security and lifecycle regression tests, operations/intake/release evidence. No historical migration bytes or historical release evidence will change.
