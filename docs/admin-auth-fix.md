# Admin Magic Link review

Date: 2026-09-30.

## Preserved behavior

- Supabase Auth persists the session, refreshes tokens, and detects a session returned in the URL.
- Admin entry uses `signInWithOtp` with `shouldCreateUser: false` and redirects to the current-origin `/admin` route.
- A database `is_admin()` RPC remains the only source of admin authorization.
- Anonymous sessions are always represented with `admin: false`; authenticated non-admin accounts remain non-admin.
- Subscription callback work is deferred out of the auth callback, and a revision/session-id check prevents an older asynchronous RPC response from overwriting newer auth state.
- Logout calls Supabase Auth sign-out.

## Required Supabase configuration

The exact Production `/admin` redirect and the project Preview URL pattern must be allow-listed in Supabase Auth Redirect URLs. Confirm Site URL and email template behavior in the Supabase dashboard before inviting Beta admins. This repository pass did not change Auth dashboard settings.

## Verification

Source inspection and production TypeScript build pass. Existing local verification records include the prior RLS/API negative tests, but no Magic Link email was sent in this V2 visual pass. The account owner must request a new link and click it on the target Preview browser session; links are single-use and should not be copied into chat or logs.

## Authorization boundary

The page route and UI are not the security boundary. The database RLS policies, explicit grants, private admin allow-list, and `is_admin()` checks remain authoritative. Never substitute email text, browser storage, URL parameters, or user metadata for database authorization.
