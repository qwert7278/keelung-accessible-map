# Phase 1B OAuth gate — staging only

Isolated branch: feature/mcp-phase1b-chatgpt-attachment, base 036b29b.

OAuth adapter `/api/mcp-chatgpt` shares the five Phase 1A tools and RoadTagService. Alpha `/api/mcp` and photo-token contracts remain unchanged. Production environment cannot enable the OAuth adapter. Preview permits only roadtag-mcp-staging (wpravdqviylkcpsioybu).

## Token and Storage boundaries

Supabase access tokens use aud=authenticated. The staging Auth hook injects a signed resource claim only for an operator-approved client, enabled closed-alpha actor and non-admin actor. Incoming JWT validation checks asymmetric signature, issuer, audience, exact resource, expiry, nbf, client_id, role and non-anonymous identity. Each tool call additionally checks current database actor/client authorization. Revocation therefore blocks previously issued tokens.

OIDC openid scopes describe identity access, not database write permissions. Supabase does not document a scope claim on access tokens; scope is not fabricated. Write permission comes from the durable principal mapping plus per-operation confirmation. ChatGPT owns OAuth refresh; Road Tag never persists that refresh token in private.mcp_actor_sessions.

Storage always uses the publishable API key and validated incoming OAuth JWT. No alpha session access or service-key fallback. Privileged private RPC remains separate.

Consent is staging-only, noindex, with an in-memory Auth session and explicit Approve/Deny. Only the SDK-provided ChatGPT OAuth callback destination is accepted. There is no public homepage entry.

## Verified and remaining gates

- Supabase OAuth Server + DCR enabled on free staging; discovery HTTP 200, ES256 JWKS present.
- Local Phase 1A: 73 checks PASS; mocked Auth/session: 27 checks PASS; emitted Node runtime PASS.
- Local OAuth: JWT negative tests, official MCP client discovery of exactly five tools, anonymous call rejection, Storage credential separation and SQL hook/authorization tests PASS.
- Forward migration mcp_phase1b_oauth applied to staging only. Auth hook enabled; consent Site URL saved and read back.
- Vercel feature Preview activated with staging keys as Secret. Exact branch alias protection exception authorized and saved; no global protection change. Hosted metadata 200, anonymous tools/call 401, official MCP Client initialize/list PASS. Actual ChatGPT OAuth link + tool scan PASS (Write 2 / Read 3); native PKCE S256 approved. ChatGPT owns its tokens; independent real refresh/Storage verification remains PENDING.
- Real ChatGPT fileParams attachment evidence: PASS. After Refresh tools, a QA PNG reached the OAuth-only structure probe with file_id and HTTPS download_url present, mime_type=image/png, and file_name present. Only hostname hash and structural booleans were returned. Operation 93725e8d-6ea9-4e32-8d05-4931ad37d2cb has zero ledger/photo/report records. File picker remained unavailable despite user-confirmed extension permission; standard clipboard PNG upload succeeded. Exactly five tools retained.
- SSRF-safe fetch and JPEG/PNG/WebP normalization: local adversarial tests PASS, actual ChatGPT temporary-URL fetch PENDING. Connections pin numeric validated DNS IPs and verify original TLS hostname; every redirect is revalidated; no auth/cookie forwarding; 20 MiB body, 8 KiB headers, 20s wall timeout. New service-only staging budget limits enabled writer principals to 10 downloads/hour. Photo-token pipeline bridge, full ChatGPT create_report/add_observation E2E and HEIC: PENDING.

No Production env, database, OAuth principal/session/report/photo or main merge changes.

## Sources

- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- https://developers.openai.com/plugins/build/auth
