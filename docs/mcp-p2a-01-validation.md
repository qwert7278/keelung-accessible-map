# Road Tag｜P2A-01 公開唯讀 MCP 驗證報告

日期：2026-10-12（Asia/Taipei）。Phase 2A / Task `P2A-01`。

**結論：本地實作 PASS；完整階段驗收 NO-GO / hosted evidence PENDING。停止於本任務，不進入 P2A-02，不合併、不正式部署、不公開發布。**

## 規格、版本與範圍

- 規格來源：`C:/Users/qwert/Desktop/roadtag-geoapify-build/ROAD_TAG_AI_AGENT_ECOSYSTEM_MASTER_PLAN_v2_2026-10-12.md`，v2.0，Section 2A 與 Section 6 的第一項 atomic job。
- 規格 SHA-256：`bba331830b129852aab19a260a22a5c5f270b3aaab8621264a7a4fd7c673a55f`。
- 已 fetch 並核對 `origin/main`：`44654f097522b7dff366bd18b516c7d91462cfc2`。
- 最終功能／測試 commit：`015c4a7c13a8ef5f3461d5cff40ffebbd3f2e3b7`。本報告後續 commit 只更新交付證據；PR head 以 GitHub 為準。
- Branch：`codex/roadtag-p2a-01`；獨立 app-managed worktree：`C:/Users/qwert/.codex/worktrees/roadtag-phase2a-01/Road Recall system`。
- [Draft PR #23](https://github.com/qwert7278/keelung-accessible-map/pull/23)。已驗證的 PR head：`c41d9ba53cbd776b0f57dce46386887f3a95a266`；本次回填只改文件。
- Preview：`https://keelung-accessible-95kir47mx-masons-projects-2c78a251.vercel.app`，`dpl_9ZCEeW5HmQwuTehWW4k1Wjb9bgCQ`，READY，與已驗證 head 相同。由既有 Git integration 自動建立，沒有正式部署。
- 唯讀核對目前 Production：`dpl_BTVWYHVmVY2Kuacg5oZTNX3DFkws`，`READY`，SHA 與上述 main 相同。這是既有部署，不是本次部署。

## 已完成的功能與檔案

| 檔案 | 變更 |
|---|---|
| `api/mcp-public.ts` | 獨立 Streamable HTTP route，POST / GET / DELETE，disabled 503 + no-store |
| `server/mcp/public.ts` | stateless SDK handler、三工具 backend allowlist、read-only principal、Origin / request origin 檢查、獨立 Preview/local 預設關閉設定 |
| `server/mcp/handler.ts` | 工具註冊 factory 新增 opt-in publicReadOnly；預設五工具與 Alpha descriptors 保持原行為 |
| `server/roadtag/public-supabase.ts` | 只用 publishable key 的 anonymous public feed adapter，15 秒 upstream timeout、拒絕 redirect、明確 select / paging 範圍、拒絕 RPC / upload / bytes |
| `.env.example` | 四個獨立 public-read Preview 設定項，預設 false；沒有任何 key 值 |
| `tests/mcp-public.ts` | SDK、隔離 SQL/RLS、私密欄位、否定寫入、協定與設定測試 |
| `scripts/mcp-runtime-check.mjs` | 新 route emitted Node import 與 default-off probe |
| `package.json`、`.github/workflows/ci.yml` | `test:mcp-public` 納入 CI，包含 emitted runtime 檢查 |

公開工具恰為：`resolve_location`、`search_nearby_reports`、`get_report`。

沒有 migration、UI、OAuth、原五工具 schema 或正式資料修改。Public adapter 不讀 service key、photo secret、session encryption key 或 Alpha credentials。

## 實際驗證

環境：Windows / Node `24.11.1`；TypeScript `6.0.3`；MCP server/client `2.1.0`；Vitest `5.0.2`；PGlite `0.5.3`；以既有 lockfile 執行 `npm ci`。

| 指令／證據 | 結果與實際 target |
|---|---|
| 新測試先行 | RED：公開 handler 缺少；新增實作後 GREEN |
| `npm run test:mcp-public` | PASS：官方 SDK 呼叫本地 Fetch handler、PGlite 隔離資料；modern 與 2025 compatibility。**沒有經過 hosted network** |
| `node scripts/mcp-runtime-check.mjs` | PASS：emitted Node route 載入、default-off 503 / no-store；原 MCP/photo disabled 行為仍成立 |
| `npx tsx tests/mcp-read-transport.ts` | PASS：原五工具 discovery 與 schema；三項唯讀在 `2025-11-25` / `2026-07-28` 呼叫；匿名 OAuth 被拒絕。不是 Phase 1 重跑 |
| `npm run lint` | PASS，0 errors |
| `npx tsc -b` | PASS |
| `npm run build` | PASS；既有 HEIC bundle 大小警告，未改 UI 或依賴 |
| `npm test` | PASS：27 files / 263 tests，location/upload runtime probes PASS |
| `npm run test:db` | PASS：75 checks，隔離 SQL；不是 hosted Supabase RLS 證据 |
| `npm audit --omit=dev` | PASS：0 Production vulnerabilities |
| 完整依賴 audit | 既有 2 個 high dev dependency findings：`@modelcontextprotocol/client`、`source-map-js`；本次沒有新增或升級依賴。P2B 真實 client harness 應採修補版本 |
| `git diff --check` | PASS |
| GitHub CI | PASS，以上已驗證 head 的 push / PR Quality check 均 success：[PR run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38228688829) |
| 真實 hosted default-off | PASS：Vercel authenticated fetch 的 GET `/api/mcp-public` 回傳 503 / SERVICE_UNAVAILABLE / Cache-Control:no-store；未認證 probe 是 Vercel protection 401，不能當成 app 結果 |
| Preview + real public staging data | PENDING，見阻擋問題 |
| Gemini / Claude / Manus / ChatGPT / Codex / Python 真實 client | PENDING，屬 P2B-01，不冒稱相容性已驗收 |

### 安全負向測試與資料邊界

- `tools/list` 恰為三工具，全部 readOnlyHint；`create_report` / `add_observation` / tool-name injection / `__proto__` 失敗。
- 否定寫入後 reports count 不變、operations ledger 與 storage objects 為零；adapter RPC / put / bytes 直接 FORBIDDEN。
- Output 不含 `created_by`、`admin_note`、raw `image_path`、actor UUID 或 private marker。照片只投影既有 public bucket URL，拒絕任意 URL／path traversal；public URL 本身包含 object identifier，並非 private upload ticket。
- 實際隔離 SQL 的 anon private-column select / private ledger select / report delete 被拒絕。
- 隔離資料庫新增 restrictive select policy，直接 UUID get_report 得不到 row；nearby 不含被擋 ID；get_report 先檢查可讀 report，才讀 observations。
- 最新 main 沒有 archive / soft-delete migration，未杜撰 archived status。這個 restrictive-policy probe 證明 RLS 能阻擋讀取，**不代表已實作或 hosted 驗證封存機制**。未來封存需同時處理 feeds、observations 與公開 storage；不能僅前端隱藏。
- 非法 UUID、未知 UUID、座標超範圍、query >200、limit >20、錯誤 protocol header、malformed JSON 失敗；HTTP 32 KiB cap 實測 413。
- Origin / request origin 不符為 403；stateless GET / DELETE 405；no-store；8 個並行 get_report 成功。這不是流量成本／壓力驗收。
- Adapter HTTP mock 驗證只送 publishable apikey、無 Authorization、no-store、redirect:error；upstream 403 / timeout 不洩漏原文。不是 hosted HTTP PASS。
- Preview 正確設定可建構；service key、既有 Production project、VERCEL_ENV=production 或 flag 未開啟均 fail closed。

## Code Review Findings

完成作者本地審查，未發現本次三工具邊界或私密欄位授權缺陷。GitHub PR reviews / inline comments 查詢目前為空，**尚無獨立 reviewer PASS**；CI success 不能視為 Code Review 核准。

修正並再驗證：測試需要解析合法 2025 SSE response；新的 adapter unsupported methods 移除 unused parameters；CI 增加 emitted route probe。

未完成的 release blockers：hosted Preview/staging E2E、獨立審查。Availability/cost review：沿用既有 domain bounds（radius ≤500m、limit ≤20、nearby 最多 10 × 500 rows、observations ≤51、query ≤200），每次 Data API request timeout 15 秒；現有 Geoapify timeout 5 秒、process-local budget / actor limiter不等於跨实例持久額度。未完成 public IP/cost quota、distributed limiter、觀測與整體 deadline；按 atomic order 留給 P2A-02，**不得公開啟用**。

## Preview 設定與阻擋問題

僅允許已授權 staging 的 publishable key；不用 Production 或 Alpha secrets。

```dotenv
MCP_PUBLIC_READ_ENABLED=false
MCP_PUBLIC_READ_ORIGIN=https://<exact-preview-host>
MCP_PUBLIC_READ_SUPABASE_URL=https://<approved-staging-project>.supabase.co
MCP_PUBLIC_READ_SUPABASE_PUBLISHABLE_KEY=<staging-publishable-key>
```

核對 staging project 與 branch-specific Preview 配置後，才將 flag 設為 true 做真實唯讀呼叫。需要 address/POI 時使用既有 server-only Geoapify 設定；本報告不載入或輸出該 key。

Vercel connector 可讀 project / deployment；讀 project env metadata 回應 **403 forbidden**。本機沒有 Vercel CLI fallback；現有可讀 local env 僅網站設定，沒有 public staging MCP 配置。本次未變更 Vercel env 或 Production。透過既有 Vercel authenticated fetch 成功確認 Preview route 的 default-off 503，但沒有 staged 三工具真實呼叫，不以此或 mock 宣稱真實 staging PASS。

## 回滾與下一步

- 本次無 DB migration／schema rollback；保留原五工具、OAuth、網站與圖片流程。
- 新 route flag 預設 false；即便誤將 flag 開啟，Production guard 仍 503。Preview 停用可用 `MCP_PUBLIC_READ_ENABLED=false`；移除本 PR 即回到 main baseline。
- `https://roadtag.org/api/mcp-public` **尚未正式上線**；沒有 registry、extension、plugin submission 或公開寫入。
- 下一個 gate：補齐本任務 Preview/staging 真實 SDK initialize/list/三工具呼叫與安全否定案例、取得 reviewer/CI 結果，由 owner 確認。
- 下一個建議 Task ID：`P2A-02`，僅在本任務確認後開始；本次停止。

## 官方依據（2026-10-12 查核）

- [MCP 最新 transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) 與 [2025 Streamable HTTP 相容規格](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)。使用已鎖定 SDK handler 處理 JSON-RPC / media / protocol / stateless 行為。
- [Supabase RLS / security_invoker views](https://supabase.com/docs/guides/database/postgres/row-level-security)；[changelog](https://supabase.com/changelog.md) 已讀取，未引入 Supabase API／schema 新功能。
