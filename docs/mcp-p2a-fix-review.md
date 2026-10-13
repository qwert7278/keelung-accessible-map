# Road Tag｜P2A-FIX 獨立審查與修正

2026-10-13。來源：`ROAD_TAG_AI_AGENT_NEXT_EXECUTION_PLAN_2026-10-13.md` Section 2。
基底：#24 `430c5232ee15e064b7ca145bdcd3d453e7f5275d`，stacked on #23 `d946dad562470578bff5ba218e91d7ea3fc1b3e8`。只更新 #24，保留两份未提交報告。最終 head／CI 見 PR metadata；本文件不宣稱 Hosted GO。

獨立 reviewer：使用者明確核准的 `/root/p2a_fix_review` 子 agent，僅唯讀；沒有改檔、操作外部寫入或執行 hosted harness。初輪、修正後第二輪及 harness 補查均有訊息證據。作者執行 focused tests；不是 reviewer 獨自跑完整測試，也不是 GitHub approval。

| Priority / 狀態 | 證實問題、重現、修正與負向測試 |
|---|---|
| P2 / FIXED | `server/mcp/public.ts:64` 原 config 只 deny Production，任意另一個 `.supabase.co` 可通過。新 exact origin `https://wpravdqviylkcpsioybu.supabase.co`，拒絕其他專案／相似域／path/query/hash；RED → GREEN |
| P2 / FIXED | migration 原 `grant usage on schema private to anon` 讓漏 revoke 的 future 函式可被呼叫。兩 helper 移到非 exposed `mcp_public_quota`，移除 anon private USAGE；public wrappers 保持靜態 SECURITY INVOKER，無通用 definer 跳板。未來 private 函式／表即使 PUBLIC grant 也不能突破 schema 邊界；負向 SQL PASS |
| P2 / FIXED | PostgreSQL schema-only default revoke 不能取消全域 PUBLIC EXECUTE；reviewer 以 memory PGlite probe 證實 callable=true。使用 postgres 的 global future EXECUTE revoke，加 schema direct-grant revoke；真實建立 future probe 函式／匿名執行的負向測試 PASS。現有 ACL 不變；未來 postgres-owned public RPC 必須明示 grant |
| P2 / FIXED | `readBounded` 無獨立 abort race，stalled stream/cancel 可繼續 pending；focused `CANCEL_HUNG` RED 後新增 optional signal，public body read 傳入。原 Alpha 不傳 signal 的行為保持；stalled cancellation、512 KiB cap、late admission release、provider abort / no next page PASS |
| P2 / FIXED | 新 HTTPS harness 原僅 hostname prefix/suffix，可向同前綴 attacker domain送 protection credential。新增由 authenticated metadata 獨立 pin 的 exact origin；attacker host / Production / wrong path 在任何 request 前被拒絕，且不輸出 fixture secret |

第二輪未發現新的 P0/P1/P2 可證實阻擋缺陷；Geoapify / Supabase abort propagation、public projection、只三工具、拒絕寫入、quota lease 沒有新增證實缺陷。未來封存尚未實作，不杜撰欄位或「照片撤下已驗證」。

| 驗證 | 實際狀態 |
|---|---|
| public SDK/security/protocol + controls suites | PASS，本地 in-process SDK / PGlite，非 hosted |
| cancel / future-function / exact host / harness config focused tests | PASS；harness config test 不會發送 hosted request |
| 75 SQL permission checks | PASS，本地隔離 |
| 原五工具 read transport regression | PASS，2025 / 2026 protocol，未重跑 Phase 1 |
| lint / typecheck / build | PASS；第一次新測試 stream generic 型別錯誤已修正，重新檢查通過 |
| 最新 GitHub CI | 推送後讀回，以 PR head 為準 |
| Staging / hosted quota / independent PostgreSQL connections / provider account caps | PENDING，需要 owner scoped authorization |

Migration 在 Staging 尚未套用（2026-10-13 唯讀確認），因此修正現有待套用檔案；未修改 migration history。Hosted 套用前再核對 owner=postgres、兩個 schema 的 effective/default ACL、新 schema 不被 Data API expose。現有 API/工具／私密 OAuth／UI 無改動。

回滾：Preview public flag=false、DB enabled=false；migration 未套用前無 hosted rollback。套用後優先關閉並保留 additive schema，避免刪除資料。Production switch 留待 P2B-02，禁止在本輪放寬 allowlist。

下一項：P2A-HOSTED。具體 provisioning、harness、最小授權與復原範圍記於 `docs/mcp-p2a-02-validation.md` 最新段落。可準備 Client / manifest 草稿，但不提前發布或執行 P2B 的真實 client gate。

權限依據：[PostgreSQL ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)，只有全域 revoke 能取消內建 PUBLIC EXECUTE；本次也以可重現 SQL probe 驗證。
