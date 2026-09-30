# Accessibility Review

Review date: 2026-09-30. This review combines source inspection and the browser keyboard journey recorded in `docs/verification.md`. It does not claim a formal WCAG conformance audit or a real NVDA/device test.

## Findings

### P1 — Restore focus after closing a native dialog

The report dialog closed with Escape, but the live browser returned focus to the document root instead of the button that opened it. `Modal` now records the active element before opening and restores focus after unmount. If the opener has disappeared or another modal is active, it avoids stealing focus and falls back to the main landmark where needed.

### P1 — Help is available without a mouse or first-run timing

The Help dialog is reachable from desktop navigation, the intro area, and footer. It uses a named native dialog, semantic headings/lists/definition list, text links, and a visible close button. It is not a first-visit-only prompt.

## Existing accessible equivalents retained

- The report list is a keyboard-operable equivalent to map markers.
- Map location can be selected by click, GPS, or numeric coordinates.
- Filters use native labelled controls; status badges include text and icons.
- Form progress, errors, and success messages use live regions.
- Main CTA, controls, file picker, and Leaflet zoom targets have touch-friendly minimum sizing in CSS.
- Reduced-motion styles remain active.

## Manual verification checklist

- Keyboard-only: Tab, Shift+Tab, Enter, Space, Escape through main map/list, Help, report, detail, and admin gate.
- Zoom: 200% and browser text scaling; verify the submit action stays visible/reachable.
- Widths: 320, 360, 375, 390, 768, 1366, 1707, and 1920 CSS px; check no horizontal page overflow.
- Screen reader: inspect page landmarks/headings, dialog name, form errors, upload progress, and created-report announcement in a browser accessibility tree; use NVDA where available.
- Real device: verify GPS denial fallback, camera/photo selection, touch target access, and safe-area spacing.

The exact pass/fail results for available automated and browser checks are in `docs/beta-verification.md`; unrun human checks remain explicitly marked.
