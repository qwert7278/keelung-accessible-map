# Beta V2 findings

Date: 2026-09-30. Scope: existing `codex/beta-readiness` branch, current local app, current before screenshots, repository docs, and local Demo browser. No live Supabase writes were performed.

## P1 — Mobile map and report action arrived too late

Location: `src/App.tsx`, `src/styles.css`.

Evidence: `docs/screenshots/beta-v2-before-mobile-390x844.png` showed the longer intro ahead of the workspace; the map began well below the first viewport. The old CTA depended on the header, with no fixed thumb-zone action.

Problem: first-time users had to pass promotional space before reaching the public-service task.

User impact: residents reporting from the street had extra scrolling and a less obvious action.

Accessibility impact: costly vertical scrolling for magnification and limited-mobility users.

Security impact: none.

Taste / Impeccable note: task hierarchy and information density should lead; avoid marketing hero conventions.

Fix: concise task heading/subtitle, map-sized mobile workspace, and fixed safe-area report CTA.

Verification: same 390×844 capture is in `docs/screenshots/beta-v2-after-mobile-390x844.png`; manual visual inspection confirms the map and fixed action appear immediately.

## P1 — Case evidence provenance was easy to confuse

Location: `src/components/ReportPanel.tsx`.

Evidence: the previous detail used a generic before/after area and selected the latest update image without distinguishing a community photo from an admin improvement photo.

Problem: user-submitted observations could be mistaken for official verification or resolution.

User impact: people could overestimate whether a curb/sidewalk obstruction had been fixed.

Accessibility impact: provenance was not conveyed as explicit text labels.

Security impact: no authorization bypass found; this was a presentation risk.

Taste / Impeccable note: public evidence needs clear source labels and lifecycle hierarchy.

Fix: show original report, latest community photo, and admin improvement photo as separate evidence slots; explicitly state that community observations do not confirm resolution.

Verification: mobile detail screenshot `docs/screenshots/beta-v2-after-detail.png` and browser accessibility snapshot show the labels.

## P1 — Successful report had no stable next step

Location: `src/App.tsx`, `src/components/ReportSuccessPanel.tsx`.

Evidence: the existing flow selected the new record and displayed a transient toast.

Problem: success and follow-up actions could disappear before a user understood what happened.

User impact: unclear whether the report was public or where to view/share it.

Accessibility impact: a transient toast is easier to miss than a labelled dialog with a live status.

Security impact: none.

Taste / Impeccable note: success is a product state, not decoration.

Fix: add a stable confirmation dialog with view, share, and return actions.

Verification: component and TypeScript build pass. A live success capture is withheld because Preview and Production share the same Supabase host and the local real-data browser must not create a test report; isolate a QA backend or use Demo Mode for that capture.

## P2 — Admin magic-link UI could retain stale authorization state

Location: `src/services/supabase.ts`, existing interrupted local patch in `src/App.tsx`.

Evidence: auth subscription now refreshes `is_admin()` after auth events and ignores a delayed response if a newer session event has occurred.

Problem: the earlier reported Magic Link return could complete Auth while the UI still showed the non-admin gate.

User impact: an authorized administrator might need a manual reload.

Accessibility impact: stale gate state has no useful next action beyond trying again.

Security impact: admin remains database-authorized only; anonymous and non-admin sessions are explicitly denied.

Taste / Impeccable note: state transitions should be visible and consistent without weakening authorization.

Fix: preserve `shouldCreateUser:false`, session persistence/refresh/URL detection, and race-safe database `is_admin()` lookup.

Verification: static inspection and build pass; a real email click/return still requires the account owner to open the one-time link. No email was sent during the local UI review.

## P0

No new P0 issue found in the scoped UI pass. Existing security smoke evidence is historical; see `docs/beta-verification-v2.md` for its date and scope.
