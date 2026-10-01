# Accessibility review — Beta V2.1 — 2026-10-01

## Verified in the local UI

- The Admin case editor exposes labeled native status selects, text area, file input, consent checkbox, and save button.
- Status buttons name the target action and case. Selecting a case moves focus to its heading; the mobile editor provides a return-to-list control.
- Incomplete Admin submission is prevented. The resolved-without-photo state names the missing evidence, and save is disabled until the requirement is met.
- Status is conveyed with text and icon/color; status meaning is not color-only.
- OSM map markers have accessible labels, and the report list remains an equivalent non-map way to inspect cases.
- Buttons and select targets meet the existing 44px control baseline in authored styles.

## Not verified in this pass

- Keyboard-only completion across the full public/Admin flow, screen reader announcement quality, browser 200% zoom, and physical-device camera/GPS permission branches.
- Specific mobile device breakpoints were reviewed in CSS but not captured through a viewport emulator during this pass.

Use the checklist in `docs/user-test-checklist.md` before opening the Closed Beta.
