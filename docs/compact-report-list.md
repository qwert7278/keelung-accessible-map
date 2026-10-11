# Compact report list — validation

Date: 2026-10-11
Baseline: 5bc5ee825dd08f768701efcf9bc0f917d8e127e3
Scope: public map sidebar only; no Production deployment or data changes.

## Changes

- Whole-row native buttons open report details and retain report.id map synchronization.
- Address occupies the left column; 72px lazy-loaded thumbnail occupies the right.
- Two-line title clamp; inline status/category; access status remains in the accessible name.
- Search and access filter share a row. Pagination stays outside the scrollable list.
- Detailed photos keep their existing bounded contain layout.

## Actual browser evidence

The existing local demo fixture uses 12 synthetic reports with portrait, landscape and square SVG images. These are not Production reports or real photo-upload tests.

| CSS viewport | Before | After |
| --- | --- | --- |
| 1600 × 900 | 1 fully visible row; second almost complete | 4 fully visible rows; fifth partial |
| 1750 × 1089 | Not measured | 6 fully visible rows |

Row height decreased from about 162px to 89px. List space increased from 323px to 389px at the comparison viewport. Ten reports remain on page one; two on page two. Short screens require list scrolling; six to eight rows are not guaranteed at every desktop height.

Screenshots saved locally in the task visualization directory as compact-list-before.png and compact-list-after.png, with matching 1600 × 900 screen captures.

PASS: Enter and Space open the correct details; second-page click opens the correct report; keyboard focus has a visible outline and highlights the corresponding ID; hover scales marker to 1.25 and raises z-index while preserving its original status color; search for 30號 returns the expected report; access filter produces the expected empty state; left list scrolls independently while page scroll stays zero and pagination remains visible.

PASS: 390px and 320px responsive layouts have no horizontal overflow or text/thumbnail overlap. Ten lazy-loaded thumbnails load with cover; detail images remain contain.

## Automated validation and review

- 40/40 affected tests: reportMapList, reportTitle, locationDisplay, mapCamera.
- Lint PASS.
- Typecheck, production build and existing SEO check PASS.
- Existing large HEIC bundle warning remains; no new dependencies or upload changes.
- Author Code Review: no blocking findings. GitHub reviewer approval is not implied.

## Limits / release handoff

- Physical iPhone/Android and Google Maps provider: PENDING; responsive browser checks use the local Leaflet demo.
- Mobile screenshot capture was unavailable; responsive DOM geometry was verified.
- Preview CI and Vercel must be checked on the PR before release.
- Production remains unchanged. Rollback/current baseline: 5bc5ee825dd08f768701efcf9bc0f917d8e127e3.
