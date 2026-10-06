# Road Tag MCP Phase 1B — staging 驗證報告

日期：2026-10-06（Asia/Taipei）。Isolated branch：`feature/mcp-phase1b-chatgpt-attachment`；base/main：`036b29b1e9239f1a9c6dcabac6959bdefd3c8e30`。
Runtime E2E head：`b654bbf50a123922fa13ccdc0809add7a175125a`，Vercel Preview READY。最後文件提交不變更 runtime。

## 結果

| 項目 | 狀態 | 證據 |
| --- | --- | --- |
| OAuth bridge | PASS | 真實 ChatGPT link、PKCE S256、五 tools Scan；ES256 JWT/resource/client/actor gate；incoming OAuth JWT 成功寫入 actor Storage |
| ChatGPT OAuth refresh | PASS | 只查 Auth session timestamps/refresh row counts，未查 token 值；同一 approved client session 已 refresh，19 revoked rows/1 active row，refresh 後 tool call 成功 |
| actual ChatGPT fileParams | PASS | QA PNG 傳入 required download_url/file_id；只回傳 sanitized booleans、hostname hash、MIME；不保存完整 URL/file ID |
| safe fetch | PASS | 真實 temporary URL 經 DNS/IP pinning、原 hostname TLS 驗證下載；PNG → WebP，80×40，160 bytes，metadata removed |
| attachment photo pipeline | PASS | 先單獨驗證 reservation → actor Storage → finalize → token；一個 actor-owned WebP、non-admin actor、未消耗 token、零 report/ledger |
| full ChatGPT report flow | PASS | resolve_location → nearby → 具體 QA 欄位確認 → create_report → get_report → 確認 observation → add_observation → get_report |
| Hosted PostgreSQL/idempotency | PASS | separate adapter instances 真實併發，一個 object/write；expired URL replay、lost acknowledgement、file conflict；ChatGPT 實際 replay 返回原 IDs，下載 budget 未增加 |
| JPEG / PNG / WebP | PASS | actual decode/normalization tests；Hosted component JPEG/WebP；ChatGPT actual PNG；原始附件不寫 public Storage |
| HEIC | PENDING | 此 server runtime 尚未驗證 HEIC decoder，拒絕未支援格式，未假設可用 |

只使用已授權 Free `roadtag-mcp-staging`（`wpravdqviylkcpsioybu`）與既有 Hobby feature Preview。未建立付費資源、未升級方案、未購買 credits。

## 五個 tools 與 credential separation

Exactly five：`resolve_location`、`search_nearby_reports`、`create_report`、`add_observation`、`get_report`。本輪全部 require OAuth；anonymous tools/call 返回 401 + WWW-Authenticate。官方 MCP client initialize/list、OAuth descriptor 與兩個 write tools 的 `openai/fileParams:["photo_file"]` 都 PASS。

`/api/mcp-chatgpt` 為獨立 adapter，共用 Phase 1A tool definitions/contracts/RoadTagService；`/api/mcp` alpha 相容。Production config 無法啟用 OAuth adapter，Preview 僅接受指定 staging URL。JWT 驗證 issuer、asymmetric signature、aud=authenticated、expiry/nbf、sub、signed exact resource、approved client、非 anonymous；每次 call 再查 live principal/client/non-admin authorization。caller 不能自選 actor。

Storage 僅使用 publishable key + incoming validated OAuth access JWT；沒有 service key + actor JWT、alpha session JWT 或 privileged fallback。Private RPC 只使用 server secret。ChatGPT 管理自己的 access/refresh lifecycle，Road Tag 不複製 refresh token 到 private.mcp_actor_sessions。Consent session 只在記憶體，不新增 marketing nav/CTA；OAuth consent 與每次 confirmed=true 分開。

Feature Preview 僅對精確 alias 保存已授權 protection exception，global Vercel Authentication 不變：
https://keelung-accessible-map-git-feat-6bfac3-masons-projects-2c78a251.vercel.app

## Attachment 與 image safety

嚴格四欄 photo_file schema；download_url/file_id required，mime_type/file_name optional。create_report exactly one photo_token/photo_file；add_observation at most one。file_id 不是權限證明，只用 SHA-256 retry binding。

HTTPS、443、無 userinfo；解析全部 A/AAAA，任何 private/reserved/link-local/loopback/multicast/unspecified IP 都拒絕；使用 numeric validated IP 連線，TLS SNI/certificate 驗原 hostname。每一跳 redirect 重新驗證，最多三跳；不轉送 auth/service/cookie headers。20s wall timeout、8 KiB response headers、streaming 20 MiB cap；compression 拒絕。Authenticated writer 10 downloads/hour durable budget。

sharp actual decode；raw ≤20 MiB、≤26MP、side ≤10000、single frame；orientation normalization、EXIF/GPS/XMP/IPTC 移除；不放大，最長邊 ≤1920，WebP 目標 300 KiB、hard ≤1 MiB。只把 normalized bytes 交既有 immutable reservation/upload/finalize。

## Idempotency / concurrency

新增 private.mcp_attachment_ops 保存 normalized business、file_id hash、final normalized digest，不存 URL/file ID/token。begin 使用 Phase 1A 的 global operation advisory lock namespace；successful ledger replay 在 URL validation、budget、任何 byte access 之前。

不同 business/file identity 在 fetch 前 conflict；未完成 retry 的新 normalized digest 必須與首次 digest 一致，否則不覆寫 Storage。180s byte-ingestion lease 與 Vercel maxDuration=60 配合，busy 回 RATE_LIMITED；stale owner 不能改 digest/清除他人 lease。這不是 Auth refresh lock，沒有修改其永久、不接管的 scope。已 finalized 的未寫入 operation 可重用 actor bytes；lost acknowledgement 下一次返回原 ID。

**Review tradeoff：**成功 replay 使用已綁定 file identity/committed digest，不重新下載；若外部把「同一 file_id」背後 bytes 更換，成功 replay 無法觀察該變更。不同 file_id/business，以及未完成重試的不同 digest 均已實測拒絕；未將不可觀測的新 bytes 宣稱為已偵測。

## 真實 E2E read-back

ChatGPT report operation：`573bfeb2-b7ed-4fc0-890b-7c537f1d3310`。
ChatGPT observation operation：`fb03da41-0c0d-462d-8d3e-51a195a5e01e`。
Observation ID：`04f7df41-acc0-466d-a219-d04348e88215`。

各 operation 一個 WebP object、一筆 ledger；合計一筆 report、一筆 observation、兩個 objects。owner=OAuth actor、private digest=normalized digest。正式 report status 仍 open，observation suggested_status=resolved。兩次真實 ChatGPT replay 都 replayed=true 且原 IDs 不變；staging-writer-a download attempts 前後均 1，沒有 refetch。

Hosted component report operation：`3367018b-e9a0-4127-b15c-2e388341cb27`；observation operation：`63bc154a-8f1a-4b3d-ac80-766e7ea8f1b6`。真實 PostgreSQL separate-instance concurrency、lost-ack 原 ID、expired URL replay PASS。此 component script 使用獨立 QA Supabase actor JWT，local logout 清除該 QA session；真正 ChatGPT OAuth JWT Storage path 另由上述 gate 證明。

Storage overwrite、unreserved upload、after photo、cross-user reserved upload、token/operation mismatch、read-only principal、actor 直接 private RPC 均拒絕。Public photo read 保留既有公開行為。

## Tests / migration / Production

- App：19 files / 170 tests PASS；emitted location/upload runtime PASS。
- Phase 1A：73 checks PASS；mocked Auth/session 27 checks PASS；emitted MCP/photo runtime PASS。
- OAuth/probe/downloader/image/photo/bridge/lease tests PASS。
- DB：75 checks PASS；新增 forward migration 在 fresh local DB 可完整套用。
- tsc/build/lint/diff check PASS；只有既有大 chunk warning。
- 只套 staging 的三個 forward migrations：OAuth、download budget、attachment retry；未改 Phase 1A migration。
- Production：GET /、/map =200；GET /api/mcp =503；POST /api/mcp-photo =503；/api/mcp-chatgpt =404。
- Production Supabase MCP tables=0、functions=0；無 Production migration/env/Auth/report/photo changes。
- origin/main 仍 036b29b；沒有 merge；原 dirty working tree 九個 baseline files hashes unchanged。
- Secret scan：tracked files、feature Git history、frontend bundle 均未包含 staging service/session/photo secrets 或 QA passwords。

## Evidence / remaining blockers

QA evidence 只放原專案 ignored output/mcp-phase1b-evidence，不放敏感附件參數：
chatgpt-fileparams-pass.jpg、chatgpt-safe-fetch-pass.jpg、chatgpt-photo-token-pass.jpg、chatgpt-full-e2e-pass.jpg、chatgpt-replay-pass.jpg。

File picker 在使用者確認 extension file permission 後仍 unavailable；標準 clipboard PNG 上傳完成真實 attachment 測試，已解除此流程 blocker。

**安全待辦：**先前 Vercel 設定編輯的一次工具輸出包含 staging service key；未進 Git/frontend，尚未輪替。應在 review/release 前輪替 staging key 並更新這個 feature branch 的 Preview secret，Production 不修改。沒有代替使用者自動變更 credential。

HEIC 仍 PENDING；同 file_id 換 bytes 的 replay tradeoff 如上，交 code review 確認。停止等待 code review，不開始 Production promotion、main merge 或下一 phase。

## Changed files

- api/mcp-chatgpt.ts
- api/mcp-oauth-resource.ts
- docs/mcp-phase1b-oauth-gate.md
- oauth-consent.html
- package-lock.json
- package.json
- scripts/db-launch-check.mjs
- scripts/mcp-local-backend.ts
- scripts/mcp-phase1b-hosted-check.ts
- server/mcp/attachment-download.ts
- server/mcp/attachment-photo.ts
- server/mcp/attachment-probe.ts
- server/mcp/attachment-write.ts
- server/mcp/handler.ts
- server/mcp/oauth.ts
- server/roadtag/service.ts
- server/roadtag/supabase.ts
- src/oauth-consent.tsx
- supabase/migrations/20261006042828_mcp_phase1b_oauth.sql
- supabase/migrations/20261006060000_mcp_phase1b_attachment_budget.sql
- supabase/migrations/20261006070000_mcp_phase1b_attachment_retry.sql
- tests/mcp-attachment-download.ts
- tests/mcp-attachment-photo.ts
- tests/mcp-attachment-probe.ts
- tests/mcp-attachment-write.ts
- tests/mcp-oauth.ts
- vercel.json
- vite.config.ts

## Primary sources

- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- https://developers.openai.com/plugins/build/auth
- https://nodejs.org/api/tls.html
