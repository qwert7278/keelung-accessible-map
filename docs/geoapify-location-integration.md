# Geoapify location integration — Phase 2A (2026-10-08)

Reused `feat/geoapify-location` at `C:\Users\qwert\Desktop\roadtag-geoapify-build`; preserved the original implementation and merged origin/main `51946859ae30de2a6df1e37aeac14f1b100c93b7`. Independent `npm ci` completed; no shared dependency mutation.

## Runtime
- Server-only `GEOAPIFY_API_KEY` Secret plus exact `GEOAPIFY_LOCATION_ENABLED=true`; defaults disabled. No VITE_/NEXT_PUBLIC_ key.
- Taiwan autocomplete and reverse, language zh, 5 s timeout, no redirects, at most five candidates. `19之1號` normalizes to `19-1號`; only Taiwan candidates with valid bounds returned.
- Confidence and match precision retained. All candidates require confirmation, including single/high-confidence doorplates. A POI center or street match is not the precise obstacle location.
- MCP query keeps existing five tool names/input schemas. Candidate lat/lng/city_id/district come from bundled authoritative polygons; zero matches requests clarification. `city_hint=基隆市/TW-KEE` biases ranking only. Query mixed with coordinates is invalid. Coordinates remain available with provider off or failing; no photos/OAuth/RLS changes.
- Website uses existing search/map selection and reverse entry points. Debounced autocomplete; stale calls aborted. Reverse never moves the user's exact marker. Geoapify/OSM attribution shown in location search.
- Public website geocoding is intentionally available without login; foreign Origin/cross-site calls rejected. MCP geocoding remains behind existing OAuth and live principal/client gates.

## Quota and privacy
- Existing website 30/network/min, 300/runtime/min; MCP 20/actor/min, 100/runtime/min. Shared upstream budget 80 calls/runtime/min and 1000/runtime/UTC day includes failures and reverse.
- These are in-memory instance ceilings, NOT distributed account-wide spend caps. Owner must verify provider Free quota, no paid upgrade/overage, API restrictions and alerts. Owner confirmed rotated staging Secret saved and free limits verified this run. No key was read by the agent.
- No raw query, authorization, IP, key or signed URL logging. Provider errors are sanitized. Production smoke is read-only, no synthetic reports.

## Verification and release gates
- Focused provider/client/location-safety tests 71/71 PASS, including variants, multiple/low-precision/no candidates, 429/5xx/timeout, disabled/missing key, invalid input, cross-origin and budget reset.
- Official MCP query transport PASS with unchanged five tools; nearby handoff and unconfirmed write denial. Existing three-read transport/strict-schema/anonymous regression PASS for both protocol versions.
- Targeted ESLint PASS. TypeScript/Vite/SEO production build PASS (existing large-chunk warning only).
- Staging live HTTP, actual ChatGPT query and Production acceptance PENDING until recorded below. Mock PASS is not hosted PASS.

## Environments and rollback
Staging uses the existing dedicated alias and `fix/mcp-phase1c-production-oauth-gates` Preview env scope; deploy the exact reviewed feature SHA with this scope. Do not change OAuth tuples. Production keeps successful main/MCP/OAuth until staging passes and release review completes.
If location smoke fails: turn off only GEOAPIFY_LOCATION_ENABLED and redeploy/restore prior healthy version. Never switch off successful MCP/OAuth for a provider failure. Prior Production `51946859ae30de2a6df1e37aeac14f1b100c93b7` / `dpl_E52mrxdYVX7DU4rAiJZRxHGZVm9q` is the rollback baseline.

Provider references: https://apidocs.geoapify.com/docs/geocoding/ and https://www.geoapify.com/pricing/ . Confidence is advisory; coverage must be verified with actual Taiwan queries before claiming address-only readiness.

## Hosted acceptance — 2026-10-09
Staging exact feature SHA 8d391bf: real ChatGPT 4/4 PASS, exactly five tools. Dedicated staging deployment dpl_HRHhuqhVdaKyWafiZdLrTTwbeG8N. Production PR #11 merged as 10ffd3fb6fac72201f1986c5c397e6dcad62e4cb, deployment dpl_ELukpdc7u7jNbHxpwS56rbcsw5D8 READY and roadtag.org alias verified. Owner saved Production Secret; agent verified type/scope only and saved GEOAPIFY_LOCATION_ENABLED=true Config.
Production real ChatGPT address, landmark, coordinates and nearby: 4/4 PASS. Doorplate yielded full-match 0.95 and street 0.5 candidates; landmark three choices; confirmation always required. Website autocomplete displayed both doorplate candidates; existing real WebP photo loaded 1109x1477. Home/map/OAuth metadata 200, Production issuer correct, legacy MCP GET503. No synthetic report or write smoke. Extra anonymous POST negative probe rejected by automatic approval review and omitted. Runtime error/fatal count query returned no rows; log visibility does not establish complete absence of errors.
Address/landmark descriptions now work for invited users without Google Maps URLs. Public connector access remains unavailable. Prior baseline deployment retained for rollback.
