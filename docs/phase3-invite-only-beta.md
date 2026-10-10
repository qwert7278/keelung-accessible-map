# Phase 3 — approved-user Beta and report UX

## Scope and release gate

Baseline / rollback: `c979667c6da2c29e5593e46e8a5345645206573c`.
Worktree: isolated `roadtag-geoapify-build`, branch `codex/phase3-invite-ux`.
The owner explicitly cancelled invite codes during this run. Use the existing approved-email/UUID list for 5–10 testers. No invite-code tables, redemption endpoint, self-registration, OAuth rewrite, or new privileges are introduced.
**Beta NO-GO until one genuinely new tester connects from their own eligible ChatGPT account in staging.** The owner's existing private connector is not evidence of external installation availability. Production release also requires PR code review PASS.

## Current authorization model

`server/mcp/oauth.ts` verifies signed issuer/audience/resource/client/sub/role claims and the server-only principal/client allowlists. Every tool call then executes `mcp_oauth_actor`, which requires enabled DB principal + matching actor + enabled client/resource and rejects admin actors. Writes and Storage retain their existing actor-bound checks. Website reporting remains independent.
No runtime, migration, OAuth client, Production env, credential, or user is changed by this UX PR.

## Administrator entry points — no invite code

Use the existing Supabase project dashboard → Authentication → Users, SQL Editor, and Vercel project → Settings → Environment Variables. Keep staging (`wpravdqviylkcpsioybu`) and Production (`ifcicahnrpkwjcxmnmug`) entirely separate.

1. Obtain the tester's consent and reachable email, and verify their ChatGPT custom-App eligibility. Do not request their passwords. Start with staging and one tester; cap the approved Beta list at ten.
2. Invite/create an independent non-admin Auth user through the authorized Supabase Auth admin flow; tester completes email verification and sets their own login credential. Public sign-up stays disabled. Do not reuse an admin UUID or a staging UUID in Production.
3. Read back the confirmed Auth UUID; verify `is_anonymous=false` and absence from `private.admin_users`. Give it a distinct principal ID. Add its actor mapping to **only the intended** server `MCP_OAUTH_PRINCIPALS_JSON`; preserve existing entries. Create the DB principal disabled first. Never copy credentials into Git or send them to testers.
4. An existing private ChatGPT app is not automatically shared across accounts. If the tester has custom-App creation access, their client/callback must be registered and approved through the current Supabase OAuth administration flow; verify the platform's actual callback, fixed environment/resource and UUID. Add that verified client to DB and the intended `MCP_OAUTH_CLIENTS_JSON`. Do not enable general DCR or wildcard clients to avoid this gate. A workspace-published app requires its workspace admin's access approval; it is not authorized by this PR.
5. After reviewed allowlists are deployed and identity/client matches are read back, enable only this tester's DB principal. Staging must pass connect → OAuth → exactly five tools → location → nearby reads before a separate Production activation. Never create a synthetic Production report.
6. Record only principal, actor UUID, approved client UUID, approver, approval/expiry/revocation time in the administrator's private record. Do not put emails, tokens, passwords, or this record in public docs. Recheck tester eligibility on expiry. This small manual list intentionally has no account portal.

Read-only management query (private admin SQL Editor; never public):

```sql
select principal, actor, can_write, enabled
from private.mcp_principals order by principal;
select client_id, resource, enabled from private.mcp_oauth_clients;
```

Immediate per-user revocation: disable the **specific** approved principal in `private.mcp_principals`. Existing live gate rejects the next tool call even while the token remains valid. Then remove that actor from the intended Vercel allowlist and revoke their OAuth authorization/sessions. Disable a client only if it is exclusively theirs; do not disable a shared client or the existing owner principal. No migration is required. Re-enable only after renewed approval.

## Verified ChatGPT UI and tester instructions

Observed on 2026-10-09 in the owner's web account: Settings → **Plugins** → Road Tag staging Phase1C; detail has **Connected accounts**, **Connect another account**, **Refresh tools**; **View details** → **Try in chat**. The private app is marked DEVELOPMENT and belongs to this account. No external-account sharing or installation has been verified.

For an eligible tester whose manager has provided a usable app: open Settings → Plugins (some accounts use Apps), open Road Tag and complete OAuth using their approved Road Tag login. Open the app detail and Try in chat, or select Road Tag in the chat tools menu. Upload a real photo, provide address/landmark and obstacle, confirm candidate/nearby cases, then explicitly approve creation and open the returned report URL. Five tools remain `resolve_location`, `search_nearby_reports`, `get_report`, `create_report`, `add_observation`.

If the app is not available to their account/workspace, stop and use website reporting; a server allowlist cannot grant ChatGPT platform access. Do not distribute an owner's login, client secret, or a private app link as an assumed public installation method.

Official platform guidance: [developer mode and MCP apps](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt). Availability varies by plan/workspace; the currently observed UI is authoritative for this account. Other MCP clients remain future compatibility work.

## Audit and focused verification

Actual Production before-state: four Geoapify hospital candidates; desktop list 279px high, mobile 354px high with last option behind sticky footer; `max-height:none`, `overflow:visible`. ArrowDown had no candidate selection. Address/coordinates/district were already synchronized.

After-state: bounded in-flow listbox (desktop 260px / mobile 220px maximum, additionally viewport-bound), inner scrolling, left-aligned title / district / complete address, active option and focus outline, input-focus keyboard navigation, Enter selects without form submission, Escape closes without closing dialog, Tab continues to Search. Input remains 16px. Existing polygon checks, exact coordinates, selection confirmation, photos and submit flow stay unchanged. Repeating a search preserves its list while loading, disables stale selection, and retains existing abort/stale-response protection.

Local fixture: `/tests/phase3-location.html`, deliberately absent from production build inputs. It provides bounded success / empty / failure / slow-stale-response scenarios without Auth, Storage, or report writes.

The staging website's pre-existing `Anonymous sign-ins are disabled` policy prevents its ordinary guest reporting dialog from opening. That policy remains unchanged. `/tests/phase3-hosted-location.html` is therefore included **only when VERCEL_ENV=preview**: it renders the actual ReportForm against the public real Geoapify API with a local repository whose create/addUpdate/moderate methods always reject. It does not log in, connect to Supabase data, or grant MCP rights. Production builds exclude this entry. Hosted harness UX PASS does not mean staging guest Auth or new-tester OAuth passed.

Evidence is stored separately in `artifacts/phase3` in the original project: desktop/mobile before and after screenshots. After screenshots use local fixed candidates; hosted real Geoapify validation is recorded in the release checkpoint. No screenshot is represented as an actual iPhone test.

- Build including typecheck and SEO check: PASS.
- Full lint and later scoped lint: PASS.
- Focused Vitest: 47/47 PASS (clipboard success/denied, location boundary, existing image privacy).
- Existing focused OAuth suite: 6/6 PASS, including SDK exactly-five discovery and negative claim rules. These are local tests, not new-tester hosted OAuth evidence.
- Browser: desktop/mobile mouse selection, ArrowDown/ArrowUp/Enter/Escape/Tab, selected address and circle Marker, loading/empty/error and stale completion PASS. Clipboard live success PASS.
- Staging DB: existing approved writer PASS; uninvited actor and unknown client FORBIDDEN; anon/authenticated cannot call privileged gate; enabled admin actor absent. Production read-only: one enabled non-admin principal, only Production resource, anonymous gate inaccessible.
- Impeccable detector completed. Reported warnings concern unchanged legacy palette/dialog/shadows/width animation; no unrelated redesign. Link resolver did not resolve public stylesheets, so computed browser checks remain necessary.
- Physical iPhone keyboard, touch hardware and VoiceOver are not available; viewport, pointer and ARIA semantics were checked, not claimed as hardware/screen-reader testing.
- New external tester staging OAuth/discovery/read smoke: PENDING; no tester email/platform eligibility supplied this run.

## Release / rollback

Keep this PR unmerged until review PASS. No Production changes or synthetic reports are authorized by test fixtures. After review and the required staging acceptance, release through GitHub main → existing Vercel, verify exact deployment SHA/READY, home and map, preserve five tools and existing MCP/OAuth. UI rollback is the baseline SHA above; no schema rollback is needed. For any individual Beta grant, disable that principal first as described above.
