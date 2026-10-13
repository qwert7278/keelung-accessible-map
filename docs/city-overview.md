# City overview and administrative outlines — 2026-10-13

Baseline: 1440fd837c601c30715de7501672be5344913b1c.

“All districts” previously reused the city’s zoom-16 downtown starting view. It now uses fitBounds and the existing official district polygon assets. The shared selector puts all districts first. Fresh entries and city switches start with the existing configured downtown district and center of each city, not a report-count ranking. Consented valid saved district preferences are restored only for unscoped visits. Explicit district/report URLs remain respected; choosing all districts deliberately opens the city overview. Homepage map and matching FAQ/schema copy follow the same behavior.

Outlines show district subdivisions and the resulting city outline; no approximate county border is invented. They are lazy-loaded, noninteractive and separate from report markers. City/district changes cancel stale outline loads. Selecting a report disables overview camera fitting, preserving its close-up; closing it restores the overview.

Overview fits the main land polygon of every district. Keelung’s distant unreported islets otherwise dominated its full official bounding box. All loaded reports, including offshore reports, are included in the fitted bounds. All polygon components remain in the outline data. Empty/failed outline loading falls back to existing city bounds. No new mapping API, packages, database or write flow.

Validation: 17/17 geography, district-boundary and camera tests; lint, typecheck, build and SEO check PASS. Local browser: Keelung seven district outlines and all 12 demo markers; all 22 city options keep all districts first and city switches select the configured center (Keelung 仁愛區, Taipei 中山區); manually choosing all districts shows Taipei with 12 outlines and Keelung with seven; individual 中山區 clears overview; report selection opens detail with close-up and clears outlines; mobile 400px retains outlines without horizontal overflow. Screenshots: city-overview-keelung.png and city-overview-taipei.png in task visualization output. Production unchanged, no fake reports.

Google provider implementation uses the same shared bounds and polygon data; live Google Maps and physical phones remain PENDING (no additional credentials used). Author code review found no blocker. Existing ten-row pagination and loaded-feed limits are preserved: “all” removes district filtering, not other active filters or feed pagination.
