# R3.1 XR Studio — proposed patch

Review only. Repository: `https://github.com/JashSojitra/immxrsive-talent-platform`. Apply only after explicit approval, on a new local `feat/r3-1-xr-studio` branch based on the caller's verified R3 baseline. This history-free transport snapshot is not that baseline. Do not apply on top of an assumed matching branch; review conflicts and migration state first.

## Baseline and scope

The closure report identifies caller-reported original/deployed HEAD `b81ba3df3a28f0b0e267414852f8e202129a2f19`. Its deployment identity is not independently verified here. Release documents do not establish a final assessed R3 SHA or `R3-submission`; preserve whatever submission tag exists in the original repository. No production calls, account changes, migrations, tag operations, commit, push, merge or deployment are part of this patch. Existing R1–R3 SQL is unchanged. No new dependency or external infrastructure is introduced.

## Roles and privileged setup

Better Auth sessions supply the internal actor ID. `studio_roles` is the sole staff authority; domain, institutional verification, GitHub metadata and submitted JSON cannot grant privileges. Default is no role. Student affiliation verification remains unchanged. Owning a project means its current R3 student maintainer, not every accepted contributor. Owners may submit their own existing projects and respond even if they later lose affiliation; this preserves withdrawal and control of previously submitted content.

| Role | Permissions |
| --- | --- |
| No staff role | Current owner: submit, resubmit, withdraw, approve exact saved content; read own status/history |
| XR Curator | Read submitted queue/history; start review, request changes, reject, suggest, approve review |
| XR Admin | Curator permissions plus explicitly publish and moderate/unpublish curated content |
| Platform Super Admin | Admin permissions plus privileged operational role assignment/revocation |

Staff roles never confer owner consent or project/contributor editing rights. A staff member who is independently the current project owner retains their owner rights. No four-eyes reviewer separation is claimed.

Bootstrap is an explicit DBA operation, never a website sign-up option. After the intended person signs in normally, independently verify their internal `auth_users.id` and organizational authorization. Use a separately authorized privileged database session, verified against the intended environment. There is no HTTP role-assignment endpoint. Substitute reviewed IDs below; never derive them from an email domain. Record the operator and approval ticket in the reason. Example SQL is a procedure for later approval, not executed here:

```sql
BEGIN;
LOCK TABLE public.studio_roles IN EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.studio_roles WHERE role = 'platform_super_admin')
    THEN RAISE EXCEPTION 'Already bootstrapped; use assign_studio_role'; END IF;
END $$;
INSERT INTO public.studio_roles(user_id, role)
VALUES ('REVIEWED_INTERNAL_USER_ID', 'platform_super_admin');
INSERT INTO public.studio_events(actor_user_id, action, note, snapshot)
VALUES ('REVIEWED_INTERNAL_USER_ID', 'bootstrap', 'Operator + approved ticket + reason',
        jsonb_build_object('role', 'platform_super_admin'));
COMMIT;
```

Subsequent assignments require a verified super admin acting through the trusted operational connection:

```sql
SELECT public.assign_studio_role('VERIFIED_SUPER_ADMIN_ID', 'TARGET_INTERNAL_USER_ID',
                                'xr_curator', 'Operator + approved ticket + reason');
-- desired_role NULL revokes a grant. The last super admin cannot be revoked here.
```

The function uses invoker rights, requires an existing super-admin actor, serializes grants, validates role values and logs old/new grants. Its actor argument is trusted operational input, **not authentication**: do not expose it as an RPC or grant it to untrusted database roles. Browser roles have no execute permission. Application sessions never invoke it. Privileged database operators can bypass application controls and remain a trusted boundary.

## API and UI

- `/studio`: authenticated staff-only queue, status filter and links to review detail. An ordinary signed-in account sees no queue data.
- `/studio/[projectId]`: staff review detail. Staff cannot inspect arbitrary unsubmitted private projects.
- My Projects links maintainers to `/student/projects/[projectId]/showcase`, including initial submission, owner-visible notes, approval and withdrawal. Contributors retain their separate R3 team/consent workflow.
- `GET /api/studio`: staff queue. `GET /api/studio/[projectId]`: current owner or staff of an existing submission only. Private responses are not cached.
- `POST /api/studio/[projectId]`: strict JSON `{ action, version, note?, content? }`. Content is `{ title, summary, mediaUrl, demoUrl }`; unknown role/ownership fields fail. First submission uses the canonical project version; later commands use the submission version. Origin/content-type/body-size checks reuse R3's boundary. Recoverable 409 conflicts retain form input.
- `/showcase`: public owner-approved curated text and explicit outbound media/demo links, linked to unchanged `/projects/[projectId]`. No embed, fetch, upload or generated simulation is added. URLs reuse the existing R3 evidence validator and are revalidated for rendering.

Transitions: submitted → under review → changes requested / approved / rejected. Changes requested, rejected or withdrawn → owner resubmission → submitted. Owner withdrawal is allowed for active/approved requests and immediately hides curated output. Staff suggestions return to under review, increment content revision and clear both approvals. The owner accepts the exact saved revision; unsaved form inputs are not approved. Approval does not publish. XR Admin explicitly publishes only after review approval, current owner approval and canonical public status. Project edits or maintenance transfer invalidate approval/public display; reaccepting clears stored publication until staff explicitly republishes. Canonical unpublication also hides the showcase.

Moderation requires a reason and hides only curated output, retaining the submission, all snapshots and canonical records. The current owner sees the outcome and reason. Staff cannot change invitations, statements, contribution roles, visibility or acceptance, and cannot publish the canonical project. No past owner is retained as an authorized reader after maintenance transfer; the current maintainer assumes the showcase response responsibility.

Each successful command creates a durable event in the same transaction, including actor, action, timestamp, reason and complete showcase snapshot. Owners and submitted-project reviewers can read project events. Role events (no project ID) are operational only. History UI exposes saved text/link revisions. Event updates/deletes/truncation fail via trigger. No automatic notifications or public reviewer notes are added.

The UI reuses ProjectWorkspace, typography, focus styles and responsive controls. It introduces no animation; the existing workspace reduced-motion behavior remains. Keyboard and 390px browser validation are still required before rollout.

## Migration and rollout proposal

One additive migration `0011_r31_xr_studio.sql`, journal entry and generated schema snapshot add three tables: roles, one submission per project, and append-only audit events. Foreign keys restrict record erasure; checks bound text/state/revisions/acceptance. Triggers check submission provenance/current ownership and guard audit immutability. RLS is enabled on all three tables with no permissive policies; privileges are revoked from PUBLIC, anon and authenticated. Like R3, trusted server database access uses the existing privileged backend connection, not browser database roles. Server transaction locks serialize with canonical project maintenance; role reads are locked against concurrent revocation. Audit is application/trigger enforced, not cryptographically tamper-proof against a DBA.

Before application: verify baseline and tag, review patch, take existing documented backup, verify disposable database identity with `src/db/safety.ts`, then migrate/test **only** that disposable database. New trigger/procedure SQL and real DB role behavior have not been exercised here. The snapshot records RLS; custom triggers/functions remain explicitly in SQL (Drizzle does not model them). Preserve those when generating later migrations.

Before any separately authorized production rollout: reconcile actual migration journal through 0010, inspect generated 0011, verify runtime DB privileges and transaction behavior, run R1–R3 plus new database/browser tests and manual owner/staff/mobile checks. Deploy migration before application code; then bootstrap approved staff explicitly. Do not enable a browser Data API policy to make the UI work. Rollback is application rollback with additive tables retained; export/retain audit and submissions, never drop student records or rewrite migration history. Remove role grants or unpublish curated entries through reviewed operations if needed. No scheduled deletion/retention job is included.

## Limits and release gates

Queue and public gallery are unpaginated for a minimal university pilot; add bounded pagination before large-scale use. Media/demo are suggestions and outbound links, not safety-verified hosted artifacts. Staff are trusted to review evidence and avoid including personal contributor information in curated prose. Review notes are owner-visible, not a private staff notebook. No automatic authorship verification or contributor impersonation is attempted. Separate approval for materially changed showcase content is conservatively required for every staff edit.

The sanitized snapshot omits resume PDFs and all credentials. No test identity, production data or private user payload is introduced. Dependency installation reported 19 pre-existing advisory findings (15 moderate, 3 high, 1 critical); no lockfile upgrade was made. Evaluate those separately before release. Validation results and exact manifest are in `r3-1-validation.md`. Do not treat passing static checks as production readiness.
