# Road Tag — Geoapify Location integration (2026-10-08)

## Status
Implemented in isolated local worktree `C:\Users\qwert\Desktop\roadtag-geoapify-build`, branch `feat/geoapify-location`, based on origin/main 9e740b2. NOT deployed; not connected to the owner's Geoapify project. Production remains unchanged.

## Geoapify dashboard owner handoff
1. Sign in to https://myprojects.geoapify.com/projects
2. Create a project named `Road Tag`, or select the existing Road Tag project.
3. In API Keys, use a server-side key. Do not paste the key into ChatGPT, Git, a public screenshot, or VITE_ variables.
4. Add `GEOAPIFY_API_KEY` as a Vercel **Secret** in a staging environment only.
5. Add `GEOAPIFY_LOCATION_ENABLED=true` to staging environment only. Leave false/unset in Production until quota protection and Taiwan acceptance tests are complete.
6. Geoapify's optional referrer restrictions are intended for browser calls. For server-side Vercel traffic, verify restriction compatibility before enabling IP allowlisting; avoid binding to an unstable serverless egress IP.

## Endpoints
- `/api/location/search?q=基隆長庚&cityId=TW-KEE` — 5 candidates maximum, Taiwan filter
- `/api/location/reverse?lat=25.13&lng=121.74` — reverse
- `/api/location/capabilities` — enabled only when both configured environment variables are present
- MCP `resolve_location(query="基隆長庚")` — candidate list; does not create reports or treat a POI as the obstacle coordinate

## Acceptance checks before any Production release
- Genuine API results for 基隆長庚 / 基隆廟口 / 基隆火車站 / 仁二路 / 台北車站 (including common abbreviated searches)
- Correct Taiwan city/district labels, especially villages/townships and municipalities; polygon validation remains authoritative
- Manually move obstacle marker after selecting POI and confirm nearest address never overwrites the exact coordinate
- Search/reverse timeout, network failure, missing-key fallback, abort, key non-disclosure, mobile accessibility
- Shared/distributed rate limiting and provider quota monitoring: existing limiter is per instance only; not suitable as a production hard spend cap
- Validate Geoapify POI coverage before claiming Google Maps equivalence

## Verification
Focused mocked tests: 31/31 PASS (2026-10-08).
Typecheck on isolated worktree blocked by existing linked node_modules lacking `ipaddr.js`; restore dependencies to the exact lockfile and rerun tsc/build before release.
No real Geoapify API smoke performed (account key unavailable). No Production config or DB changes.
