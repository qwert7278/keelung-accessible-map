# Beta V2.1 verification — 2026-10-01

## Local checks

- `npm test`: 4 files, 16 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed; SEO metadata, safe routes, robots, sitemap, and 1200×630 Open Graph asset check passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: passed (Git may print a benign App.tsx CRLF normalization notice).
- Impeccable UI detector: no findings on the changed Admin/public UI files.
- Local Demo Admin: queue and counts visible; selected case action preloads `處理中`; admin note plus consent saves successfully and publishes the intended Demo status/history.
- Negative Admin UI: selecting `已改善` without an after photo shows the required-photo guidance and leaves save disabled.
- Demo reset restored all eight original sample cases after the local UI test.
- No cloud report, update, storage upload, or admin status mutation was made.

## Security and Auth context

- Supabase grants/RLS and SQL/API security evidence in `docs/verification.md` is historical and was not rerun in this UI-only pass.
- Current Supabase Auth Site URL and redirect allow-list were inspected and match the Production URL and local development routes.
- Magic Link code uses `PUBLIC_SITE_URL` and the unit suite verifies the `/admin` callback. A fresh owner email click/return was not performed in this pass.
- Frontend configuration uses publishable variables only; no service-role secret was added to the frontend.

## Deployment state

This document is local verification. Preview deployment and browser checks are tracked separately in `docs/seo-qa.md` after deployment. Production promotion is intentionally excluded pending the plan's explicit approval gate.

## Human acceptance still required

Physical phone/camera/GPS, denied-GPS/manual selection, keyboard-only, screen-reader, 200% zoom, and a real Admin Magic Link click/return.
