# Desktop map height regression — 2026-10-13

Baseline: 44654f097522b7dff366bd18b516c7d91462cfc2.

Removing the Production notice banner left a four-track desktop Grid with only header/main/footer in normal flow. Auto placement put main in the second auto-sized track and footer in the expanding third track. When only one report was visible, main shrank to list content height. Actual Production reproduction: 中正區 with one report, 1280×720 viewport; map stage 248px and footer 217px.

Minimal fix within the existing min-width:900px rule: place main explicitly in Grid row 3 and footer in row 4. Row 2 can be either the Demo banner or an empty zero-height auto track. No component, data, map camera or mobile rule changes.

Browser regression: tests/map-height-preview.html imports the existing 12-report local fixture and hides the Demo banner to reproduce Production's missing-banner layout. At 1600×900, filtering to 0, 1 and 10 displayed rows keeps map stage height at 588px and footer at 56px. Original Demo page retains its banner in row 2 and main in row 3 (549px map stage). At 400px mobile width, map stage remains 320px and no horizontal overflow is measured. No Production cases were created or changed.

Lint, Typecheck, Build and existing SEO check PASS. Browser-level layout tests are the relevant regression check; no redundant source-string unit test was added. Author review found no additional blocker. Before/after screenshots saved in the task visualization folder as map-height-before.png and map-height-after.png; their viewport dimensions differ as recorded above.

Production remains unchanged; release must follow normal PR review and authorization.
