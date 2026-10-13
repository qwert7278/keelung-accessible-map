# Road Tag｜P2A-02 流量、成本、觀測與停用控制

2026-10-12（Asia/Taipei）；Phase 2A / Task `P2A-02`。
**最新結論（2026-10-13）：P2A-FIX 完成，Staging migration 已依核准套用、控制面真實測試 PASS 並復原。整合 MCP Hosted GO 尚未達成：Vercel env list/write 403。最新證據見 `docs/mcp-phase2a-hosted-acceptance.md`；不進入 P2B-01、不合併或部署 Production。**

## 範圍與版本

依 `ROAD_TAG_AI_AGENT_ECOSYSTEM_MASTER_PLAN_v2_2026-10-12.md` Section 2A 與 Section 6 的第二個 atomic job 執行。原五工具、Closed Alpha、OAuth、網站 UI、報告／照片資料與其既有 RLS 不改。

- 最新 main：`44654f097522b7dff366bd18b516c7d91462cfc2`，已 fetch / remote read-back。
- 相依基底：[P2A-01 Draft PR #23](https://github.com/qwert7278/keelung-accessible-map/pull/23)，`d946dad562470578bff5ba218e91d7ea3fc1b3e8`；仍未合併。
- 本次 Branch：`codex/roadtag-p2a-02`；獨立 worktree：`C:/Users/qwert/.codex/worktrees/roadtag-p2a-02/Road Recall system`。
- 最終工程／測試 SHA：`f2c1fba396645e04a8aed0640a89c3922bd9b7af`。後續報告 commit 只回填證據；最終 PR head 以 GitHub 為準。
- 新 PR 以 `codex/roadtag-p2a-01` 為 base，避免把上一任務混入本次 diff；合併順序必須先 #23，再由 owner 審查本 PR 並重設 base，不能自行合併。
- [P2A-02 Draft PR #24](https://github.com/qwert7278/keelung-accessible-map/pull/24)，已驗證 head：`f566e32a662337909d2553e2b6280c1f643439e2`。本次回填僅改文件。
- 已驗證 Preview：`https://keelung-accessible-ofz22spbc-masons-projects-2c78a251.vercel.app`；Deployment `dpl_6AAVdtmm8d6wt6jyXwLBnU7QoTuR`，READY，target=null（Preview），SHA 為上述已驗證 head。因相依 PR 沒有自動 Preview，使用既有 project 的 Git source 建立，沒有改 env / aliases / Production。
- 既有 Production：`dpl_BTVWYHVmVY2Kuacg5oZTNX3DFkws`，READY，SHA `44654f0…`。這是唯讀核對，不是本次部署。

## 實作與檔案

| 檔案 | 本次修改 |
|---|---|
| `server/mcp/public-controls.ts` | quota-only RPC client、按日 HMAC 網路識別、嚴格安全結果解析、固定格式事件 |
| `supabase/migrations/20261012092416_mcp_public_controls.sql` | 三個 private 表、原子 quota / lease helpers、public SECURITY INVOKER wrappers；enabled=false、gate_hash 未配置 |
| `server/mcp/public.ts` | admission、geocode 成本預留、HTTP 429 / Retry-After、fail-closed 503、25 秒 deadline、SSE 完成前持有 lease、512 KiB response cap、request/tool 事件 |
| `server/mcp/handler.ts` | 既有 bounded reader 接受 response body，其他原五工具行為不變 |
| `server/roadtag/public-supabase.ts` | 每 request 的 cancellation signal，保留匿名 publishable-only 讀取與 15 秒 upstream timeout |
| `server/roadtag/service.ts`、`server/location/provider.ts`、`server/location/geoapify.ts` | optional cancellation signal；停止後續分頁與取消 geocode，既有 caller 不傳 signal 時維持原行為 |
| `.env.example` | 新獨立 server-only `MCP_PUBLIC_CONTROL_SECRET`，沒有 secret 值 |
| `tests/mcp-public-controls.ts` | SQL quota / lease / gate / permission、HTTP fail-closed、deadline / SSE、跨 client instance、成本與觀測隱私測試 |
| `tests/mcp-public.ts`、`package.json` | 原三工具測試明確注入 fixture controls；CI 的 public test command 同時執行新 controls suite |

公開 tools 仍恰為 `resolve_location`、`search_nearby_reports`、`get_report`。沒有 cache；回應和 backend fetch 均 no-store，避免不同環境／被撤下資料的快取混用。SSE 是有限單次回覆，等待完整回覆才返回；沒有宣稱支援無限 streaming / subscriptions。

## 實際強制配額

以下是這個服務的**保守營運政策**，已由隔離 SQL 執行驗證；不是推測 Geoapify 帳號方案／額度，也不是整個網站或 Supabase 帳號的支出保證。窗口為 UTC 固定分鐘／日，不是 rolling window。

| Bucket | 每網路／分鐘 | 每網路／日 | 全域／分鐘 | 全域／日 |
|---|---:|---:|---:|---:|
| MCP POST（包含 initialize / discovery / malformed / retry） | 60 | 600 | 600 | 5000 |
| geocode attempt（只有 valid query，座標讀取不計） | 5 | 20 | 40 | 200 |

- 同時執行：每網路 4 / 全域 16；SQL lease 30 秒過期，HTTP 整體 deadline 25 秒。
- 每次 request admission 與 geocode 預留都在同一個 locked policy row 下完成 check + increment；不同 runtime 共用 durable counters。拒絕不增加計數；已准入不退款，避免 timeout / retry / acknowledgement loss 重複消耗無界。
- geocode 必須附有效、未過期且同 risk 的 request lease；沒有 quota 就不呼叫 provider。額度不足是 MCP tool `isError` / `RATE_LIMITED`，request admission 限額則 HTTP 429 + Retry-After。
- limiter RPC HTTP timeout 3 秒、SQL lock_timeout 1 秒；函式另宣告 statement_timeout 2 秒，**尚未用 hosted PostgreSQL 驗證實際 query timer／contention 行為**。Data API 15 秒、Geoapify 5 秒，均與 request abort signal 合併。
- 保留原 input/paging bounds：32 KiB request、radius ≤500m、result ≤20、nearby ≤10 × 500 rows、observations ≤51、query ≤200；HTTP response 512 KiB。
- DB policy row 遺失、gate mismatch、disabled、RPC malformed / timeout / 403、limiter 無法取得都 fail closed；沒有 process-local fallback。沒有自動重試 upstream 或自動開通付費服務。

## 安全與觀測

- Limiter 使用同 staging publishable key + **新的 quota-only capability header** `x-roadtag-control-key`，沒有 service-role key 或 Alpha credentials。credential 不放 RPC body、回應、Git 或本地事件。
- DB 僅存 SHA-256 gate hash。P2A-FIX 將兩個 quota SECURITY DEFINER helpers 放在獨立 `mcp_public_quota` schema，只能更動新 counters / leases；public wrappers 保持靜態 SECURITY INVOKER，private tables RLS 與既有 ACL 不變。
- P2A-FIX 不再授予 anon `private` USAGE；anon 只在 quota schema 有 USAGE / 兩 helper EXECUTE，沒有 CREATE。postgres-owned future functions 全域預設 EXECUTE 撤銷（schema-only revoke 無法取消 PostgreSQL 全域預設），未來 public RPC 必須顯式 grant；既有函式 ACL 不變。負向測試涵蓋未來函式／表及任意 PUBLIC grant，75 項 SQL 回歸 PASS。
- Only when `VERCEL=1`，使用平台覆寫的 `x-forwarded-for`；非 Vercel 或 missing / invalid IP 共用 unknown bucket，不採信 x-real-ip 或任意 proxy hostname。不支援未核對的 Trusted Proxy 假設。
- 儲存的是按 UTC 日輪替的 HMAC network hash，不是原 IP；不以 client 可捏造的 actor/client ID 分桶。NAT 可能共用額度；不同 key rotation 可能改變 network bucket，但 global quota 不重置。
- active admission 時清理過期 lease 與超過 48 小時的 counter window；**idle / disabled 時不是背景自動清理**，operator 需要定期清理，不宣稱硬性 48 小時刪除保證。
- 固定 JSON event：`event=mcp_public`、operation allowlist、outcome、duration_ms、HTTP status。沒有 IP、risk hash、query、coordinates、report ID、gate、payload 或 raw upstream error。
- HTTP 200 的 MCP domain failure 不能當工具成功：用 tool operation 的 ERROR / RATE_LIMITED 事件看失敗；request event 是 transport outcome。release 失敗另記 SERVICE_UNAVAILABLE，lease 由 SQL TTL 保護。這不是已上線的監控 dashboard / 自動告警。
- quota credential 被盜仍可消耗此服務額度，應先停用並 rotation；它不能升權、寫 report 或讀 private report 欄位。公開 Supabase 既有直接讀 API 與 Vercel ingress invocations 不是本 RPC 的全面支出防線。

## 驗證結果

Windows / Node 24.11.1、MCP server/client 2.1.0、TypeScript 6.0.3、Vitest 5.0.2、PGlite 0.5.3、Supabase CLI 2.120.0（只使用 `migration new`）。沒有更動 dependency versions / lockfile。

| 檢查 | 結果 |
|---|---|
| test-first | RED：缺少 controls module；deadline probe 另抓到 headers 提早釋放 lease，修正後 GREEN |
| `npm run test:mcp-public` | PASS：三工具、兩個 protocol eras、拒絕寫入/私密欄位/RLS/direct-ID；controls suite 與 emitted route probes |
| `npx tsx tests/mcp-public-controls.ts`（最終 security fix 後） | PASS：request / geocode 四類 counters、IP / global concurrency、wrong gate / expired & cross-risk lease、kill & missing policy、forbidden tables/helpers、restart / separate client instances、429 / 503、no upstream on quota denial、SSE lease lifecycle、timeout、event privacy |
| `npm run lint` / `npx tsc -b` / `git diff --check` | PASS |
| `npm test` | PASS：27 files / 263 tests；location / upload emitted probes PASS |
| `npm run test:db` | PASS：75 isolated SQL checks；不是 hosted RLS evidence |
| `npm run build` | PASS；既有 HEIC bundle warning |
| `npx tsx tests/mcp-read-transport.ts` | PASS：原五工具 discovery/schema、雙協定三個 read calls、匿名 OAuth denied；不是重跑 Phase 1 |
| `npm audit --omit=dev --audit-level=high` | PASS：0 Production vulnerabilities；保留先前已記錄的 dev dependency warnings |
| GitHub CI | PASS：已驗證 head 的 [PR Quality run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38231698461) 與 [push run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38231690181) 均 success |
| Hosted Preview default-off | PASS：Vercel authenticated GET `/api/mcp-public` 回傳 503 / SERVICE_UNAVAILABLE / Cache-Control:no-store；不代表已啟用 limiter 或 staging 三工具驗收 |
| Hosted migration / 真實 staging quota / 多連線 SQL contention / Geoapify plan budget | PENDING，未執行或未取得證據；不能把 PGlite Promise.all 當成 hosted 多連線競態 |
| Gemini / Claude / Manus / ChatGPT / Codex / Python 真實 clients | PENDING，P2B-01 範圍 |

### Code Review Findings

2026-10-13 已取得使用者授權的獨立子 agent 唯讀 review，兩輪精準審查並修正證實的 P2 問題，見 [P2A-FIX review](mcp-p2a-fix-review.md)。GitHub 沒有 reviewer approval，不把子 agent 的本地 review 或 CI 當成 GitHub 核准／Hosted GO。

已修正並驗證：SSE headers 回傳不代表 tool 完成；需完整 body/deadline 才釋放 lease。policy 在 gate check 與 locked read 間遺失時，要明確 fail closed，不能讓 SQL NULL 判斷繼續；geocode lease 也檢查當下 expiry。control secret 改為 credential header，避免出現在 RPC body query arguments。

未解決的驗收問題：hosted policy/secret provisioning 與 real concurrency 證據、獨立 review、provider 全帳號 quota/billing。沒有把測試或 platform account limitation 描述成 GO。

## Preview provisioning / operator runbook

1. 指定已批准的隔離 staging project，核對這一份 additive migration。**本次未套用 hosted migration，更不能使用 Production。**
2. 用安全機制生成至少 256-bit random 的獨立 `MCP_PUBLIC_CONTROL_SECRET`；透過 branch-specific Preview env 設定，不能 reuse `MCP_PHOTO_SECRET` / `UPLOAD_GATE_SECRET` 或把值送給 MCP client。只把其 SHA-256 hash provision 到 private control row，過程不輸出 secret。
3. 維持 `MCP_PUBLIC_READ_ENABLED=false` 與 DB `enabled=false`，先核對 quotas、Exact Preview origin、staging publishable key、Geoapify 方案硬限制、migration/grants，再經安全驗收開啟 Preview 測試。環境／schema 不完整時，public endpoint 必須仍 503。
4. 真實 SDK initialize/list/三工具呼叫、429、SQL/RPC outage、geocode denial、multi-worker shared quota、SSE timeout/release、kill switch 必須提供真實 hosted 證據。P2A-01 的 real staging gap 也仍需補齐。
5. 使用既有 log 系統以 `event=mcp_public` 區分 request / tool，觀察 latency、TIMEOUT、quota、outage 與 release failure。事件沒有自動 alert、沒有 query payload；需要 operator review。

立即停用新服務（僅有權限的 operator 在核對過的環境執行；本次沒有執行）：

```sql
update private.mcp_public_control set enabled=false where singleton;
```

下一次 admission / geocode reservation 即拒絕；已准入的 read 最多維持其 deadline。Environment 的 `MCP_PUBLIC_READ_ENABLED=false` 是另一層停用，但 env change 需按 Vercel 重部署規則生效；DB 開關不需重新部署。Production guard 仍存在，無法藉這份 PR 的 env 開關啟用 Production。

定期 cleanup（staging / 批准環境，由 operator 執行）：

```sql
delete from private.mcp_public_leases where expires_at<=clock_timestamp();
delete from private.mcp_public_counters
 where window_start<floor(extract(epoch from clock_timestamp()))::bigint-172800;
```

不得透過 MCP 呼叫 policy update / cleanup；這些維護 SQL 未授權給模型或 anon。

## 阻擋、回滾與下一項

既有 Vercel connector 可讀 deployments，但 P2A-01 的 env metadata access 回應 403；目前沒有 branch-specific control secret / staging policy 配置。没有新憑證／設定權限就保持 disabled；沒有要求關閉 Deployment Protection 或借用 Alpha service key。

無 report / Storage / OAuth migration；新 migration 預設關閉，資料表僅保留 quota state。回滾優先 DB enabled=false / public env false；回退程式到 P2A-01 base即可停止新 route 控制，不需刪表／清報告資料，保留 additive tables。**P2A-01 base 的 route 也必須維持關閉，不能回退後無限制地公開啟用。**

下一個建議 Task ID 是 `P2B-01`，但先補齐 P2A-01 / P2A-02 hosted Preview、安全及獨立 review gate，由 owner 確認後才開始。本次不自動進入下一項。

官方依據（本次已查核）：[Supabase API grants / functions](https://supabase.com/docs/guides/api/securing-your-api)、[Vercel request headers / proxy trust](https://vercel.com/docs/headers/request-headers)。保留已鎖定 SDK 的 Streamable HTTP / 2025 compatibility semantics，不杜撰平台 auth 或 billing 能力。

## Phase 2A Final Hosted Acceptance（2026-10-12）

**NO-GO；未取得 hosted provisioning / test-state mutation 授權，停止。不得進入 P2B-01。**

### 最新版本與唯讀證據

| 項目 | 本次結果 |
|---|---|
| PR #23 | Draft / OPEN；head `d946dad562470578bff5ba218e91d7ea3fc1b3e8`；最新 push / PR CI success |
| PR #24 | Draft / OPEN；head `430c5232ee15e064b7ca145bdcd3d453e7f5275d`；最新 [PR CI success](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38232356182) |
| 整合 Preview | `dpl_5v6RJWLaKDmCbk1MKU4t9RHu8PHj`，READY，target=null（Preview），SHA 與 #24 head 一致；`https://keelung-accessible-fnics644i-masons-projects-2c78a251.vercel.app` |
| #23 Preview | `dpl_DJ1kbH5J1ruK8o9ntjZbiFzD3SMA`，READY，SHA 與 #23 head 一致 |
| 兩個 Preview GET /api/mcp-public | PASS（default-off only）：Vercel authenticated fetch 各為 503 / SERVICE_UNAVAILABLE / Cache-Control:no-store |
| 批准的 Supabase Staging | `roadtag-mcp-staging` / `wpravdqviylkcpsioybu`；依據 `docs/mcp-phase1b-oauth-gate.md` |
| Staging migration / objects | 唯讀 transaction 查核：三個 private control / counters / leases 表與兩個 public RPC 全部不存在；`supabase_migrations.schema_migrations` 沒有 version `20261012092416` |
| branch-specific Preview env metadata | BLOCKED：Vercel API 403 forbidden；不解密，未取得 value；本機無已配置 Vercel CLI fallback |
| 獨立 Code Review | PENDING：兩個 PR 的 reviews 為空；本次沒有獨立 reviewer 結果，不能把作者 review 或 CI 當成獨立審查 |
| Geoapify account quota / costs | PENDING：未取得實際帳號 plan、daily credits / usage、overage、hard spending restriction 證據；程式政策值不是供應商帳號證據 |
| initialize / list / 三工具、request / geocode quota、獨立連線 concurrency | PENDING：schema / configuration 不完整，未嘗試以 disabled endpoint 冒稱 MCP PASS |
| deadline / SSE completion / lease release、DB kill switch、hosted data privacy negative probes | PENDING：需要已配置整合 Preview 與 controlled staging state 才能執行 |

本次沒有跑重複本地測試：只更新 Markdown，先前 local PASS 保留為 local evidence。沒有 migrate、改 policy / counters / lease、改 env、建立案件、呼叫付費 geocode、讀出 secret、改動 Closed Alpha 或開始 P2B-01。

### 最少的使用者操作／授權

1. **一個限縮的授權**：允許只在 `wpravdqviylkcpsioybu` 套用現有 `20261012092416_mcp_public_controls.sql`；配置新 quota-only gate hash；驗收時暫時調整這三個新表的 quota / lease / enabled 狀態，測試後復原並保持 endpoint 關閉。允許只為 `codex/roadtag-p2a-02` 的 Vercel Preview 配置既有 runbook 變數並 Preview redeploy。不含 Production、既有報告、Storage、OAuth、公開 MCP、合併或 P2B-01。完成具體 migration / config 審核後才執行。
2. **Vercel 操作權限**：授權文字不能解除目前 API 403。可提供具備該 project Preview env 權限的既有 Vercel 連線；若無法提供，由 owner 在 Dashboard 依本報告的 Preview provisioning runbook 手動設定。不要把 control secret / publishable key / Geoapify key 貼到聊天。設定必須是 branch-specific；不要更動全 Preview 或 Production。
3. **Geoapify 帳號證據與獨立 reviewer**：由 owner 提供不含 key 的實際 plan / credits / usage / overage / auto top-up 或 spending-cap 摘要，或授權唯讀帳號 Dashboard 存取；另指定獨立 reviewer，或明確授權由另一個 agent 唯讀 review #23 + #24。目前只有作者審查，尚不符合獨立 review criterion。

可複製的限縮授權（沒有 secret）：

> 授權只在 Road Tag Staging `wpravdqviylkcpsioybu` 套用 `20261012092416_mcp_public_controls.sql`，配置／暫時調整新 public quota control state 以完成驗收並復原；只改 `codex/roadtag-p2a-02` 的 Vercel Preview env 並 Preview redeploy。授權另一個 agent 對 PR #23/#24 做唯讀獨立 Code Review。禁止 Production、既有案件／照片／OAuth 修改、公開 MCP、merge 及 P2B-01；驗收後停用並回報。

上面的範本尚未被 owner 提交，**不是已取得的授權**。Staging gate key 必須新生成並經安全 env / SQL 通道配置，DB 只存 hash；不要複製 Alpha 的密鑰。若進行 hosted quota / kill-switch 驗收，會更動非正式的新 quota state，因此也包含在必要授權內。

2026-10-12 的 validation 更新曾只留本地；2026-10-13 按新執行計畫保留並整理到 #24 的 P2A-FIX 提交。上表 SHA / CI 是當時 snapshot；最新 P2A-FIX 狀態見下文。Hosted mutation 尚未授權，Preview 必須維持 default-off。

## P2A-FIX / P2A-HOSTED 準備（2026-10-13）

P2A-FIX 已修正 exact Staging host、private schema 授權／future EXECUTE、有限 body cancellation 與先取消再 admission；另備妥 HTTPS SDK harness，精確 pin 最新核准的 Preview origin，保護 protection credential 不外送。

`npm run test:mcp-public` 的各 focused suites、75 DB checks、原五工具 transport regression、lint/typecheck/build 已執行。獨立 review findings 與最終狀態見 `docs/mcp-p2a-fix-review.md`。沒有重跑 Phase 1 閉环或無關 UI 工作。

修正前 preflight：migration/controls/helper schema不存在，anon private USAGE=false。之後 owner 已核准並套用；Supabase MCP version=`20261013050238`，檔名對齊為 `supabase/migrations/20261013050238_mcp_public_controls.sql`，SQL不變，不重跑。Vercel branch env metadata/write均403。Geoapify圖的3000/177是歷史額度使用訊號，不是費用硬限制確證。

owner 已核准上述 staging migration/secret/control-state測試、指定branch Preview env/redeploy與最多10次Geoapify（先核對限制）；不含Production、cases/Storage/OAuth、merge/publication。Staging控制面已測並恢復 disabled/gate未配置/counters=0/leases=0；剩餘整合測試待正常Vercel env權限，無需重複索取相同授權。實際矩陣及Secret清理見最終Hosted Acceptance報告。

最小 HTTPS 工具 harness 已備妥（尚未對 hosted 執行）：

```powershell
# 必須先取得上述 owner 核准，且從最新 Vercel metadata 核對 Preview SHA/origin。
$env:MCP_HOSTED_TEST_AUTHORIZED='true' # 僅意圖護欄，不是同意證明
$env:MCP_HOSTED_APPROVED_PREVIEW_ORIGIN='<metadata核准的exact-origin>'
$env:MCP_HOSTED_PREVIEW_URL=$env:MCP_HOSTED_APPROVED_PREVIEW_ORIGIN+'/api/mcp-public'
$env:MCP_HOSTED_EXPECTED_SHA='<metadata核對的40字元SHA>'
$env:MCP_HOSTED_REPORT_ID='<現有staging-public-report-UUID>'
# Geoapify 預算核准後才設 MCP_HOSTED_ALLOW_GEOCODE=true。
# 如需 Vercel protection，使用已有授權的安全 env，不把值貼至終端／聊天。
npx tsx scripts/mcp-public-hosted.ts
```

`expected_sha` 只是宣告預期，部署 SHA 必須另外從 authenticated metadata 驗證。harness 的 SDK / input / private-field / write denial 是真實 HTTPS 工具測試入口，**不是已測 PASS**。quota 429 / 多 PostgreSQL 連線 / kill switch 應在 owner 核准後針對新增控制表測一次並復原，所有記錄只寫 sanitized 結果；最後 DB enabled=false、Preview flag=false。`mcp_public_quota` 不得列入 exposed schemas，並核對真實函式 owner/default ACL。

若管理後台未來實作封存，必須同一 release 覆蓋 report_feed 的 UUID/nearby、更新 feed、照片撤下與快取；本次不加入不存在的 archive 欄位或新增 CRUD。
