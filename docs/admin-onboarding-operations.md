# Administrator access and operations

See [architecture/access matrix](admin-onboarding-architecture.md). No production role was assigned in development. No website control can bootstrap itself into staff access.

## First sign-in and verified account identity

1. Configure the existing Better Auth GitHub OAuth integration using the owning environment workflow. Staff require a real authenticated account, not a student profile or institutional affiliation. Never grant roles based on GitHub names, email domains, imported repository identities or a client-supplied actor.
2. Sign in at `/admin/sign-in`. A signed-in account without a role sees its own internal account ID on `/admin`. The authenticated Better Auth session API also returns that account's own `user.id`. This is distinct from a GitHub ID and student profile ID.
3. An approved operator independently verifies the intended person, internal `auth_users.id`, account name/email, target environment and change reference. Do not search or publish private student account lists.
4. First-super-admin bootstrap requires a separately authorized privileged database connection; it is outside this development job. Verify server/environment identity, migration ledger through 0012 and reviewed backups before any write.

## First bootstrap procedure (template, not executed)

Substitute independently reviewed environment, operator, user and approved change reference. Inspect `current_database()`, `current_user`, `inet_server_addr()`, `inet_server_port()` and the approved deployment's database identity first. A matching database name alone does not establish the intended server. Confirm the target row privately against the real signed-in person. Use parameters in the operator's trusted client; never paste credentials into scripts, browser consoles or project records.

```sql
BEGIN;
LOCK TABLE public.studio_roles IN EXCLUSIVE MODE;
DO $$
DECLARE
  target text := 'REVIEWED_INTERNAL_ACCOUNT_ID';
  approved_database text := 'REVIEWED_DATABASE_NAME';
  approved_db_operator text := 'REVIEWED_DATABASE_OPERATOR';
  change_note text := 'APPROVED_OPERATOR + CHANGE_REFERENCE + REASON';
BEGIN
  IF current_database() <> approved_database OR current_user <> approved_db_operator
    THEN RAISE EXCEPTION 'Wrong environment/operator'; END IF;
  IF target = 'REVIEWED_INTERNAL_ACCOUNT_ID' OR change_note LIKE 'APPROVED_OPERATOR%'
    THEN RAISE EXCEPTION 'Replace and review placeholders'; END IF;
  PERFORM 1 FROM public.auth_users WHERE id = target FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Authenticated account required'; END IF;
  IF EXISTS (SELECT 1 FROM public.studio_roles WHERE role = 'platform_super_admin')
    THEN RAISE EXCEPTION 'Already bootstrapped: use normal access administration'; END IF;
  INSERT INTO public.studio_roles(user_id,role) VALUES(target,'platform_super_admin');
  INSERT INTO public.studio_events(actor_user_id,action,note,snapshot)
    VALUES(target,'bootstrap',change_note,jsonb_build_object('subject',target,'role','platform_super_admin'));
  INSERT INTO public.admin_events(actor_user_id,action,note,snapshot)
    VALUES(target,'bootstrap',change_note,jsonb_build_object('subject',target,'role','platform_super_admin'));
END $$;
COMMIT;
```

The lock, grant and audit must commit atomically. Abort on any mismatch. This template preserves existing super admins by refusing bootstrap if one exists. It does not replace independent server and human identity verification. Do not expose SQL or privileged database connections through HTTP.

## Subsequent administration

After bootstrap, `/admin/settings` shows the authenticated identity and role; `/admin/settings/access` is restricted to super admins. Choose an existing staff grant or enter the exact shared internal ID of a real authenticated account. Select the new role or revoke, and enter the approved operator/change reason. No student account search is provided. The request contains target, desired role, expected previous role and reason; the server independently obtains the actor from the session.

Assignments/revocations lock `studio_roles` EXCLUSIVE before checking the actor. This uses the same lock as the existing invoker-rights operational `assign_studio_role` function. Concurrent changes serialize, stale target roles return 409, and removing/demoting the last super admin is refused. Current staff reads/content writes hold a SHARE lock on the actual role until their protected transaction ends. A revocation either precedes an operation and denies it, or waits for that already-authorized operation to finish. An open editor does not preserve revoked authorization.

The application never invokes `assign_studio_role(actor,...)` with raw request parameters. That legacy function remains restricted to independently trusted operational connections. Browser `anon`, `authenticated` and PUBLIC grants are denied on admin tables/functions; RLS has no browser allow policies. Keep the trusted server database credential server-only. Verify the actual deployment runtime role can read/write required application tables and run transactions, and cannot be obtained by a browser. Do not add browser grants to resolve a runtime configuration issue.

## Access checks and revocation

Verify anonymous API 401; normal signed-in account 403; curator read-only; XR admin project mutations; super admin access mutations. Revoke a synthetic staff role while an editor is open and verify its next save is denied. Verify the remaining super admin still works. If revoking your own role, the next access-list refresh may be denied; this is expected.

`/admin/activity` shows the latest 100 events, actor IDs, notes and immutable saved snapshots. Each project also exposes its activity. Operational audit inspection can read `admin_events` and `studio_events` through the trusted connection; never publish them or log credentials. Content events and changes share a transaction; role changes append to both ledgers. UPDATE, DELETE and TRUNCATE of audit evidence are blocked. Back up the ledgers with the database; no retention deletion is implemented.

## Recovery

If another super admin is available, use normal access administration. If no one can authenticate but existing grants remain, repair the owning OAuth/session setup first. A first-bootstrap rerun intentionally refuses to overwrite existing super admins. For actual lost-access recovery, obtain separate break-glass authorization, verify a real recovery account and intended environment, take a backup, acquire the same EXCLUSIVE role-table lock, preserve existing grants, append the operator/change evidence to both ledgers and grant an additional approved super admin atomically. Do not impersonate another actor or disable audit triggers. Review grants and revoke temporary recovery access afterward through normal access management.

## Daily content operations

`/admin` links to drafts, live, unpublished and archived records. Create/import, edit the narrative and descriptive credits, attach an independently hosted demo, save, preview and publish directly. Technical reviews list private drafts and unpublished projects for operator review; they do not create an approval gate. Published updates are immediate. Unpublish/archive removes every public project/showcase reference; restore returns a private draft and requires a fresh explicit publish. Keep the canonical record for stable URLs and audit history.

On 409, retain your local entries, reload the saved project and reconcile intentionally. Never resubmit an older version by guessing a newer revision. Lifecycle buttons operate on saved content and say so; save narrative changes before previewing. Admin operations have no delete or student-project conversion control.
