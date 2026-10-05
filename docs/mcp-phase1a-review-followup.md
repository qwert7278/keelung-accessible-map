# MCP Phase 1A review follow-up — 2026-10-05

範圍：修正 hosted credential/session 邊界；保留原五工具、photo handoff、SQL idempotency 和本地閉環。尚未 release。未新增套件或付費資源。

## Session model 與 failure handling

`MCP_PRINCIPALS_JSON` 只包含 id、actor、write、credentialHash；不接受舊 actorToken。每個 writer 是固定、server-controlled、non-admin Auth UUID。Private mapping 的 actor unique，所有 session RPC 都再次執行 `private.mcp_actor`，拒絕 disabled/read-only/admin actor，並比對 configured actor。

Auth access/refresh pair 存在 `private.mcp_actor_sessions.sealed`；AES-256-GCM 用 server-only `MCP_SESSION_ENCRYPTION_KEY`（32 bytes、64 hex characters），隨機 IV，AAD 綁 project URL、principal、actor。資料庫不保存明文 token；公開及 actor roles 無 session table 或 session RPC 權限。只有 service-only narrow RPC 能取得 encrypted bytes。

每次 Storage request 前，先用 service-only `mcp_session_read` 讀 encrypted session，檢查 principal / actor / enabled / write / non-admin，**不更新 lock**。已有 rotation lock 時只回 busy、不洩漏 sealed，也不能繞過 blocked state。解密及檢查 issuer、role、sub、expiry 後，若 access JWT 剩 >60 秒，直接經 Supabase Auth `/user` 驗證 user.id；不 acquire、不 commit、不改 session。普通 timeout、5xx、read response 中斷只讓本 request SERVICE_UNAVAILABLE，下一個 request 可正常 retry。

只有 token 剩 <=60 秒才呼叫 `mcp_session_acquire`。它在 SQL row lock 下回最新 sealed；adapter 重新解密並重新判斷 expiry。若另一 instance 已輪替，透過 `mcp_session_release` 先釋放自己的 UUID lock，再驗證最新 access JWT，不做第二次 refresh。Release 不改 encrypted session、不可清掉其他 owner 的鎖，且可安全重送。Acquisition acknowledgement 遺失但尚未 dispatch refresh，也只嘗試 release 自己的 UUID，避免永久鎖住尚未輪替的 session。

需要 refresh 時，明確追蹤 refreshAttempted、rotatedPairReceived、sessionCommitted、lockReleased。Dispatch 前標記 refreshAttempted；收到 pair 後驗證身份，再加密並以 lock UUID fencing `mcp_session_commit` 持久化、清鎖；commit 確認後才返回 fresh JWT。沒有 auto-refresh client、browser session 或 instance cache correctness dependency。

鎖沒有自動 timeout takeover。Read/acquire 各最多 bounded wait 約兩秒，再 fail closed。**Fresh path 的一般 Auth/network failure 不留下 rotation lock**；fresh ciphertext 損壞或 identity mismatch 仍拒絕 token，但不額外 acquire lock。安全事件本身需 operator 調查／修復，不會因 retry 而回傳未驗證 JWT。

**Refresh request 已可能送出後**，timeout、pair 格式/身份錯誤、驗證失敗或 commit acknowledgement 不確定時，不自動重送 refresh、不 release lock。新 pair 是否已保存由 SQL 事實決定：若 commit 實際已成功但 ack 遺失，之後 read 可取得 persisted pair；若尚未成功，durable lock 仍阻擋後續請求。Rotation critical section acquire 後 process 被終止（無法執行 safe release）、或 safe release 無法送達資料庫，仍保守保留 lock；這不是自動 crash recovery。Fresh read/verify process 中止則從未取得 lock。Supabase 的 refresh reuse 容錯不是本實作的並行 correctness 依據。[官方 sessions / refresh reuse](https://supabase.com/docs/guides/auth/sessions)

Operator recovery 僅適用不確定 rotation／compromised 或不可讀 session；不是 ordinary transient verification failure 的必要步驟。恢復：先停該 principal 的 writer 流量、終止仍可能在執行的 refresh worker；透過可信 Auth 管理流程撤銷舊 session，再由 DB owner 移除該 principal 的 session row，重新登入同一 non-admin actor並 provision。不要直接清空別人的 lock_id 或重送舊 refresh token。Encryption key 遺失/輪替同樣需要明確 re-provision，不會退回明文或舊固定 JWT。

## Credential boundary

- `privilegedRequest`：apikey = service/secret；legacy service JWT 另帶 Bearer，`sb_secret_` 不當 JWT。只處理 trusted RPC / public-safe views。
- `actorRequest`：apikey = `MCP_SUPABASE_PUBLISHABLE_KEY`，Authorization = freshly verified actor JWT。不帶 service key、也沒有 service fallback。Auth user/refresh request 同樣只使用 publishable key。[官方 API key 說明](https://supabase.com/docs/guides/getting-started/api-keys)
- Config 要求 publishable key、獨立 session encryption key，繼續 hard-block Production URL、預設 MCP_ENABLED=false。所有相關變數都不加 VITE_。

## Isolated provisioning runbook

僅在已授權且不新增費用的隔離 Supabase project 執行；Production 明確禁止。目前沒有符合條件的環境，**本輪沒有執行以下 remote 操作**。

1. 記錄 isolated project ref 與 Preview origin；再次確認不是 Production。套尚未遠端部署的 Phase 1A migration。任何 remote 套用後，不再改該 migration，改用 forward migration。
2. 用可信 server Auth 管理流程建立/登入兩個穩定非 admin actor，及 read-only principal。DB owner 寫 private.mcp_principals mapping；確認 actor 不在 private.admin_users。不能讓 caller 指定 actor、取得 admin 或 refresh token。
3. 設定 `.env.example` 中 MCP server 變數；encryption key 與 photo secret 獨立。Auth session JSON 僅包含 access_token/refresh_token，透過安全檔案權限保存到 Git 忽略的 output 目錄。不要把 token 放 CLI args、logs、MD 或 MCP tool。
4. 在已安全載入 server env 的 terminal 執行 `npx --no-install tsx scripts/mcp-provision-session.ts <principal-id> output/<private-session-file>.json`。此 script 重新經 environment guard、Auth user verification 與 SQL non-admin mapping；只 insert、不 overwrite active/blocked session。完成後安全刪除 session input。Script 不建立 actor、mapping，也不套 migration。
5. 經官方 MCP client與 photo supporting endpoints 驗證以下 gate，保存不含 secrets 的 evidence。完成後停用 isolated writer，等待 review。

## Mandatory release gate

不能用 PGlite、mocked HTTP 或 Node emit PASS 代替以下項目；全部須 PASS 且下一次 review 批准，才可另開 Production release task。

| Gate | 必須保存的隔離環境證據 | 本輪狀態 |
| --- | --- | --- |
| Hosted Auth/Storage | writer A/B/read-only；JWT expiry refresh 後仍完成 Storage；非 admin 身份；reserve → 真實 JPEG upload → finalize → create/get；WebP observation；owner_id 與 reservation actor 一致；wrong actor upload拒絕；跨 actor/report/kind token拒絕；allowlisted public outputs | PENDING |
| Real PostgreSQL concurrency | 至少兩個真正 connections/instances；same operation+payload 一筆寫入及 replay；different payload 一勝一 conflict；不同 principal 無 cross replay；lost ack 重試原 ID；instance restart replay；session refresh lock contention，並驗證中斷 lock 保持 fail closed | PENDING |
| Hosted runtime | Vercel Preview 或等效 hosted Node 載入兩個 API、sharp、JSON；官方 client initialize/list/resolve/get；write 僅指向 isolated DB | PENDING |
| Target ChatGPT attachment bridge | 目標 client 實際 attachment handoff | PENDING |
| Production MCP | config default disabled + Production hard block | DISABLED |

環境盤點：Supabase connector 只有 active Road Tag Production（ifcicahnrpkwjcxmnmug）以及未授權用於本案的 inactive Disable-Integration-Plateform（nroteeeqyylgwfjkvnsy）。本機 `docker`、`podman`、`psql`、`postgres` 不在 PATH。沒有借用另一專案、建立付費 branch、遠端 migration、Preview/Production deployment，或 Production report/photo QA。

## 本地驗證與 changed files

`tests/mcp-hosted-auth.ts` 現有 **27 checks** 使用 mocked Auth/Storage HTTP + 實際 migration RPC/PGlite：fresh path 不 acquire、/user timeout/503 後正常 retry、read interruption、near-expiry 並行只 refresh 一次、read/acquire 間另一 adapter 輪替、最新 session 無須再 refresh且先 release 再 verify、pre-dispatch安全失敗／acquire lost ack recovery、持久化與 DB reopen、uncertain rotation不偷鎖、owner UUID fencing、wrong/read-only/admin actor、密文損壞、private grants、Storage credential分離與 default/Production guard。結果寫 output/mcp-auth-*/result.json。這不是 hosted integration 或 real multi-connection evidence。

原 `tests/mcp-phase1a.ts` 73 checks 保留。完整 regression：`test:mcp` **73 + 27 PASS**，emitted Node兩個API／sharp／JSON runtime PASS；`npm test` **20 files / 176 PASS**；`test:db` **75 PASS**；lint、build、SEO、git diff --check **PASS**。Build 既有 HEIC chunk warning不屬於本次修改。證據：`output/mcp-test-E1cW5h/result.json`、`output/mcp-auth-KgQjH4/result.json`。

先前 credential/session follow-up changed files（保留歷史，不包含 unrelated dirty changes）：

- `.env.example`、`package.json`
- `server/mcp/config.ts`、`server/roadtag/contracts.ts`、`server/roadtag/supabase.ts`
- 新 `server/roadtag/actor-session.ts`
- `supabase/migrations/20261005090000_mcp_phase1a.sql`（仍只 local）
- `scripts/mcp-local-backend.ts`；新 `scripts/mcp-provision-session.ts`
- `scripts/mcp-runtime-check.mjs`（兩個 API import 與 sharp decode）
- 新 `tests/mcp-hosted-auth.ts`
- `docs/mcp-phase1a.md`；新本文件

Session lock follow-up 本輪只改五個檔案：`server/roadtag/actor-session.ts`、`supabase/migrations/20261005090000_mcp_phase1a.sql`、`scripts/mcp-local-backend.ts`、`tests/mcp-hosted-auth.ts`、本文件。五 tools、photo handoff、credential separation、actor mapping 與 idempotency 實作未重寫。

Migration 仍 local only：此 version 從未在本任務或前兩輪套任何 remote isolated / Production 環境，因此直接修改尚未 release 的 session RPC；未來 remote 首次 apply 後改用 forward migration。本輪沒有 remote apply。

No Production migration applied. No Production reports/photos created. Main not pushed. 停止，等待 code review。
