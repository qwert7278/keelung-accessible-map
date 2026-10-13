# Road Tag｜Phase 2A Hosted Acceptance

2026-10-13（Asia/Taipei）。**PARTIAL：P2A-FIX 已完成；Staging 控制面實測 PASS；整合 MCP Hosted GO 尚未達成。**

## Target / 授權 / 版本

- 使用者已明確核准 Staging migration、Secret、新增 quota state 暫時調整／復原、指定 Preview env / redeploy 及最多 10 次 Geoapify（須先核對方案）。沒有 Production、cases/Storage/OAuth、merge 或公開發布授權。
- 既有 PR #24：`codex/roadtag-p2a-02`，P2A-FIX SHA `dc31397493edf01fa2ac6dc4f1335d5ca5380c04`；base 仍 #23 branch。
- 該 SHA 最新 push / PR CI PASS：[PR run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38349049838)。Preview `dpl_HvHUqME37now8xB7zYJJjeQ5ZQxh` READY、target=null、SHA 一致；`https://keelung-accessible-dcujddlqz-masons-projects-2c78a251.vercel.app`。
- 唯一 DB target：`roadtag-mcp-staging` / `wpravdqviylkcpsioybu`。真實 Supabase HTTPS Data API，使用匿名 publishable key + 獨立 temporary quota capability，沒有 service key。
- Migration `mcp_public_controls` 成功；Supabase MCP 記錄 version `20261013050238`，原待套用檔案 `20261012092416_mcp_public_controls.sql` 已按實際版本重新命名。SQL bytes 不變，SHA-256 `7f6afd4d2e946ef00bf2bd98172904eefd10251eb736fcadb41e260988ab3b10`；沒有重跑或修改 migration history。
- 最終 migration 路徑：`supabase/migrations/20261013050238_mcp_public_controls.sql`。

## 實際測試結果

輸入只含新 quota 專用的 random risk、有效 lease 或錯誤 test gate；沒有真實 IP／Secret／lease ID 出现在本報告。`request` / `geocode` 表示 quota RPC bucket，不是 MCP tools call 或 Geoapify provider request。所有 deny response 是 RPC JSON，不冒稱已測 MCP HTTP 429。

| Hosted probe | 結果／實際 target |
|---|---|
| Schema / owner | PASS：兩 public wrapper owner=postgres / SECURITY INVOKER；兩 quota helper owner=postgres / SECURITY DEFINER |
| Effective / future privileges | PASS：anon private USAGE=false、quota CREATE=false、quota USAGE=true；private callable functions=0、quota callable helpers=2、postgres future global PUBLIC EXECUTE=false |
| DB kill switch | PASS：enabled=false 時匿名真實 RPC 0 admitted / 1 SERVICE_UNAVAILABLE |
| Concurrency | PASS（REST 層）：8 個同時入場請求、agent:false 的獨立 HTTPS sockets，cap=2 時 admitted=2 / denied=6 RATE_LIMITED；包含 release 共 10 條 HTTPS connections。**沒有捕捉每次 RPC 的 backend PID，不聲稱完成獨立 PG connection-ID 證明或 MCP workers 的 E2E** |
| Request IP minute | PASS：暫設 cap=1，4 次真實請求結果 admitted=1 / denied=3 RATE_LIMITED |
| Request IP day | PASS：暫設 day cap=1、minute=60，4 次 admitted=1 / denied=3 RATE_LIMITED |
| Geocode IP minute | PASS：有效 request lease + minute cap=1，4 次 quota 預留 admitted=1 / denied=3 RATE_LIMITED |
| Geocode IP day | PASS：有效 lease + day cap=1、minute=5，4 次 admitted=1 / denied=3 RATE_LIMITED |
| Wrong control credential | PASS：0 admitted / 1 SERVICE_UNAVAILABLE；沒有內容或 credential 洩漏 |
| Lease release / idempotency | PASS：真實 release 後不占名額；再次 release 不造成 RPC error；quota 不退款 |
| 真實 30 秒 TTL | PASS：hold 1 lease，SQL 見 active=1 / 剩餘25秒；global cap=1 後續4次均 denied。等實際TTL（沒有手改expires_at），再4次均 admitted/released，自動清理過期lease |
| Private columns | PASS：匿名 reports select created_by/admin_note 回 HTTP401 / 42501，無資料 |
| Private / helper schema non-exposure | PASS：Accept-Profile private / mcp_public_quota 都回 HTTP406 / PGRST106 |
| Vercel env metadata / write | BLOCKED：list / create project-env 都403 forbidden；建立的目標只有指定branch的false flag，沒有成功變更任何env |
| 真實 MCP initialize / tools/list / 三工具 | PENDING：Preview env 不能配置；不以 REST quota RPC 代替 SDK 驗收 |
| MCP HTTP429 / Retry-After、deadline / finite SSE complete / abort / worker lease | PENDING（hosted）：本地 focused PASS 保留，整合Preview尚未能啟用 |
| Geoapify provider / 全帳號費用 | PENDING：歷史圖顯示每日3000 credits、177 used；費用硬限制沒有確證。**本次 provider calls=0**，不使用 Production key |

只取得控制面的部分 hosted 證據，不把「具備寫入新 quota state」當公開 MCP 已上線；也不把 REST concurrency 當不同平台或獨立 PostgreSQL sessions 的證據。

## 復原與 Secret 清理

起始：enabled=false / gate未配置 / counters=0 / leases=0。暫時 gate 安全隨機生成，DB只存hash，用 TLS header呼叫；未配置到Vercel（403）。本地Secret僅在已批准的臨時檔／記憶體，未印到chat/log/Git。

最後真實 SQL讀回：**enabled=false、gate_configured=false、counters=0、leases=0**；所有policy數字恢復原baseline（60/600/600/5000、5/20/40/200、4/16）。臨時憑證檔已刪除、測試 credential variables 已清空。没有新建案件、圖片或OAuth資料。

初次控制面 batch 設定失敗時，finally 已關閉／復原；後續採分項profile成功完成上述測試。不是未完成的安全恢復，沒有略過fail-closed處理。

## 唯一最小下一個操作

**恢復正常 Vercel 連線對 `keelung-accessible-map` 的 branch-specific Preview environment 管理權限，或由 owner 在 Dashboard 設定。** 本機沒有已登入 Vercel CLI；沒有重試相同403、繞權限或要求貼Secret。

核准仍有效，不需再核准同一Staging操作；权限恢復後重新生成獨立gate、核對當下Preview origin / SHA並安全配置。只在短測試窗口啟用，完成同一場整合MCP harness、HTTP429／SSE／kill switch和真正backend session證據後復原兩個開關。

HMAC gate、publishable key與Geoapify key都經安全env機制處理，不放README／聊天。Geoapify帳號方案／overage限制仍須在provider test前核對；本報告的quota值不是帳號支出上限。

下一Task仍為 **P2A-HOSTED 剩餘整合驗收**，不是P2B-01、合併、Production或Registry發布。獨立審查與focused工程證據見 `docs/mcp-p2a-fix-review.md`。
