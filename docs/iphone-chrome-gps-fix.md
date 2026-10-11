# iPhone Chrome GPS fix — 2026-10-11

## Scope and evidence

Base: main `35c166072ce89404b82fed726d5bb965a055c570`. Branch: `codex/iphone-chrome-gps`, isolated managed worktree. No Production writes, deployments, photos, credentials, MCP, OAuth, Supabase or SEO changes.

The physical iPhone report cannot yet be attributed to permission denial, timeout, unavailable coordinates or geography import failure. Confirmed source defects: all GPS errors discarded their code, the generic error was below the long form, acquisition timeout was only 10 seconds, a 30-second cached location was accepted, and geography loading had no user-facing deadline. Existing GPS success already uses the shared polygon-validated selection and camera revision; MapView requires no change. Default camera coordinates were already guarded by `picked`; retain and verify that guard.

## Fix

- Distinct denial/unavailable/timeout guidance directly beside the GPS button using `role=alert`; waiting uses `role=status`.
- Fresh position (`maximumAge=0`), high accuracy, 20-second acquisition timeout plus a watchdog for missing browser callbacks.
- Overall 30-second limit including polygon loading; no coordinate/marker/confirmation is committed on failure.
- Abort acquisition on a newer selection or unmount; retain revision checks after async geography. Late browser callbacks and late polygons cannot revive canceled coordinates.
- Search, map picking and manual coordinates remain available while GPS waits. An explicit user confirmation is still required.

## Validation

- 18/18 focused Vitest tests PASS: GPS failures 1/2/3, fresh fix/options, missing callback timeout, invalid coordinates, synchronous exception, cancellation, real district polygons and camera revisions.
- Lint PASS; TypeScript/build PASS; existing SEO build check PASS. Existing large-chunk warning remains unchanged.
- Actual local ReportForm + Leaflet, simulated GPS and delayed geography: success committed Keelung/仁愛區 25.12632,121.74139; one circle marker within 1.36px horizontally / 0.48px vertically of camera center.
- Permission denial: inline actionable alert, no selected card/marker, Next disabled.
- GPS success waiting for geography -> address edit -> late polygon result: no selected card/marker, Next disabled.
- Pending old GPS -> new Taipei candidate selected -> late old GPS: Taipei/信義區 25.03177,121.55930 preserved, one marker, no stale GPS accuracy message.
- Stalled geography: after 30 seconds the inline timeout appears, the button is enabled again, and a subsequent late polygon result still leaves no card/marker and Next disabled (PASS).
- These fixtures reject all writes and use no Auth/Storage service credentials.
- Physical iPhone Chrome: PENDING. Local simulation proves application state/camera behavior, not actual device permission or satellite acquisition.

## Code review

PASS (local source/diff review): cancellation checks before and after polygon resolution, no fallback location on failure, marker/camera share the committed point, no scope changes outside GPS/fixture/tests/docs. This is not a GitHub human APPROVED review. Keep Production unchanged until release approval.

## Physical acceptance still needed

On an iPhone in Chrome: permit location -> verify pin/card and camera at current place; deny location -> inline reason and disabled Next; low signal -> timeout then recover by search/map; change location while GPS waits -> old GPS cannot replace it. No report submission is needed for these checks.
