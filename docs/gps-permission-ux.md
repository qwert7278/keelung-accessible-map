# GPS permission UX

Base: cc01d0a. Independent branch; no Production deployment.

Root causes: permission errors mentioned phone settings only; locate() called invalidateSelection() before GPS acquisition, clearing the last valid marker/address even on denial.

Changes: device-aware permission recovery guidance for desktop Chrome, Windows location settings, iOS Chrome and generic browsers. Begin GPS by canceling stale requests while preserving the draft, selected marker and consent state; replace location only after a successful actual GPS fix and valid geography. Search/map selection still cancels pending GPS and ignores late callbacks. Existing 20s acquisition and 30s geography deadline are unchanged. No system-setting links, auto-permission changes, default-coordinate fallback or backend changes.

Verification: 23 targeted GPS/selection/camera tests PASS; lint, typecheck, build and SEO check PASS. Browser fixture verifies denial/timeout retain selected address and enabled Next, success uses actual mocked callback coordinates, and a changed search cancels pending GPS before selecting a new candidate. Fixture mocks Geolocation; this is not physical-device permission acceptance. Manual Windows Chrome OS/browser permission recovery, iPhone Chrome and Android real-device checks remain PENDING.

Scoped code review: no blocking findings in error classification, timers, cancellation, revision guards or preserved selection. No independent GitHub Reviewer APPROVED is claimed.

Official references:
- https://support.google.com/chrome/answer/142065
- https://support.microsoft.com/en-us/windows/privacy/windows-location-service-and-privacy
- https://support.apple.com/en-gb/guide/iphone/iph3dd5f9be/ios
