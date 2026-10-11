# Map list and address refinement

Base: cc01d0aab00c7882c1f56d293c835213afb9da9c. Local branch only; no Production writes.

- Ten reports per page; desktop cards center the map at zoom 17 without a blocking dialog. Separate details control, mobile card details behavior retained.
- Address-first cards, visible category/accessibility, normalized Taiwan street/house ordering, hidden postal codes and country. Marker labels and public detail headings use the same location/category presentation; admin report data remains untouched.
- Missing addresses resolve only when a report is selected, via the existing reverse endpoint. Same-city/district results are labeled nearby; lookup never moves the marker or writes the database. Cancellation prevents a previous selection updating the active report. Missing/failed/coarse results remain explicitly unknown.
- No mass geocoding, no backfill or fabricated doorplates, no MCP/OAuth/Storage changes.

Validation: 53 focused address/camera/location API tests; lint, typecheck, build and SEO check. Isolated localhost:5191 demo fixture: 12 local records, 10+2 pagination, desktop focus zoom 17 with zero dialogs, selected nearby address, details read-back; 390px mobile opens details and has no horizontal overflow. Physical devices and live provider address for previously empty Production records remain unverified; fixture reverse result is mocked. Production baseline unchanged.
