# Road Tag MCP Phase 1A：本地最小閉環

日期：2026-10-05（Asia/Taipei）。本輪僅本地實作與驗證，等待 code review。沒有 push、Production deployment、Production migration 或 Production report/photo 寫入。沒有新增付費資源。

## Architecture 與完成狀態

`api/mcp.ts` → 官方 SDK HTTP transport → `server/roadtag/service.ts` → public-safe feeds / service-only RPC → 既有 DB triggers、location validation、reservation、claim、cooldown、quota。

官方 SDK server 與 test client 均鎖定 **2.1.0**；`sharp` **0.35.5**、`zod` **4.6.5**、本地 runner `tsx` **4.23.15**。使用 SDK `createMcpHandler`，支援 modern stateless HTTP 與 legacy stateless fallback，不是一般 REST 假裝 MCP。[官方 HTTP handler](https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/server/server/createMcpHandler.html)

本地 backend 使用磁碟持久化 PGlite，載入所有現有 migrations，再加本次 migration。照片保存為真正的 immutable 磁碟 bytes，透過本地 HTTP 上傳／讀取；使用既有 SQL Storage RLS 與 photo claim。這是 **本地 byte-level Storage backend**，不是 hosted Supabase Storage 測試結果。正式方向仍使用既有 Supabase；`server/roadtag/supabase.ts` 提供 PostgREST / Storage adapter，本輪未連線驗證 hosted adapter。

本地新案與補充案件閉環已通過。`/map?city=...&district=...&report=...` 沿用現有 Road Tag URL 形狀；本地 runner 的 `/map` 是 public-safe 案件／圖片驗證頁，並非另建 Production UI。公開回報文字只作資料，頁面使用 textContent，不能當 AI instructions。

## Endpoint

- `/api/mcp`：五個 MCP tools。預設 disabled；無有效設定回 503，缺少／錯誤 bearer 回 401，錯 Host/Origin 回 403。MCP JSON body 最大 32 KiB。無 Origin 的已認證 server client 可使用；不提供寬鬆 CORS。
- `/api/mcp-photo`：POST reservation JSON。
- `/api/mcp-photo?upload=1`：POST <=1 MiB processed bytes；`x-roadtag-photo` header 為同一份 reservation JSON，不接受 caller Storage path/URL。本地對應 `/api/mcp-photo/upload`。
- `/api/mcp-photo?finalize=1`：POST reservation JSON，驗證已上傳 bytes，發 opaque token。本地對應 `/api/mcp-photo/finalize`。
- `/handoff`：本地 test uploader，使用現有 `src/utils/images.ts`。不自動建案。

photo supporting HTTP endpoints 不屬於第六個 MCP tool。沒有接收原圖 base64、ChatGPT internal URL 或任意 remote URL 的入口。

## 五個 tools

| Tool | 本地狀態 | 行為 |
| --- | --- | --- |
| `resolve_location` | PASS | bundled Taiwan polygons，含離島；不讓 city_hint 改座標。邊界回 candidates / LOCATION_AMBIGUOUS；query provider 未 ready 回 LOCATION_SEARCH_UNAVAILABLE。 |
| `search_nearby_reports` | PASS | 10–500m，預設50m；category filter；resolved 預設排除；bounding box 分頁取候選，再 exact Haversine、sort、limit（1–20）。跨區不排除。 |
| `create_report` | PASS | 要求 operation UUID、photo token、位置、文字、category/access、confirmed=true；固定 open，回 report_id、created/replayed、URL。 |
| `add_observation` | PASS | 要求 operation UUID、report UUID、message、confirmed=true；照片可省略；固定 community，不改正式 status/admin_note。 |
| `get_report` | PASS | 顯式 public column allowlist；timeline 最近50筆，created_at desc / id asc，has_more。 |

Nearby 排序：distance asc → updated_at desc → id asc。候選上限5000，超額明確回 truncated=true / requires_refinement=true，不把部分結果當成完整「附近無案件」。分頁 SQL 先取500候選，不是先套 caller 的最終 limit。

輸入使用 strict Zod schema，拒絕 extra properties、非法 enum/UUID、非 finite/out-of-range coordinates、空白／超長文字。SDK schema facade 只公布 JSON schema，參數在 domain 入口嚴格驗證，**驗證成功前沒有 I/O**；這個安排使 schema 失敗也得到安全的 machine-readable tool error，不回傳 SDK 的原始 Zod exception。寫入 read-only principal 在任何 DB I/O 前拒絕。

Tool result 為 structuredContent `{ok,data}` 或 `{ok:false,error:{code,message}}`，並附 text content；tool error 使用 isError。支援 AUTH_REQUIRED、FORBIDDEN、INVALID_INPUT、NOT_FOUND、LOCATION_MISMATCH、LOCATION_AMBIGUOUS、LOCATION_SEARCH_UNAVAILABLE、PHOTO_REQUIRED、PHOTO_TOKEN_INVALID、PHOTO_TOKEN_EXPIRED、CONFIRMATION_REQUIRED、IDEMPOTENCY_CONFLICT、RATE_LIMITED、SERVICE_UNAVAILABLE。auth/transport 錯誤使用 HTTP/MCP 自身語義。

## Auth、principal 與 actor

Alpha bearer credential 僅用 SHA-256 hash 比對，server env 固定 principal ID / scopes / actor；caller 不能提供 actor/user/admin。credential、actor JWT、service key 不入 Git、不回傳 tool、不記錄 logs。每個 write principal 對應獨立 actor，避免共享 cooldown。

`private.mcp_principals` 是受控 mapping，具有 actor unique、can_write、enabled。三個 narrow service-only RPC：`mcp_reserve`、`mcp_finalize`、`mcp_write`；anon/authenticated 無 execute，所有 private MCP tables 亦無讀取權限。mapping 需由 DB owner 在已授權隔離環境 provision；本地 runner 只 seed 自己的 PGlite。

RPC 在限定 transaction 中建立 authenticated anonymous actor claims，沿用既有 triggers。任何位於 private.admin_users 的 actor 都拒絕。固定 open/community，額外私有／管理欄位在 schema 與 RPC allowlist 拒絕。沒有直接 service-role insert 的 API。

Hosted Storage upload/read 使用 publishable key + 經 Auth `/user` 驗證的 fresh actor JWT。Service/secret key 僅進 privileged RPC / trusted public views，兩種 request helper 分開。固定 `actorToken` 已移除，帶該欄位的 config 會被 strict schema 拒絕。Session provisioning、AES-256-GCM 加密持久化與 refresh 已有 adapter/SQL 測試；本地 Auth claim bootstrap 與 mocked HTTP 均不等同 hosted Auth/Storage 實測。詳見 [follow-up 與驗收 gate](mcp-phase1a-review-followup.md)。

## Photo handoff

1. 原圖交給既有 browser compressImage：EXIF/GPS redraw 移除、1920px 不放大、300 KiB target、1 MiB hard limit，WebP preferred / processed JPEG fallback。
2. reservation 綁 actor、operation、report、before/updates kind、format、path、expiry；before 的 report UUID 必須等於 operation UUID。
3. Upload endpoint 在進入公開 Storage **之前**先 decode/檢查 processed bytes，拒絕 EXIF／格式／尺寸問題；immutable、不覆寫；已完成 upload 可跳過重新傳輸。
4. trusted finalizer 回讀 bytes，sharp 實際 decode，驗證 JPEG/WebP、<=1920px、<=1 MiB、single page、無 EXIF/XMP/IPTC，才產生 HMAC opaque token。decode 有 pixel/time bound。
5. DB 保存 token hash、principal、actor、operation、report、kind、path、format、bytes digest、expiry、consumed。
6. write transaction 同時完成 report/observation、既有 claim、token consume、operation ledger；失敗一起 rollback。

Token expiry 由 DB reservation／token row 執行；token 不是 caller 可自造的 path/reference。cleanup 繼續使用既有 photo_intents 與 Storage API 邊界；無 MCP delete tool。未完成的 token row 留在 private table，retention policy 尚待 code review，不影響現有 object cleanup。

**Target client attachment bridge: PENDING。** ChatGPT 能看照片並不表示 MCP 收到 bytes。本輪證明的是本地 uploader 與 SDK client 閉環，沒有宣稱 ChatGPT attachment E2E。

## Idempotency 與 confirmation

Ledger key：principal + tool + operation UUID，並增加 global operation unique（與既有 report/update operation UUID 對齊）。同 key 比較 **完整 normalized JSONB payload**，含照片 token hash identity；不是 instance Map，也不是僅比 operation ID。文字 trim、optional/null/default 由 schema normalize。

SQL advisory transaction lock 以 operation 序列化；same payload 返回原 ID/result；different payload 返回 IDEMPOTENCY_CONFLICT；另一 principal 回 FORBIDDEN。report insert、photo claim、token consumed、ledger completion 在同一 transaction。成功 replay 優先於 token expiry/cooldown，仍檢查 principal 權限。

`confirmed=true` 只是必要 caller contract，不是 server-verifiable 真人同意。AI 必須先向使用者呈現位置、公開文字、category/access、照片使用與 new/existing choice，再取得確認。自動測試使用 confirmed fixture，不把它當作實際真人確認證據。

## Env、local run 與測試

Server-only env：`MCP_ENABLED`（預設false）、`MCP_LEGACY_ALPHA_ENABLED`（預設false；獨立 legacy 授權必須明確 true，Production hard block 保留）、`MCP_PUBLIC_ORIGIN`、`MCP_SUPABASE_URL`、`MCP_SUPABASE_PUBLISHABLE_KEY`、`MCP_SUPABASE_SERVICE_KEY`、`MCP_SESSION_ENCRYPTION_KEY`、`MCP_PHOTO_SECRET`、`MCP_PRINCIPALS_JSON`。

Principals JSON 的欄位：id、actor、write、credentialHash。Access/refresh token 不進 env mapping；加密保存在 private SQL session table。此文件不放任何 secret value。Phase 1A config 明確拒絕 Production project URL，避免誤用既有環境。

本地無需 Supabase branch、Docker、雲端 credentials 或新付費服務：

```powershell
npm run mcp:local
# http://127.0.0.1:8787/handoff
# http://127.0.0.1:8787/api/mcp
```

本地 credentials 與 DB/Storage 存在 Git 忽略的 `output/mcp-local/`。操作 uploader 時從 `local-credentials.json` 取本地 credential；不要分享或提交。Local server 僅 bind 127.0.0.1，限制 Host；Vite 僅服務 src/tests/node_modules，禁止 output/.env/.git 的讀取。

```powershell
npm run test:mcp
npm test
npm run lint
npm run build
npm run test:db
git diff --check
```

`test:mcp` 使用獨立 output/mcp-test-* 目錄、真實 fixtures、官方 HTTP client，並啟動獨立 OS child process 重播結果，驗證沒有 JS 記憶體依賴。另將 api/server emit 為 NodeNext，真正在 Node 載入 endpoint 與 bundled JSON 地理資料。RLS/runtime/byte-backend 各自標示證據，沒有 Production URLs/寫入。

## 本輪驗證與 remaining blockers

- MCP regression：**73 checks PASS**，含五工具 discovery、2026-07-28 HTTP / 2025-11-25 legacy initialize/list、兩條閉環、首次並行同 payload、不同 payload 競爭、lost acknowledgement simulation、跨 principal、expiry、rollback、cooldown、private grants、EXIF/fake bytes 拒絕、公開 Storage 前驗證／串流大小限制、immutable upload、geography/nearby/timeline/candidate cap、獨立 OS process restart。
- Node emitted runtime：PASS。
- 本地 Chrome uploader：PASS。既有 browser compressImage → HTTP processed upload → trusted token → MCP create/get → local viewer；實際圖片載入，1920×960。證據 `output/mcp-uploader-browser-result.json`。
- 既有 `npm test`：20 files / **176 tests PASS**（包括工作目錄內原有 cookie tests），Node location/upload runtime checks PASS。
- `npm run test:db`：**75 checks PASS**，載入包含新 migration 的全套本地 SQL；MCP 特有 transaction/grants 檢查在 test:mcp。
- `npm run lint`、`npm run build`、SEO、`git diff --check`：PASS。Build 仍有既有 HEIC chunk size warning。

未完成／不應外推的驗收：

1. **Hosted Supabase Auth/Storage/PostgREST adapter：PENDING**；尚無隔離 hosted project，未建立付費 branch。本地 filesystem bytes 不等於 hosted Storage HTTP 驗收。
2. **多連線 PostgreSQL lock contention／多 Vercel instance：PENDING**；PGlite 會序列化 connection，首次並行 HTTP 與 OS restart 已測，但不能當作真實多連線競爭證明。
3. **Target ChatGPT client / attachment bridge：PENDING**；只測官方 SDK HTTP client 與本地 uploader。
4. Physical iPhone Safari retest 仍 PENDING，沿用已知狀態；不阻塞本輪本地 MCP。

不含 VLM、看圖分類／severity、自動 merge、OAuth、moderation/admin/delete/status tools、政府派案、Tasks、Dashboard、billing 或 mobile app。停止擴張，等待 code review。

## Changed files

- `.env.example`、`package.json`、`package-lock.json`、`tsconfig.json`
- `api/mcp.ts`、`api/mcp-photo.ts`
- `server/mcp/config.ts`、`server/mcp/handler.ts`
- `server/roadtag/contracts.ts`、`geography.ts`、`service.ts`、`supabase.ts`
- `scripts/mcp-local.ts`、`mcp-local-backend.ts`、`mcp-local-server.ts`、`mcp-restart-probe.ts`、`mcp-runtime-check.mjs`
- `tests/mcp-phase1a.ts`、`mcp-uploader.ts`、`mcp-uploader.html`
- `supabase/migrations/20261005090000_mcp_phase1a.sql`（只在 PGlite 套用驗證）
- `docs/mcp-phase1a.md`

其他既有 modified/untracked files 保留，不 stage、不 commit。本輪結果僅本地；遠端 main / Vercel Production 沒有更新。
