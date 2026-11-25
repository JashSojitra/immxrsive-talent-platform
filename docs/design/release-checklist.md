# PR #14 release checklist

Release candidate: `feat/immxrsive-ux-overhaul` → `main`. Validation evidence is on the PR and in the "Release validation" GitHub Actions workflow.

## Facts checked before release

| Item | Finding |
| --- | --- |
| Production migrations | **None.** PR #14 changes nothing under `drizzle/`. The migration journal matches `main`. Do not run `db:migrate` for this release. |
| New runtime environment variables | **None.** The only new `process.env` reads are in local screenshot scripts (`DESIGN_PREVIEW_URL`, `IMMXRSIVE_CAPTURE_DIR`). Existing production variables stay as they are. |
| Deployment trigger | The Vercel Git integration creates a **Production** deployment from every push to `main` (`vercel[bot]` deployments for `d94cfd8`, `34426d8`, …). **Merging PR #14 deploys production.** Recent branch pushes (`9222bc2`, `37292ea`) created no Vercel deployment or commit status. |
| Current production | `d94cfd8` (frozen R4 on `main`), deployment status `success`. This is the rollback target. |
| `R4-submission` tag | `4d41de783069b4afcad8e43e87a26f19648e6d38`, unchanged. |
| Secrets | None in the branch diff. CI uses throwaway credentials only and uploads logs/JUnit, never traces or session state. |
| New dependencies | UI only: `motion`, `lenis`, `swiper`, `@fontsource*`. |
| Permission changes | The new `GET /api/admin/profiles` requires `xr_admin`/`platform_super_admin`. Staff credits grant no membership, maintainer or edit rights (unit, integration and browser tested). Student route extractions keep identical auth guards. |

Not verified from here: the Vercel production environment variable values. Reading them would expose secrets, and the Vercel CLI is not installed. Before merging, check in the Vercel dashboard that the Production variables are unchanged from the working `d94cfd8` deployment.

## Merge (human)

1. Confirm the latest "Release validation" run on the PR head is green.
2. Review the PR and mark it **Ready for review**, then merge into `main`. Merging starts the production deployment.
3. Note the merge commit SHA and watch Vercel → Deployments until the Production build is **Ready**.

## Production smoke tests (within 15 minutes of deploy)

Check at desktop width and at a 390px phone width:

1. `/`: hero X renders (or poster fallback), headline readable, carousel swipes, no console errors.
2. `/talent`: directory loads with published profiles; search and filter work.
3. `/projects` and one `/projects/<id>`: list, detail, contributors, source links.
4. `/showcase`: renders (empty state or published experiences). An embed launches only on click, in a sandboxed iframe.
5. `/partners`: directory and one partner detail.
6. Mobile menu: opens, Escape closes it, focus returns to the button.
7. `/student/sign-in` → sign in → `/student/dashboard` loads. Do this with a test account, not real student data.
8. `/admin/sign-in` with a staff account → `/admin` loads. `/api/admin/identity` returns 401 when signed out.
9. With OS-level reduced motion enabled, the homepage shows no scroll-driven animation.
10. The Vercel function logs show no new 5xx errors.

Don't create, publish or edit production records as part of smoke testing.

## Rollback

There are no schema changes, so rollback is code-only and safe.

1. **Fastest:** in Vercel → Deployments, open the previous Production deployment (`d94cfd8`) → **Instant Rollback** (or **Promote to Production**).
2. **Then fix `main`:** run `git revert -m 1 <merge-sha>` on a branch, open a PR and merge it, so the next push doesn't redeploy the broken version.
3. Re-run smoke tests 1–5 on the restored deployment.
