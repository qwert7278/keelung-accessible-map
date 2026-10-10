# Phase 3 final UX / Public Beta gate — 2026-10-10

Decision: **PUBLIC BETA NO-GO / PENDING**. Keep the Draft PR; do not merge or deploy Production until the real guest upload and physical phone gates close.

## Changes and review

Step 1 now contains nationwide address/landmark search, GPS, map adjustment, a read-only address/coordinate card and explicit location confirmation. Title, editable address and district selection are removed; manual coordinates stay collapsed. Step 2 keeps required photo, category, accessibility and optional description. Step 3 provides a generated editable title, photo preview, address/coordinates, category/accessibility, description, nearby duplicate warning and public consent.

All selection sources resolve trusted city/district polygons before becoming picked. Starting a new query/selection clears the old address, marker and confirmation. Late geography, GPS, reverse and next-step validation cannot commit after invalidation. Reverse addresses must match both the polygon city and district and never move coordinates; otherwise show address pending. Changing content or going back clears public consent. Backend payload requirements, RLS, MCP/OAuth, image processing and idempotency remain unchanged.

Scoped author/agent code review: no outstanding P0/P1 findings in these changes. Reviewed async cancellation, atomic geography/location updates, Next/submit guards, generated title validation and preview URL cleanup. This is not an independent maintainer APPROVED review.

## Evidence

| Check | Result |
| --- | --- |
| Location API/provider/polygon/title focused tests | PASS 46/46 |
| Photo contract/mobile image boundary tests | PASS 24/24; does not prove physical phones or Storage |
| lint / project typecheck / build / SEO | PASS; unchanged HEIC chunk size warning |
| Delayed geography A then new query B | PASS in real ReportForm local harness: old result leaves no card/Marker/Next |
| Latest cross-city candidate and Marker synchronization | PASS: Taipei/信義區/25.03177,121.5593; Marker center error under 2 px |
| Late GPS after editing query | PASS: no new selection/callback/Next |
| Old reverse after map selection then manual cross-city point | PASS: only latest Taipei coordinates/card retained |
| Map micro-adjustment | PASS: old candidate address cleared; location confirmation reset |
| Keyboard Enter/Escape and mobile 390x844 layout | PASS desktop Chrome viewport; options left aligned, about 54 px tall, internally scrollable |
| Genuine browser photo selection / third-page interaction | PENDING: ChatGPT Chrome extension rejected file upload, local file URL access unavailable |
| True anonymous Auth → Storage → report → case/map E2E | PENDING: staging previously had anonymous Auth disabled; no policy changed to force PASS |
| Physical iPhone Safari HEIC/JPEG / Android Chrome / mobile keyboard / screen reader | PENDING: devices unavailable; viewport is not a device test |
| Production RLS/bucket read-only check | PASS: reports/updates RLS enabled, writes owner-bound, admin update policy, no anon/authenticated SELECT of author/admin fields; public photo bucket JPEG/WebP <= 1 MiB |
| Existing Production deployment | READY c979667c6da2c29e5593e46e8a5345645206573c; this UX is not in Production |

Screenshots captured this task: desktop before, desktop after and mobile after under the Codex visualization directory (`phase3-before.png`, `phase3-desktop-after.png`, `phase3-mobile-after.png`). The supplied screenshot is additional prior before evidence. No new mobile-before capture is claimed.

## Release

Branch: codex/phase3-invite-ux. Draft PR: https://github.com/qwert7278/keelung-accessible-map/pull/14 . Production: https://roadtag.org . Production/rollback: c979667c6da2c29e5593e46e8a5345645206573c, dpl_96DqeSV9Rh9ybsK6yUJDEWwVa515. Original dirty checkout and existing untracked worktree files preserved. No Production report/photo/Auth/schema/env writes and no invite codes.

Remaining required closure: one safe isolated staging guest report/photo E2E under the intended anonymous policy, physical iPhone Safari and Android acceptance, followed by independent PR review and gated Production rollout/smoke. Private ChatGPT connector testing is not a website blocker.

## Short manual device acceptance (2–3 minutes each)

1. In an approved isolated staging environment with the intended anonymous Auth policy, open the website as a new guest. Search an address, choose a candidate, adjust the map and confirm the point. Verify city/district and final coordinates match.
2. On iPhone Safari choose a real HEIC/JPEG or take a photo; on Android Chrome take/select a photo. Check keyboard visibility, touch selection, cancellation, compression and preview. Choose category/accessibility and continue.
3. Review/edit title, location, photo and duplicate warning; explicitly consent and submit the identifiable staging QA case. Verify Storage image loads and the case URL/map show the exact confirmed point. Record device/browser, deployment SHA and outcome; clean only authorized staging QA data. Never make a synthetic Production case.
