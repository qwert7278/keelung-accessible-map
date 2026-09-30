# Beta V2 verification

Date: 2026-09-30. Local branch: `codex/beta-readiness`. This document separates current local checks from historical cloud evidence.

## Current local checks

- `npm run lint`: pass after removing the now-unused `MapPinIcon` import.
- `npm test`: pass, 4 files / 16 tests, including new Magic Link provisioning, database admin check, anonymous-session denial, and stale-session race coverage.
- `npm run build`: pass, Vite production build completed.
- `git diff --check`: no whitespace errors (Git emitted only the existing Windows CRLF normalization notice).
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Local Playwright Demo UI: map/list contains exactly the three user-provided sample cases; desktop 1366×768 and mobile 390×844 inspected; mobile report form and bottom-sheet detail opened without submitting any report or update.
- Report form snapshot confirms GPS action, manually editable coordinates, optional address, and step labels. OSM tile attribution is visible. No Google Maps key is required.
- Completed a synthetic report through all three steps in a separate local Demo Mode browser with the repository's QA-only image; the stable success state offered view/share/return and correctly said the record remained in that browser. No cloud write occurred.
- Captured report step 2 and review states as well as the success dialog; the admin capture is the unauthenticated gate, not an authenticated admin verification.
- Checked horizontal overflow at 320×568, 360×800, 375×812, 390×844, 768×1024, 1366×768, 1707×960, and 1920×1080; document/body scroll widths matched the viewport in each browser emulation.
- No service-role key or secret was added to source or Vercel frontend configuration during this pass.

## Existing security evidence (historical)

`docs/verification.md` records earlier database SQL and real Supabase API negative tests, including anonymous Auth, report creation, community updates, Storage uploads, admin status updates, and attempts to modify admin-only fields, delete records, self-promote, or bypass rate limits. Those tests were run before this V2 turn and are not represented as rerun here. Preview and Production share the Supabase data/storage host, so this iteration performed no cloud write smoke tests and did not modify the three live sample reports.

## Not yet confirmed for this V2 Preview

- New code has not yet been pushed or verified in a fresh Vercel Preview deployment.
- The admin owner must click a one-time email link to verify the real admin route on Preview.
- The stable success UI is verified in Demo Mode; no live submission was created.
- Physical phone, keyboard-only, screen-reader, true 200% zoom, and GPS permission branches remain human checks.
