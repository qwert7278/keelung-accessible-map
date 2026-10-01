# Beta Verification

Updated: 2026-09-30. Branch: `codex/beta-readiness` (reviewed app commit `aad6edb`; this document is added afterward). Deployment stage: Preview reviewed; Production was not changed or promoted.

## GitHub and Vercel

- GitHub Actions [Quality run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/36699750675): success for the reviewed app commit, including audit, lint, tests, and build.
- Vercel Preview: [keelung-accessible-map Preview](https://keelung-accessible-2066krn98-masons-projects-2c78a251.vercel.app/), state READY. The reviewed deployment corresponds to `aad6edb` and is a Preview deployment.
- Production remains at [keelung-accessible-map.vercel.app](https://keelung-accessible-map.vercel.app/). It was inspected read-only and was not changed.
- Production's About dialog still contains the older text saying contact, removal and retention details will be added later. The updated content is on the reviewed Preview; Production should be updated only after the separate release gate.

## Local checks

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm test` | Pass — 3 files, 12 tests |
| `npm run build` | Pass — TypeScript and Vite production build |
| `npm audit --omit=dev --audit-level=high` | Pass — 0 vulnerabilities |
| SQL rollback/security tests | Existing evidence in `docs/verification.md`; no migration changed in this review |
| Cloud smoke | Not run in this review because it writes rows/files and Preview and Production were observed serving the same user reports and Storage origin |

## Browser and responsive checks

Reviewed Preview in a browser and local build with the available desktop browser tooling. The live feed showed the three real sample reports. Tests did not submit report/community forms, upload a photo, send an auth email, request location, or change status.

- Preview Help opens and shows the task guide, FAQs, contact address, correction/removal process, and agreed retention policy. Escape closes it and restores focus to the Help control.
- Report detail opens from the feed and displays its address, photo, community-update area, and status explanation. The community form was not submitted.
- The unauthenticated `/admin` route shows the manager sign-in gate. No email was entered and no sign-in email was sent.
- The report dialog opens at 320×568, fits without horizontal document overflow, scrolls vertically, and keeps its next-step button visible. Empty required fields are stopped by native validation. Escape closes the dialog and returns focus to “回報障礙”.
- Local responsive measurements: 320×568, 390×844, 683×384, 1366×768, and 1920×1080 all had `scrollWidth === clientWidth`. The 683px viewport is only a narrow-width approximation; true browser zoom at 200% was not tested.
- Browser console after adding the favicon: 0 errors and 0 warnings.
- Captures: [desktop 1366×768](screenshots/preview-desktop.png), [mobile 390×844](screenshots/preview-mobile-390x844.png), [mobile 320×568](screenshots/preview-mobile-320x568.png), [report dialog 320×568](screenshots/report-modal-320x568.png).
- The browser showed OpenStreetMap tiles and attribution. No Google Maps key was needed.

These checks do not establish real iOS/Safari or Android behavior, physical-device camera/photo selection, real GPS denial/accuracy behavior, 200% zoom, or NVDA acceptance. See `docs/user-test-checklist.md` for the remaining human checks.

## Security boundary and test-data safety

- No Supabase migration or cloud record was changed during this review.
- Preview and Production displayed the same sample report records, and their photos used the same Supabase Storage origin. This is evidence of shared backend data, so no write-based cloud E2E test was run. The historic isolated QA and security smoke evidence remains in `docs/verification.md`; it is not represented as having been rerun now.
- No service-role key or other server-only secret was added to the Vite app. The frontend is limited to public `VITE_` configuration such as Supabase URL/publishable key and map-provider settings.
- Previously recorded SQL and API negative tests cover private columns, deletion, status updates, forged authorship, self-promotion, upload ownership, and cooldown behavior; see `docs/verification.md`. This review did not modify RLS or grants.
- The older deployment/environment observations in `docs/verification.md` describe the state at the time they were recorded. Current read-only browser observation confirms a live Production site and the shared report/Storage data described above; Vercel environment values were not read during this review.
- Production promotion remains a separate human gate.

## Beta readiness gate

Code, CI and available browser checks pass for this Preview. A small closed Beta is not fully accepted until the operator completes real-device checks in `docs/user-test-checklist.md` and confirms the operational contact/removal workflow. Use an isolated Supabase QA project before any new write-based cloud smoke test. The reviewed Preview is available above; Production remains unchanged.
