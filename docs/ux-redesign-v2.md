# UX redesign V2

Date: 2026-09-30. The existing React/Vite/Supabase/Leaflet implementation and three real sample cases are retained.

## Implemented

- First screen now names the service and the immediate action instead of using a long hero.
- Desktop continues to pair the case list and OpenStreetMap workspace; wide layouts use more vertical map space.
- Mobile map height adapts to the viewport, with status labels retained and a fixed report action above the safe-area inset.
- First-visit onboarding is three steps, skippable, keyboard-dismissible, and uses only one localStorage key; Help remains available at all times.
- Location selection retains GPS, map picking, and manual coordinate fallback; address remains optional.
- Stable report-success dialog provides view/share/return actions.
- Case evidence distinguishes original photo, latest community photo, and admin improvement photo.
- Mobile case details use a bottom sheet with a close button and Escape behavior; drag is not required.
- OSM remains the default provider; Google Maps remains optional through the existing environment setting.

## Current screenshots

- Before desktop: `screenshots/beta-v2-before-desktop.png`
- After desktop: `screenshots/beta-v2-after-desktop.png`
- Before mobile 390×844: `screenshots/beta-v2-before-mobile-390x844.png`
- After mobile 390×844: `screenshots/beta-v2-after-mobile-390x844.png`
- Onboarding: `screenshots/beta-v2-after-onboarding.png`
- Report form: `screenshots/beta-v2-after-report-form.png`
- Report details step 2: `screenshots/beta-v2-after-report-step2.png`
- Review before submit: `screenshots/beta-v2-after-report-review.png`
- Demo success: `screenshots/beta-v2-after-success-demo.png`
- Report detail: `screenshots/beta-v2-after-detail.png`
- Admin login gate: `screenshots/beta-v2-after-admin-login.png`

The success screenshot was captured after a synthetic submission in a separate local Demo Mode browser, which stores data only in that browser and does not connect to Supabase. The admin screenshot shows the unauthenticated gate; verified-admin still requires the account owner to click their own one-time Preview email link.

## Not included

PostGIS nearby/duplicate matching remains a future iteration. Current duplicate detection is only the app's existing client-side preparation and should not be represented as authoritative. Official roadwork data remains a separate future layer.
