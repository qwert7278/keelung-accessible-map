# Beta Code Review

Review date: 2026-09-30  
Scope: current `codex/beta-readiness` branch, React/Vite client, Supabase migrations and policies, Storage rules, tests, CI and Vercel configuration. Cloud QA data was not created during this review.

## Findings

### P1 — Help and privacy policy were not reachable as a durable task guide

Location: `src/App.tsx`, page navigation and About dialog.  
Problem: the live workflow had a project explanation but no reusable three-step guide or FAQ. It also said contact, removal requests and retention policy would be added later.  
User impact: first-time users had to infer whether GPS was required, whether photos were public, and how to report incorrect information.  
Security impact: unclear public-photo and location handling weakens informed consent.  
Fix: add persistent Help access, task steps, FAQs, the supplied Beta contact, and the agreed retention/removal text.  
Verification: render the Help dialog from desktop navigation, the mobile intro, and the footer; keyboard close returns focus; copy and mail link match the agreed policy.

### P1 — Closing a dialog could lose keyboard focus

Location: `src/components/Modal.tsx`.  
Problem: live keyboard inspection showed Escape closed the native dialog but focus returned to the page root rather than the invoking control.  
User impact: keyboard and switch users lose their place after dismissing Help, report, or detail dialogs.  
Security impact: None.  
Fix: retain the invoking element and restore focus after the modal unmounts; fall back to the main landmark if the opener is no longer present.  
Verification: open and close each dialog using Escape and the close button, and verify the active element is restored.

### P1 — Created reports had no durable direct link

Location: `src/App.tsx` and `src/components/ReportPanel.tsx`.  
Problem: successful creation opened a detail panel but had no shareable route.  
User impact: a tester could not reliably send the new report to a caregiver or another reviewer.  
Security impact: None; links contain only the public report identifier.  
Fix: encode the selected report as `?report=<id>`, support direct loading and browser history, and add native share / clipboard actions.  
Verification: utility unit test and browser refresh/share checks.

### P2 — Upload-before-insert can leave an unreferenced public image

Location: `src/services/supabase.ts`, `create`.  
Problem: a photo is uploaded before the report row is inserted. If row creation fails, the object remains orphaned.  
User impact: no visible report is created; storage may contain an unused photo.  
Security impact: photo is not attached to a public report but the bucket URL is public.  
Fix: keep browser deletion unavailable; later add a server-only scheduled inventory and conservative cleanup after a retention window, after checking references.  
Verification: P2 follow-up must cover referenced/unreferenced paths without granting client delete.

### P2 — Missing favicon produced a browser 404

Location: `public/favicon.svg`, `index.html`.  
Problem: the browser requested `/favicon.ico` and received a 404 during the first local Preview console check.  
User impact: no core workflow impact, but the console showed an avoidable error and the tab had no project icon.  
Fix: add a small branded SVG favicon and link it from the document head.  
Verification: after the fix, the local browser console showed 0 errors and 0 warnings; commit `aad6edb` passed GitHub Quality and Vercel Preview build.

### Note — Anonymous per-UID cooldown is not distributed anti-spam protection

Location: initial migration and `private.consume_rate_limit`.  
Problem: an attacker can rotate anonymous identities and Storage uploads have no independent quota.  
User impact: coordinated spam could degrade the map or consume storage.  
Security impact: current database RLS and ownership rules still apply; the rate control is a friction layer, not a guarantee.  
Fix: retain current server-side per-UID limits; add CAPTCHA, IP/device limits, and upload reservations only in a separately reviewed iteration.  
Verification: existing privilege/cooldown tests pass; do not describe the current limits as abuse-proof.

## Security posture checked

- Existing migrations are forward-only; no migration was edited or added.
- `reports` and `report_updates` use RLS; public data is exposed through `security_invoker` views and explicit column grants.
- Public grants exclude `created_by` and `admin_note`; ordinary users cannot update status/admin fields, delete/truncate rows, or modify the private admin allow-list.
- Admin status changes are gated by `private.is_admin()` and handled by the database audit trigger. Anonymous identities do not qualify as admins.
- Storage writes are authenticated, path-scoped, owner-checked, and non-overwriting; ordinary clients have no delete grant.
- The frontend uses only Supabase URL and publishable key. No service-role key was added.
- Cloud Advisor and smoke-test evidence is recorded in `docs/verification.md`; production mutations were not performed as part of this review.

## P0/P1/P2 disposition

- P0: no new P0 defect was evidenced in the inspected source or recorded security checks.
- P1: reusable Help/FAQ, public policy/contact clarity, modal focus restoration, and durable report sharing are implemented on this branch.
- P2: distributed anti-spam, upload quota/reservation, orphan-object cleanup, PostGIS nearby search, official layers, and open-data export remain deferred.
