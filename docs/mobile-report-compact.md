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

## Local submit result fix

The fixture previously closed ReportForm without rendering a result; Production App already uses ReportSuccessPanel. Fixture now retains a simple completion dialog explicitly stating no public report was created. Verified synthetic photo → consent → submit → completion dialog and Done control in local browser. Runtime submission and Production are unchanged. Lint/typecheck/build/SEO PASS.

## Appreciation copy and spacing

Completion heading is now 感謝你的回報, with a concise message thanking reports for helping wheelchair users and pedestrians travel with confidence. Production success panel retains its existing published-record status and actions. Local fixture explicitly labels simulated completion. Scoped completion styles reduce header-to-content gap; local DOM measured 16px. Local mock submit result verified; lint/typecheck/build/SEO PASS. No deployment or real report created.

## Location step simplification

Removed the separate location-confirmation checkbox and state. A valid selected location enables Next; district polygon validation and stale-selection guards remain. Reset clears the picked location and disables Next. Guided copy now directs users to Next. Map adjustment guidance moved above the map and remains visible on mobile. Public photo consent is unchanged. Browser verified zero location checkboxes, Next → step 2, and reset → Next disabled. Focused tests 24/24, lint/typecheck/build/SEO and diff check PASS. No deployment.

## Minimal search copy

Removed redundant introductory/helper copy and per-candidate repeated instructions. Search placeholder explains partial place/road/business names; one short map-adjustment hint remains. Geoapify/OpenStreetMap attribution moved from search area to the form bottom; map attribution retained. Loading/error/no-result live status retained and aria-describedby updated to the existing status element. Browser keyboard ArrowDown/Enter selects candidate and enables Next. Lint/typecheck/build/SEO and diff check PASS. Local preview only.

## Two location methods

Visible duplicate search label removed using existing sr-only styling; accessible combobox name retained. A compact 或 divider separates search from current location when search is available. Verified local DOM and read-screen label; lint/typecheck/build/SEO PASS. Local only.

## Location method visual polish

Impeccable distill/craft-floor applied to this narrow refinement. Divider 或 uses existing brand green, 16px and semibold, positioned closer to search by removing empty status height/margins. Partial-name hint stays in the placeholder; map hint clearly distinguishes dragging/zooming from clicking to set coordinates. Local DOM confirms 16px divider, empty status zero height, 390x844 dialog no horizontal overflow; viewport reset. Lint/typecheck/build/SEO PASS. No production change.

## Attribution relocation follow-up

Placeholder and map hint updated to owner-specified wording. Removed form-bottom attribution links and unused CSS; Geoapify/OpenStreetMap source links now live in the main public map site footer. Native map-tile attribution remains. Local DOM confirms no form footer attribution, no action-row links, and new copy. Lint/typecheck/build/SEO PASS. No deployment.

## Compact photo step

ReportForm opts into PhotoUploader compact mode; other uploaders retain existing layout. Empty decorative photo placeholder replaced by centered camera/gallery buttons within one upload area. Repeated photo-step prose removed; picker help remains screen-reader-only and final public-photo consent retained. Camera capture, picker cancellation, compression and removal logic unchanged. Local synthetic JPEG preview/removal verified; 390x844 body overflow 0, horizontal overflow false, both buttons 44px high. Image regression 24/24, lint/typecheck/build/SEO PASS. Real-device camera/gallery PENDING. No deployment.

## Photo selection and progress refinement

Compact picker buttons hide when a photo exists; remove restores them and defers focus until after render. Existing inputs remain mounted and single-file. Duplicate visible photo label moved to screen-reader-only; step heading carries required marker. One visible reminder states one photo and avoids faces/plates. Progress fill colors change from light to medium to dark green for steps 1/2/3. Local synthetic photo selects/hides buttons, removal restores, reselection works; step colors verified. Image regression 24/24; lint/typecheck/build/SEO PASS. No real upload or deployment.

## Final review copy and gradient

Removed local synthetic address suffix 請確認騎樓入口; actual address data is not globally rewritten. Removed redundant government/public-browsing paragraph; explicit photo/privacy/public consent remains required. Verified auto-title 基隆市仁愛區精一路19號附近 · 人行道被占用 in actual local form. Progress now renders a 7px light→medium→dark green gradient and step circles use corresponding colors. Title tests 2/2, lint/typecheck/build/SEO PASS; local confirmation screenshot-equivalent DOM reviewed without submission. No Production change.

## Gradient scope correction

Removed step-circle per-position colors. All active step circles return to existing solid brand green with white text; only the progress bar retains the gradient. Local computed styles and diff check verified. CSS-only three-line removal; no runtime or backend change, no deployment.

## Scoped code review and teaching alignment

Reviewed location cancellation/revision checks, required photo/consent, compact picker isolation, modal scroll/focus, auto-title and form validation. Fixed stale HelpPanel coordinate-entry instructions and guided-tour file-picker wording; Next highlighting now covers the position confirmation guide. Fixed collapsed required title by opening details on invalid; browser cleared title, closed disclosure, submitted validation only, and confirmed automatic reopening. No new blocking runtime finding remains in this scoped self-review; not an independent PR approval. Focused regression 50/50, lint/typecheck/build/SEO PASS. Real device/backend acceptance unchanged and PENDING for this local UI branch.

Update-form preview: tests/report-update-preview.html uses an in-memory illustrative report, updates returns empty, addUpdate explicitly rejects writes. Existing ReportPanel opens its public supplement form; fields/options/privacy gate inspected without submission. No Production data, photos or credentials accessed.

## Public supplement form polish

Public update modal keeps only header divider/title, removes redundant form border/title; admin title remains unchanged. Public photo uploader uses compact centered picker with visible optional photo label; existing mandatory description and consent retained. Verified header count 1, form border 0px, center alignment, required textarea, and no-photo submit enabled only with description/consent. No submit performed. Lint/typecheck/build/SEO PASS. Local only.
