# Beta UX Review

Review date: 2026-09-30. The public app and the current repository were inspected before changes. Existing list/map, filters, three-step reporting, photo preview, GPS/manual coordinate options, duplicate warning, community updates, and admin review are preserved.

## Findings and changes

### P1 — Explain the task before asking the visitor to act

Before: the first screen named the project and showed a government-notice banner, but did not offer a persistent use guide or answer first-time questions.  
After: the map introduction now says it is a Keelung accessibility report map; a reusable Help dialog describes three steps and answers the required FAQs. Desktop navigation, mobile intro, and footer can all reopen it.

### P1 — Make feedback and correction requests actionable

Before: the About copy deferred contact and removal details.  
After: Beta feedback, corrections, photo removal, and privacy requests use `lingwei2046@gmail.com`. The address is a `mailto:` link; it does not create an unauthenticated database inbox.

### P1 — Make retention and public visibility explicit

Public-mode help now says reports and photos remain while the report is public, confirmed removal requests are processed, and the data is reviewed at least annually. The reporting consent already tells users that report content and photos are public; the guide repeats this before the form is started.

### P1 — Give the reporter a usable next step after success

Successful reports open their detail view, announce that the report was created, and offer a durable share URL. A `?report=<id>` URL opens the same public detail after refresh; history navigation closes/reopens selected reports.

### Existing strengths retained

- Reports have an interactive list equivalent to map markers.
- Status uses icon and text as well as red/yellow/green.
- GPS can be declined; manual point selection and coordinates remain available.
- A 30 m same-category warning links to the nearby record but does not prevent distinct obstacles from being reported.
- Community suggested status is explicitly pending admin review.
- Existing empty, loading, upload-progress, validation, and error messages remain.

## Remaining UX work

- Closed Beta recruitment and user observation must be performed by the project operator; no testers were contacted by the agent.
- A real mobile device/GPS permission run is still needed; desktop browser emulation cannot prove device camera and location behavior.
- Storage orphan cleanup and upload-specific quotas are deferred engineering work, not user-facing promises.
