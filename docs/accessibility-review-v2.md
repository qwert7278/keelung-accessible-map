# Accessibility review — Beta V2

Date: 2026-09-30. This is a focused review, not a WCAG conformance claim.

## Verified in source and local browser

- Main, navigation, complementary list, named map region, headings, native labelled controls, and dialog names are present in the Playwright accessibility snapshot.
- The case list is an alternative to map markers; case selection, filter controls, and manual latitude/longitude inputs do not require dragging.
- Map locate failure leaves manual map/coordinate selection available.
- Status names and icons accompany color.
- Buttons and focus-visible outlines are present; dialogs close with Escape and restore focus through the shared Modal component.
- Onboarding can be skipped and remains available through Help.
- Mobile layout was visually checked at 390×844. The report CTA has a 46px minimum height and respects `safe-area-inset-bottom`.
- Reduced-motion preference is respected by the existing stylesheet.

## Still requires human/device verification

- 320×568, 360×800, 375×812, 768×1024, 1707px and 1920×1080 after-state matrix.
- Keyboard-only traversal through all three report steps, map controls, case update form, and admin flow.
- 200% zoom, larger browser text, phone landscape, switch-like input, NVDA/VoiceOver, real iPhone Safari, and real GPS grant/deny/timeout.
- Map tile/marker accessibility varies by Leaflet/plugin/browser; do not claim that the map itself is fully screen-reader operable. The list remains the complete non-map route.
- Real admin update and success flow should be verified only with an isolated QA backend or a controlled, owner-approved test record.
