# Mobile report compact layout — 2026-10-11

Base: main `42705cadb3324c7430d5f9a5c93de0df031e6934` (includes GPS fix). Isolated branch: `codex/mobile-report-compact`.

## Change

Only the report dialog receives compact styles below 700px: viewport-bounded dialog, independently scrolling fieldset, fixed visible action row, shorter map/photo preview, compact selected address, hidden manual coordinates and redundant coordinate/district labels. Location confirmation, photo privacy guidance, obstruction category, access radios and final public-content consent remain visible. Close stays in the header; the duplicate footer cancel is hidden on mobile. Manual coordinate entry is removed at every width per the follow-up request.

Step changes reset both dialog and content scroll to zero and focus the current step heading without scrolling. Existing photo processing, GPS cancellation, district selection, repository, MCP/OAuth and backend behavior are unchanged.

## Validation

- 390x844 CSS viewport: selected step 1 body overflow 0; step 2 after synthetic JPEG passed real compression, preview 96px and body overflow 0; step 3 body overflow 0. The dialog is bounded to the viewport minus 16px.
- 320x569: necessary body scroll remains (observed step 3 overflow 161px), footer bottom 560px stays inside viewport. No content clipping to force a one-screen layout.
- Step 2 -> step 3 -> step 2: content scrollTop 0; heading focus; existing photo retained. Public consent required before Submit enables. No submit clicked.
- Keyboard Tab from description reaches previous-step control; camera/gallery, access choices and footer hit areas approximately 44px.
- Follow-up: manual coordinate disclosure and its unused state/handler removed at every width; helper/ARIA text now describes search and map picking.
- 24/24 focused tests PASS (geolocation, actual polygon selection, address formatting); lint PASS; typecheck/build/SEO check PASS.
- Impeccable detector: one existing progress-width animation warning at styles.css:897; no new findings in changed layout.
- Browser screenshot capture unavailable; geometry and actual UI actions recorded above, no fabricated screenshot evidence.
- Physical iPhone/Android camera, keyboard and safe-area behavior PENDING. Browser viewport simulation does not establish device acceptance.

## Review and release

Local code review PASS: mobile selectors are scoped to report-modal; other dialogs retain existing behavior; closed dialogs remain hidden; long/error/nearby content can scroll; controls and privacy confirmation retained. No Production data or writes. This is a local change, not a Production release. No push/merge/deploy in this request.

## Confirmation page follow-up

- Review displays one location line and one category/access line; description appears only when provided. Duplicate district, coordinates and empty-description placeholder removed.
- Title remains editable inside a native disclosure. Public-photo consent and nearby-report warning retained.
- Submit progress is announced in the disabled submit button; the separate upload status block is removed and progress resets on each attempt.
- Local synthetic JPEG flow: title disclosure opens, unchecked consent blocks submit, checked consent permits submit; observed disabled `送出中… 0%`, then successful dialog close. QA repository simulates progress only and creates no report or backend upload. Preview reopened and left at step 3 with consent unchecked.
- This follow-up lint, typecheck/build and SEO check PASS. Physical devices and real backend upload are not newly verified by this UI simulation.
