# Project intake handoff: R.I.S.E CRM and personal projects

This covers how to add real projects through the existing admin intake. The project details are deliberately left blank. Fill them in only from your own repositories, demos and records. The platform must not receive invented descriptions, roles, outcomes or images.

## What the platform supports today

| Need | Status | Where |
| --- | --- | --- |
| Admin-created project record | Ready | `/admin/projects/new` → `adminCreate` (`src/admin/service.ts`). Needs the `xr_admin` or `platform_super_admin` role. |
| Import metadata from a public GitHub repo | Ready | "Repository intake" in the editor. Reads metadata only; no code is downloaded or run. Suggestions fill empty fields only. |
| Duplicate check (repository + similar title) | Ready | "Check project matches". |
| Source repositories | Ready | "Original GitHub repository" (one canonical `github.com/owner/repo` page per admin project; duplicates are rejected) and "Adapted demo source" (any public HTTPS URL). |
| Embedded / hosted demos | Ready | Experience modes: static, safe web embed (sandboxed iframe launched on click), external link, video walkthrough, native/XR with device notes. A fallback narrative is required to publish. |
| Contributor credits | Ready | Name, role and statement per credit. Credits are descriptive and create no accounts. |
| Link a credit to a verified student profile | **New in this pass** | "Find a verified public profile" in the credits section (`GET /api/admin/profiles?q=`). Only published profiles with a verified affiliation can be found or linked. |
| Credit shown on the student's public profile | **New in this pass** | `/students/<profileId>` shows a separate "Credited in curated projects" block. It's labelled as staff attribution and isn't counted as project evidence or skills. |
| Credit shown on the student dashboard | **New in this pass** | Read-only "Credited in curated projects" panel, which says no team membership or editing access is granted. |

### Ownership boundaries (unchanged, now tested end to end)

- Admin projects are `ADMIN_MANAGED` with `maintainerUserId = null`. A database guard blocks student memberships on them.
- Linking a profile grants no membership, maintainer rights, editing or skill evidence. A credited student calling admin mutations gets 403.
- A credit stops appearing on the profile and dashboard as soon as either the admin project or the student profile stops being public.
- The profile lookup returns only fields the talent directory already shows publicly (`id`, `name`, `headline`, `program`). It never returns email or account IDs. Curators (read-only staff) and students get 403.

### Known limitation (needs a product decision)

A student can't hide or decline a staff credit themselves. Today they contact staff, and the dashboard says so. Letting students hide credits needs a new column on `admin_credit_links` (a migration). It's deliberately not done here because this pass avoids schema changes.

## Per-project intake checklist

Fill one per project. Leave a field empty rather than guessing.

```
Title:
Summary (≤600 chars):
Full description:
Domain / category:
Progress: in_progress | completed | on_hold
Start / end date (YYYY-MM-DD):
Technologies:            Tools / frameworks:
Original GitHub repository (public github.com/owner/repo, or blank if private):
Adapted demo source URL (HTTPS, optional):
Experience mode: static | embed | external | video | native
  Live URL (HTTPS):      Video URL + transcript/description:
  Device info + install instructions (native only):
Fallback narrative (required to publish):
Thumbnail HTTPS URL + alt text (only images you own or may publish):
Credits: name | role | contribution statement | link profile? (only if that person has a verified, published profile)
Institution / program attribution (optional):
Featured? display order:
```

### R.I.S.E CRM specifics to confirm first

1. Is the repository public? If it's private, leave "Original GitHub repository" empty; the importer only reads public repos.
2. Can the demo be framed? Many CRM hosts send `X-Frame-Options`/CSP headers that block iframes. If so, use **external** mode, not **embed**.
3. Does the demo expose real customer data or need a login? If so, publish a video walkthrough or a sanitized demo instance, never production credentials or data.
4. Which contributors have verified, published student profiles? Link only those. Everyone else gets a manual credit.

## Steps (local or staging, never production from this branch)

1. Sign in with a staff account at `/admin/sign-in`.
2. `/admin/projects/new` → paste the repo URL → **Fetch repository suggestions** → review → **Apply suggestions to empty fields**.
3. **Check project matches**, then fill the remaining checklist fields.
4. Credits: search by name → **Add linked credit for …** → enter the real role and statement. Or use **Add contributor credit** for unlinked people.
5. **Save draft** → **Preview saved project** → **Publish directly** when it's correct.
6. Check `/projects/<id>`, the credited student's `/students/<profileId>`, and their dashboard.
