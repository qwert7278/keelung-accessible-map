> Superseded for the final minimal UX revision by [Phase 3 final UX gate](phase3-public-beta-final-ux.md). Earlier race-only results below remain historical.

# Phase 3 final review closure — 2026-10-09

## Technical review

The confirmed P2 race was in ReportForm's search query handler: it aborted searchRequest but left selectionRequest active. A prior geographyAt result could then change city, draft address, map camera and onLocated after the user typed a new query.

The fix invokes the existing invalidateSelection() on every query edit and clears picked. This aborts selection, invalidates GPS/location revisions, clears the status and removes the selected Marker. Existing await continuations check their aborted signal, so late geography/district/reverse results cannot commit. No new service architecture, database permission, OAuth or MCP changes are involved.

Scoped technical self-review: **no remaining P0/P1/P2 code findings in the reviewed change**. Reviewed cancellation through geographyAt / districtAt / reverseLocation, stale search response checks, query debounce, cross-city parent callback and MapView camera, public/private build entries, and precise file scope. This is an author/agent review, not an independent maintainer APPROVED review; do not equate a PR review comment or green CI with external approval.

## Validation

- Location API/provider/real-polygon tests: 44/44 PASS.
- Deterministic local browser regressions using the actual ReportForm and Leaflet: 4/4 PASS. Quick search reversed replies; query edit before old selection finishes; reversed candidate completions; cross-city/address/callback/circle Marker synchronization and clearing on edit. Reproduce via [phase3-race.md](../tests/phase3-race.md).
- Full lint PASS; project typecheck/build/SEO PASS. Additional local test config/fixture typecheck and lint PASS. Production artifact contains neither phase3-race nor the Preview-only hosted QA page.
- Existing large HEIC chunk warning is unchanged and outside this fix.
- Original dirty checkout was not staged or committed. Existing dependency link / Phase 2 temporary files in this isolated worktree remain untouched.

## Public Beta decision

**PUBLIC BETA NO-GO** until necessary real acceptance evidence closes:

1. Genuine website guest report + actual photo Storage upload + resulting case URL remains **PENDING**. The staging project's pre-existing anonymous Auth restriction prevented guest submission in prior acceptance; this round does not alter Auth. No newly authorized genuine Production case/photo was supplied, and synthetic Production reports are forbidden. Read-only form entry and local/SQL tests are not complete live submission evidence.
2. Physical iPhone Safari remains **PENDING**, as does Android Chrome from the existing Public Beta gate. No physical camera/album/touch/keyboard/VoiceOver test was performed. Desktop/mobile viewport testing is not device acceptance.
3. Reviewed Production rollout and post-rollout smoke remain **PENDING**. Do not merge or deploy while gates 1–2 are open. Independent maintainer approval has not been asserted.

ChatGPT private Connector acceptance is not a website release blocker. Website guest reporting stays open without invitation codes. MCP, OAuth, Production Supabase and real cases remain unchanged.

Production was rechecked READY at `c979667c6da2c29e5593e46e8a5345645206573c`, deployment `dpl_96DqeSV9Rh9ybsK6yUJDEWwVa515`, https://roadtag.org . This is also the rollback SHA/deployment. The race fix is not in Production.
