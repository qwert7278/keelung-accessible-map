# Phase 3 selection race regression

Run `npx vite --config tests/phase3-race.config.ts --host 127.0.0.1 --port 5178 --strictPort`, then open `/tests/phase3-race.html`. Use the actual printed port if intentionally changing it. This explicit local config substitutes only the asynchronous geography resolver. ReportForm and Leaflet remain real. Deferred search ignores abort deliberately, so late completions exercise the production cancellation checks. All repository writes reject; no Auth, Storage or service key is used. Neither this page nor config is a Production build entry.

1. **Quick search, reversed responses:** type 舊地址; wait for 完成搜尋 1. Type 臺北新地址; wait for 完成搜尋 2. Complete 2, then 1. Focus the search field / ArrowDown. Only 臺北新地址 must appear.
2. **Edit while selection awaits:** select that candidate with Enter (完成位置 1 appears). Type 基隆新位置 before completing position 1. Complete position 1. No selected-location card, address update, onLocated callback or circle Marker may appear. This is the regression: the prior query handler never aborted this selection.
3. **Switch candidate / reversed selections:** complete the 基隆新位置 search and select it (position 2 pending). Type 臺北吳興街4; complete its search, select it (position 3 pending). Complete position 3 first, then position 2. The city/district/address/coordinates must remain 臺北市 信義區 / 25.03177,121.5593. The callback must remain TW-TPE/信義區/25.03177,121.5593.
4. **Marker sync:** after case 3, there must be one circle in the actual Leaflet overlay. Its center must coincide with the map viewport center (within 2px after the camera render), and the card must show the latest coordinates. Edit the query again; the pending selection/selected marker must clear rather than authorize the old point.

Local browser run on 2026-10-09: cases 1–4 PASS. Actual DOM: canceled selection `address=''`, callback `none`, markers `0`, card absent. Final reverse-order completion: Taipei address/callback retained, markers `1`; marker center `(847.03,49.68)` versus map center `(846.00,50.15)` (<2px). The separate real-polygon unit tests validate Taipei geography without the resolver substitute. These tests do not establish physical iPhone / Android or live Storage upload acceptance.

## Final minimal UX regression — 2026-10-10

The local fixture now queues GPS and reverse responses as well as geography/search. Every write still throws.

- Candidate A pending → edit B → finish A: no card/Marker, callback unchanged and Next disabled (PASS).
- Select and finish B in Taipei: district, draft coordinates and callback Taipei/信義區; camera center and circle agree within 2 px (PASS).
- Start GPS → edit new query → finish GPS: no selection or callback update and Next disabled (PASS).
- Click map A → finish geography, hold reverse 1 → expand manual coordinates and enter 25.03177 / 121.5593 → finish geography 2 → finish reverse 1: latest Taipei point remains, no stale address (PASS).
- Mobile-sized actual form: choose Taipei candidate, click map to adjust → address clears to pending, coordinates update and confirmation/Next remain false (PASS).

These are local browser regressions, not real Auth/Storage submission or physical mobile acceptance.
