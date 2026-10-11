# Map list and address refinement

Base: cc01d0aab00c7882c1f56d293c835213afb9da9c. Local branch only; no Production writes.

- Ten reports per page; desktop cards center the map at zoom 17 without a blocking dialog. Separate details control, mobile card details behavior retained.
- Address-first cards, visible category/accessibility, normalized Taiwan street/house ordering, hidden postal codes and country. Marker labels and public detail headings use the same location/category presentation; admin report data remains untouched.
- Missing addresses resolve only when a report is selected, via the existing reverse endpoint. Same-city/district results are labeled nearby; lookup never moves the marker or writes the database. Cancellation prevents a previous selection updating the active report. Missing/failed/coarse results remain explicitly unknown.
- No mass geocoding, no backfill or fabricated doorplates, no MCP/OAuth/Storage changes.

Validation: 53 focused address/camera/location API tests; lint, typecheck, build and SEO check. Isolated localhost:5191 demo fixture: 12 local records, 10+2 pagination, desktop focus zoom 17 with zero dialogs, selected nearby address, details read-back; 390px mobile opens details and has no horizontal overflow. Physical devices and live provider address for previously empty Production records remain unverified; fixture reverse result is mocked. Production baseline unchanged.


## Map/detail UX review (2026-10-11)

- Based on main `12fcc3f`; includes the previously pending ten-row list and desktop click-to-focus changes.
- List hover and keyboard focus temporarily highlight the same report ID. Click keeps the selection; closing clears it. Focus restored to a list control can still highlight that control until focus leaves, as expected for keyboard navigation.
- Leaflet and optional Google markers retain their status classes. Highlight only changes scale, outline and z-index. Marker nodes are reused while marker data is unchanged, preserving keyboard focus.
- Public main/evidence photos use `contain` within `min(42dvh, 360px)`; list thumbnails retain `cover`. Enlarged inline viewer is unchanged.
- Shared display formatting removes countries/postcodes from public addresses and generated titles; saved records are not rewritten. Custom titles are preserved. English streets remain English; no guessed translation or missing house number is added.

### Verification

- 35 focused Vitest cases PASS: Taiwan addresses, title generation/custom title preservation, nearby address validation and camera changes.
- Lint, Typecheck, Production build and existing SEO check PASS.
- Local browser: keyboard ID `list-qa-1`, click ID `list-qa-2`, hover ID `list-qa-1`; scale 1.25 and z-index >10000, original open status color retained.
- Pagination 10 + 2 rows; click on second-page report selects `list-qa-10`; closing and moving focus away clears all highlights. Empty filter removes markers.
- Synthetic local image dimensions 300x600, 600x300, 600x600 all use contain. At 390px viewport, portrait image box 280x355, no horizontal overflow; modal scrollHeight 902 > clientHeight 828 confirms vertical scrolling remains available.
- Code Review: PASS (author review; no independent approval claimed). Checked stale callbacks, ID selection after pagination/filtering, marker focus retention, custom titles, scoped image rules and protected-feature diff.
- Physical iPhone/Android and optional Google provider live checks PENDING. No Production writes or uploads; QA is isolated local Demo data.
- Existing HEIC chunk-size warning remains outside scope. No new dependency, migration, RLS/MCP/OAuth/GPS/upload change.
- Production unchanged; release/rollback baseline `12fcc3ff00f01fe0d404d7dc827429fb8aab1620`.
