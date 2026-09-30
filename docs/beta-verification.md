# Beta Verification

Updated: 2026-09-30. Branch: `codex/beta-readiness` at `6e1b255`. Deployment stage: Preview only; Production changes are not authorized by this work.

## GitHub and Vercel

- GitHub Actions [Quality run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/36691344074): success for audit, lint, tests, and build.
- Vercel Preview: [keelung-accessible-ivmeo3q9j-masons-projects-2c78a251.vercel.app](https://keelung-accessible-ivmeo3q9j-masons-projects-2c78a251.vercel.app/), state READY and protected by Vercel Authentication.
- The local browser is not authenticated to Vercel. Use of a temporary Vercel Preview share link for browser-side Preview testing is pending explicit approval; it expires after about 23 hours. No share URL is recorded in project files.
- The existing Production deployment/domain was not changed.

## Local checks

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm test` | Pass — 3 files, 12 tests |
| `npm run build` | Pass — TypeScript and Vite production build |
| `npm audit --omit=dev --audit-level=high` | Pass — 0 vulnerabilities |
| SQL rollback tests | Existing 2026-09-30 evidence in `docs/verification.md`; re-run if a migration changes (none changed) |
| Cloud smoke | Not run in this review; it writes QA rows and files, and this run did not create QA data |

## Browser and responsive checks

Previously recorded in `docs/verification.md`: public feed loaded; reporting dialog and wide layout had no horizontal overflow. The baseline Escape test exposed focus loss.

Post-change local Preview (`http://127.0.0.1:5173/`):

- Help opens with all three steps, FAQ, retention, contact and removal application text. Escape returns focus to the Help control.
- Report dialog opens from the mobile header; Escape returns focus to “回報障礙”. Invalid form submission is stopped by native required-field validation. No report or community update was submitted.
- Opening a report updates the URL to `?report=<id>`; refreshing the page reopens the same report from the public feed.
- At 320 CSS px the document and dialog have no horizontal overflow; the dialog scrolls vertically. Across calibrated responsive checks the observed widths were 320, 393, 795, 1428, 1790 and 2015 CSS px, all with `scrollWidth === clientWidth`.
- The current browser test did not grant location/camera permissions and did not exercise 200% zoom or an actual mobile device.

This review does not claim real iOS/Safari, Android camera, real GPS denial, 200% zoom, or NVDA acceptance unless those checks are explicitly recorded below after execution.

## Security boundary

- No Supabase migration or cloud data change was made.
- No service-role or secret key is included in the Vite app.
- Preview must use only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, map-provider settings, and other public `VITE_` values.
- Source/dist marker scan found no service-role credential. The `sb_secret_` text found in the Supabase SDK chunk is its generic key-prefix parser, not a credential. The source/docs hits are explicit safety documentation. Git history marker search found no source commit containing the secret marker.
- Confirm Preview is isolated from production data before any data-writing cloud smoke.
- Production promotion remains a separate human gate.

## Beta readiness gate

Small closed Beta is recommended after local checks pass, the protected Vercel Preview is reviewed, and the operator completes the manual-device checklist in `docs/user-test-checklist.md`. Preview is READY; browser-side Preview review and updated screenshot files remain pending. The local interface was visually inspected, but the current browser capture was not exported as a repository asset. This document does not itself authorize public Production promotion.
