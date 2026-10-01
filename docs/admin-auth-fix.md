# Admin Magic Link review

Date: 2026-10-01 update.

## Preserved behavior

- Supabase Auth persists the session, refreshes tokens, and detects a session returned in the URL.
- Admin entry uses `signInWithOtp` with `shouldCreateUser: false` and redirects to `${PUBLIC_SITE_URL}/admin`; localhost or Preview origin cannot become the production callback by accident.
- A database `is_admin()` RPC remains the only source of admin authorization.
- Anonymous sessions are always represented with `admin: false`; authenticated non-admin accounts remain non-admin.
- Subscription callback work is deferred out of the auth callback, and a revision/session-id check prevents an older asynchronous RPC response from overwriting newer auth state.
- Logout calls Supabase Auth sign-out.

## Required Supabase configuration

The live Supabase Auth URL configuration was inspected read-only on 2026-10-01. Site URL is `https://keelung-accessible-map.vercel.app`; the Production `/admin` URL and localhost/127.0.0.1 development patterns are in the allow-list. No dashboard setting was changed. Preview URLs remain subject to Supabase allow-list and Vercel Deployment Protection.

## Verification

Source inspection, four focused auth unit tests, and production TypeScript build pass. The V2 Preview successfully created an anonymous session and its `is_admin()` RPC returned 200; the unauthenticated admin gate remained visible. On 2026-09-30, the owner-provided admin address requested a one-time Preview link; the Supabase OTP request returned HTTP 200 and the UI confirmed delivery. This pass confirmed the configured canonical callback and live URL allow-list but did not consume a fresh owner link. The account owner must click a fresh email link in the target browser session to complete final live role/redirect verification. Links are single-use and should not be copied into chat or logs.

## Authorization boundary

The page route and UI are not the security boundary. The database RLS policies, explicit grants, private admin allow-list, and `is_admin()` checks remain authoritative. Never substitute email text, browser storage, URL parameters, or user metadata for database authorization.
