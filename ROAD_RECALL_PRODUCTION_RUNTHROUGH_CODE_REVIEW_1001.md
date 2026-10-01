# Road Recall Production Run-through Code Review — 2026-10-01

## Mission

Do not redesign the product first. The immediate goal is to prove that the already-live production reporting flow actually works end to end with one controlled QA case, then fix only the issues that can break or mislead the first real user.

Project: `C:\Users\qwert\Desktop\Road Recall system`

## Current verified state

- GitHub `origin/main` and `codex/homepage-map-markers` were synchronized at `684b6d1` before the guided-tour highlight change.
- Vercel Production is READY from the same `main` commit `684b6d1`; always re-check the final SHA after this pass is pushed.
- Production `https://keelung-accessible-map.vercel.app/` returns HTTP 200.
- The separate ChatGPT Sites homepage is the existing project `appgprj_6abca6ec70ec8191a60df8421aa7237c`; reviewed homepage version v6 was deployed to production at `https://keelung-accessible-guide.mason7278.chatgpt.site`.
- The live Sites homepage was fetched after deploy and contains the new public-record copy.
- The production JS bundle contains the live banner text and does not contain the Demo banner text.
- The production Supabase chunk contains the configured Supabase host, publishable-key code path, and anonymous sign-in code.
- Local `.env.local` is live mode: `VITE_DEMO_MODE=false`, OSM, Supabase configured.
- Latest local checks passed: 16/16 unit tests, ESLint, production build, SEO check, and `npm audit --omit=dev --audit-level=high` with 0 vulnerabilities.
- Historical API/SQL smoke tests passed, but they do not prove today's Production browser flow.

## Critical product rule

There is exactly one intended administrator: `lingwei2046@gmail.com`.

Authorization must still be enforced by the private database admin allow-list / UUID. Client-side email checks are only an extra UX/defense layer, never the final authorization gate.

## Guardrails

- Do not weaken RLS, grants, Storage policies, or private schema protections just to make a test pass.
- Never put a Supabase service-role / secret key in Vite, browser code, Git, logs, screenshots, or test output.
- Do not overwrite unrelated user changes. `site-homepage/index.html` currently has local modifications.
- Do not delete real reports or real photos.
- QA fixtures must be unmistakably synthetic and must be cleaned through a trusted admin/SQL path after verification.

## P0 — First prove Production can accept a real report

### 1. Verify deployment/environment before any write

Confirm the production deployment and its commit. Confirm the deployed app is not Demo and that Production has all required variables:

- `VITE_DEMO_MODE=false`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_SITE_URL=https://keelung-accessible-map.vercel.app` or the current canonical production domain
- `VITE_MAP_PROVIDER=osm` unless intentionally changed

Add a production build guard so a future Vercel Production deployment fails instead of silently falling back to Demo when required variables are missing.

Recommended rule: when `VERCEL_ENV=production`, require explicit `VITE_DEMO_MODE=false`, a valid Supabase URL, a publishable `sb_publishable_` key, and an HTTPS public site URL.

Do not rely on the current code's default:

```ts
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
```

That default is safe for local demos but dangerous for Production because a missing variable can produce a healthy-looking site that never writes to Supabase.

### 2. Controlled Production browser E2E smoke test

Use a fresh browser profile/incognito session against the actual Production URL. Do not use the Demo repository.

Create exactly one synthetic report with a title such as:

`[QA SMOKE 2026-10-01] Production upload verification`

Use a synthetic photo with no real face, plate, private address, EXIF GPS, or personal information.

The smoke test must prove all of the following in order:

1. Public page loads and the report button becomes enabled.
2. Anonymous Supabase Auth succeeds in a fresh browser.
3. Location can be selected manually inside the Keelung service envelope.
4. A JPG/PNG/WebP photo can be selected, compressed, previewed, and submitted.
5. Storage upload succeeds before the report insert.
6. The `reports` insert succeeds and returns a real report UUID.
7. The report appears in `report_feed` and in the public UI after refresh.
8. The public evidence image URL loads successfully.
9. The same report can be opened from a fresh browser/session using its share URL.
10. A normal community update can be added and appears in the public timeline.
11. A normal user cannot change the official report status.
12. Admin Magic Link login works only for the intended owner account.
13. Admin can change `open -> in_progress`.
14. Admin cannot mark `resolved` without the required improvement evidence.
15. Admin can upload a new improvement photo and change `in_progress -> resolved`.
16. The public report then shows the updated official status, evidence, and admin timeline event.

Capture the report UUID, Storage paths, browser/network errors, and screenshots needed to prove the flow. Do not expose access tokens.

### 3. Production QA cleanup

After the smoke test passes, remove only the QA fixture using a trusted Supabase/admin path.

Clean and verify:
- the QA report row,
- QA community update rows,
- QA private admin audit rows,
- every Storage object under that QA report UUID,
- any temporary QA Auth identity if one was created specifically for the test and safe removal is supported.

Then verify the QA title/UUID returns zero matching public rows and no QA Storage object remains.

Do not add frontend DELETE permissions for cleanup.

## P1 — Fix these after the first successful smoke test

### A. Reopened reports can reuse stale improvement evidence

Current logic accepts an existing `report.afterImageUrl` as sufficient evidence for any future `resolved` transition.

Problem flow:

`resolved with photo A -> reopen -> issue happens again -> resolved again without a new photo`

The old photo can incorrectly satisfy the second resolution.

Fix the lifecycle so reopening does not let stale evidence satisfy a later resolution. Preserve old evidence in history/audit, but require new current improvement evidence for a new resolution cycle.

Add a regression test covering:
- first resolution with photo,
- reopen,
- second resolution without new photo must fail,
- second resolution with new photo must pass.

### B. Storage upload happens before the database report insert

A failed report insert can leave orphaned photos. More importantly, the DB report cooldown does not rate-limit raw `before/` Storage uploads.

Do not solve this with frontend counters alone. Design a server-authorized upload reservation/ticket or another backend-controlled gate before broad public traffic.

At minimum document the current limitation and add monitoring/cleanup for orphaned evidence.

### C. Public browsing eagerly creates anonymous Auth users

`App.tsx` calls `repo.session()` during initial load, and the Supabase repository signs in anonymously when there is no session.

This means a read-only visitor consumes an anonymous Auth identity before they attempt to report or update anything.

Prefer lazy anonymous Auth: public browsing should use anon SELECT; create an anonymous authenticated session only when the visitor starts a write action.

### D. The app only loads the newest 200 reports

`src/services/supabase.ts` currently orders by `created_at desc` and uses `.limit(200)`.

Once there are more than 200 reports, older reports disappear from the public map/list, search, counts, and Admin workspace because all those surfaces share the same in-memory dataset.

This is not a blocker for the first smoke test, but it must be fixed before meaningful scale.

Implement pagination / viewport querying. Admin should have server-side pagination. Nearby duplicate detection should use a spatial/server query rather than the same 200-row feed.

### E. Mobile photo compatibility needs a real-device acceptance test

Current image code accepts only:
- JPEG
- PNG
- WebP

It rejects unsupported MIME types and rejects the original file when it exceeds 10 MB before compression.

Test at minimum:
- current iPhone Safari: camera capture and photo-library selection,
- current Android Chrome: camera capture and photo-library selection,
- a large phone photo,
- HEIC/HEIF selection behavior.

Do not add a heavy HEIC dependency blindly. First reproduce the actual browser behavior. If HEIC is rejected, provide either a tested conversion path or a clear user-facing fallback.

### F. Single-admin rule

Production is intended to have exactly one administrator: `lingwei2046@gmail.com`.

Verify through a trusted backend:
- `private.admin_users` contains exactly one authorized user UUID,
- that UUID belongs to the intended email account,
- anonymous identities and ordinary signed-in accounts fail `is_admin()`.

Optionally reject other email addresses in the admin UI before requesting a Magic Link, but keep database UUID authorization as the authoritative gate.

## P2 — Quality/maintenance follow-up

### 1. Add the separate public homepage to CI

The new `site-homepage/index.html` is a separate static artifact and is not meaningfully covered by the Vite unit/build pipeline.

Add lightweight checks for:
- valid HTML,
- local asset existence,
- broken internal/external critical links,
- homepage JavaScript smoke behavior,
- Supabase public-feed fallback behavior,
- no secret/service-role credential patterns.

Do not overwrite the user's current uncommitted changes in `site-homepage/index.html`.

### 2. Add an automated regression around the real write contract

Keep unit tests, but add an integration test that verifies the exact public contract:
- anonymous auth,
- Storage ownership,
- report insert,
- safe feed projection,
- community update,
- official status denial for ordinary users,
- exact admin authorization,
- required improvement evidence.

The existing `scripts/cloud-smoke.mjs` is explicitly documented for a dedicated test project. Do not run it blindly against Production because it creates fixtures and has no automatic trusted cleanup.

### 3. Keep deployment identity visible in verification docs

Every production verification record should include:
- Git SHA,
- Vercel deployment ID,
- canonical URL,
- timestamp,
- whether the test was read-only or performed writes,
- QA fixture UUIDs when applicable,
- cleanup verification.

This prevents a passing Preview/local test from being mistaken for proof about Production.

## Required local gates before deployment

Run from a clean understanding of the current working tree:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm test
npm run build
```

Also rerun the SQL privilege/RLS tests against the intended backend after any authorization or evidence-lifecycle migration.

## Stop conditions

If any P0 smoke step fails, stop the happy-path test and diagnose that exact boundary. Do not loosen authorization.

Examples:
- report button never enables -> inspect Production anonymous Auth/session behavior,
- photo upload is 4xx -> inspect Storage policy/path/owner/MIME before touching RLS,
- report insert fails -> inspect PostgREST error, city bounds, photo ownership, rate limit, and column grants,
- report is inserted but not visible -> inspect `report_feed`, the 15-second refresh path, filters, and current 200-row cap,
- admin Magic Link fails -> verify the existing Auth identity, redirect allow-list, Site URL, email delivery, and exact admin UUID,
- admin update affects zero rows -> verify `is_admin()`, RLS, and optimistic `updated_at` match.

## Deliverables from Codex

1. A short findings summary: what actually failed or passed in Production.
2. Any minimal code/migration fixes required for the P0 flow.
3. Tests for each bug fixed.
4. `docs/production-smoke-2026-10-01.md` with deployment SHA/ID and evidence.
5. Updated `docs/verification.md` only after the current Production flow is actually verified.
6. A cleanup record proving the QA fixture was removed.
7. No unrelated redesign and no service-role credential added anywhere.

## Priority order

1. Prove Production end-to-end report creation and admin handling.
2. Add Production env fail-fast guard.
3. Fix reopen/new-evidence lifecycle if reproduced.
4. Verify single-admin authorization.
5. Verify real phone photo selection/upload.
6. Address Storage abuse/orphans before wider promotion.
7. Replace the 200-row global feed before scale.
8. Add the separate homepage to CI.

The definition of done for this pass is not “the code builds.” It is: one controlled Production report has successfully traveled through photo upload, report creation, public display, community update, owner-admin moderation, resolution evidence, and trusted cleanup, with no authorization rules weakened.

## Guided-tour interaction visibility requirement

The guided reporting tutorial must make the **next thing the user should click or upload** visually unmistakable.

Current target mechanism: `.guide-target-active`.

Required behavior:
- The active target gets a clearly visible pulsing/glowing border, not just a static outline.
- Apply it consistently to the current location/map choice, title field, photo uploader, wheelchair-access choice, consent checkbox, Next button, and final Submit button according to the guided step.
- The glow must remain usable on desktop and narrow mobile layouts and must not obscure button/input text.
- Respect `prefers-reduced-motion: reduce`: disable the pulse animation but keep a strong static outline/glow.
- Do not blink the entire page or use rapid flashing.
- Only the current actionable target should receive the active glow.

Acceptance test:
1. Start the guided tutorial from a fresh browser state.
2. Walk every tutorial step in order.
3. At each step, verify the exact next actionable control is visibly highlighted.
4. Verify the highlight moves after the expected action.
5. Verify the Next and final Submit buttons glow when they become the instructed action.
6. Repeat at desktop width and approximately 390px mobile width.
7. Repeat with reduced-motion emulation and confirm the target remains obvious without animation.
