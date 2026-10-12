# Stable release audit and LINE compatibility — 2026-10-12

Decision: STABLE for continued operation; one non-blocking P2 fix remains in a separate PR. No P0/P1 was found in the checked scope. This is not a claim of completed LINE device acceptance.

Production SHA: d891240396f60da12928fc750721a3d4f35dfa17
Deployment: dpl_4WBjfs3LF37fb5V3TqBEFe86hikH (READY, roadtag.org alias verified)
Rollback SHA: 5bc5ee825dd08f768701efcf9bc0f917d8e127e3
Rollback deployment: dpl_9cWDETri462JivYrYoB76GyCQLux

## Evidence

PASS: homepage, map, how-to, about, robots and sitemap return HTTP 200. Production canonical URLs match roadtag.org; robots permits public indexing; sitemap lists the six intended public routes. The protected reviewed Preview was fetched through the authorized Vercel connector: correct map title and noindex present.

PASS: public map renders 15 loaded tiles and ten list rows for 12 reports. Search for 忠四路 returns the matching row. Page-two report opens by ID, and reloading its URL opens the same public detail. Its original photo loads with contain. Production Geoapify search returns the requested 精一路19號 candidate; selecting it resolves the position and permits step two. A synthetic QA JPEG was selected and processed locally in the form with a loaded preview and no error. No submit action, Storage upload or report creation was performed.

PASS: actual 320px responsive viewport measurements show no horizontal overflow on homepage/map and no list text/thumbnail overlap. Local isolated form permits map picking. GPS failure/cancellation and HEIC/JPEG processing have automated unit coverage, not LINE device proof.

Runtime monitoring: no error/fatal groups in the available 45-minute Production window. Other times and client-side errors are not covered.

## P2 — explicit search button loses combobox focus

Reproduction on Production and isolated existing fixture: enter an address (or 慢搜尋 in local QA), click 搜尋, and wait. The API has results, but disabling the focused button moves focus to BODY, triggering the component blur handler. The result list is hidden until the user focuses the input again. Before: five result nodes, aria-expanded=false, list hidden. After: five visible results, aria-expanded=true, focus retained on the combobox.

Minimal fix: focus the existing combobox at the beginning of the button click handler, before initiating loading. No API, provider, layout, permission, persistence or production configuration change. Keyboard ArrowDown/Enter selection and manual map picking were checked after the fix. Regression uses tests/phase3-location.html and its existing delayed mock responses.

Validation: 63/63 tests across geolocation, images, images.mobile, reportLink and locationDisplay; changed-component ESLint, Typecheck, Build and SEO check PASS. Author review finds no additional blocker. Physical devices remain unverified.

## LINE compatibility — PENDING

No iPhone/Android LINE WebView is available in this environment. Map loading, native location permission, camera/gallery picker, true HEIC/JPEG decode, network upload and cross-browser session behavior must be checked on real devices. Desktop responsive sizes and synthetic mocks do not establish those results. Real create/upload acceptance should use staging or an explicitly authorized genuine report; never a fake Production report.

Existing implementation uses standard file inputs with separate camera capture=environment and gallery selection; cancellation keeps the form/photo, parsing and dimension guards precede decoding, HEIC has a fallback decoder, and resized canvas re-encoding removes source metadata. Failed processing has an alert. Geo denial/timeout explains alternatives without inventing GPS coordinates. These are code-level findings.

P3 / future option: no existing external-browser fallback link or unsent-form warning is implemented. This is not a demonstrated WebView failure, so it is recorded without adding a new feature. If a real LINE failure warrants it, use URL(current href), set only openExternalBrowser=1, retain path/query/report ID/hash, and show an explicit warning that unsent form and selected photo may not carry over. Do not auto-redirect or block LINE by User-Agent. Verify the link from actual LINE before shipping.

Official source, reviewed via primary documentation and Agent Reach/Jina:
https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/#opening-a-url-in-an-external-browser
The official openExternalBrowser=1 query parameter applies to URLs accessed from LINE, except LIFF apps. openInAppBrowser=0 is an Android Chrome custom tab option. No LIFF, LINE Login or unverified URL schemes were added.

## Release policy

Keep current Production. This fix needs normal PR review and release authorization; do not auto-merge/deploy. Original dirty checkout remains unchanged. No Production reports, database/permission changes or secrets were accessed.
