# Road Tag｜Public Read MCP Release

2026-10-14（Asia/Taipei）。規格：`ROAD_TAG_PUBLIC_READ_MCP_PRODUCTION_RELEASE_GO_2026-10-14.md`。

**Engineering preparation；Awaiting Production Approval。正式網址尚未發布，不宣稱可用。** 本輪取代舊 P2B-01 的三 Client／兩 Agent 強制門檻；歷史報告與 PASS／NO-GO 不改寫。未執行 Production migration、env、merge、部署／啟用或平台發布。

## 變更與獨立設定

沿用 #23 → #24 的 handler／RoadTagService／公開 feed／Streamable HTTP／waitUntil／25 秒 deadline／quota／lease。發布分支 `codex/roadtag-public-read-release` 基於 #24 的 aa83b7b，加上最新 main df3d605 的本地整合；其他 worktree 的 dirty files 保留。原五工具、OAuth、照片／網頁回報不改。

| Production-only Vercel env | 值／用途 |
|---|---|
| MCP_PUBLIC_PRODUCTION_READ_ENABLED | 初始 false；owner 核准驗收／GO 才 true |
| MCP_PUBLIC_PRODUCTION_READ_ORIGIN | https://roadtag.org |
| MCP_PUBLIC_PRODUCTION_READ_SUPABASE_URL | https://ifcicahnrpkwjcxmnmug.supabase.co |
| MCP_PUBLIC_PRODUCTION_READ_SUPABASE_PUBLISHABLE_KEY | 該 Production project 的 publishable key；不用 service-role |
| MCP_PUBLIC_PRODUCTION_CONTROL_SECRET | 新 CSPRNG 獨立 capability，server-only；DB 只存 SHA-256 |
| MCP_PUBLIC_PRODUCTION_GEOCODING_ENABLED | false；公開地址搜尋暫停，不改原 Alpha 的 Geoapify env |
| VITE_MCP_PUBLIC_RELEASED | 初始 false；最後公開部署 true，僅非 Secret 的首頁狀態 |

只有 VERCEL_ENV=production 且 VERCEL=1、正確正式 origin／DB／獨立設定完備才接受 Production。Preview 繼續使用原 MCP_PUBLIC_*／Staging；不能 fallback 或共用 Gate。錯誤 URL、Host／Origin、Secret 來源混用 fail closed。控制 Secret 不放首頁／VITE／文件／Client。

首版 **GO with declared limitation**：resolve_location 支援 lat/lng；地址／地標 query 明確 LOCATION_SEARCH_UNAVAILABLE，不繼承 Alpha provider、不呼叫 Geoapify。首頁／工具描述一致。其餘兩工具只讀公開案件。使用者需在支援自訂遠端 Streamable HTTP MCP 的 Agent 中自行新增 `https://roadtag.org/api/mcp-public`；無 Road Tag 登入／邀請碼，不保證平台自動發現或官方相容性。

## SQL 審核與 preflight

14 日 Production 唯讀查核：quota 三表／acquire 不存在、migration 20261013050238 未套用；report_feed／report_update_feed 都是 security_invoker=true，無 created_by／admin_note／photo_token 等欄位，anon private USAGE=false，基表 created_by／admin_note 不可讀。只查 metadata，未讀／改私密案件。

正式只套用本 PR 審核後的 `supabase/migrations/20261013050238_mcp_public_controls.sql`。**該版本已在 Staging 套用原版；此 PR 是未套用 Production 前的縮限修訂，不在 Staging 重跑、也不批次 db push。** 執行前再次確認 migration／schema／functions 沒有衝突；若部分存在，停止精準比較，不能 DROP／覆蓋既有 objects。

舊版的 postgres 全資料庫 ALTER DEFAULT PRIVILEGES 已移除。新 SQL 僅新增 quota objects、明確 function ACL；anon 不得進入 private／mcp_public_quota namespace。兩個固定 SQL SECURITY DEFINER public wrapper 只呼叫對應 quota helper，search_path 空、2 秒 statement／1 秒 lock timeout；Gate hash 驗證、限額及 lease 規則不變，不可指定函式名稱或讀業務資料。PUBLIC／authenticated EXECUTE 撤銷，只有 anon wrapper 能力。**新增函式仍须明確設定 ACL；不以本次 migration 改其他功能的未來權限。**

Migration 初始 enabled=false／gate=null。發布時只設定這個新控制 row 的 Gate hash；不寫案件／照片／OAuth。配置前比較新 Gate 不等於 Staging／Alpha／upload／service-role Secret，保留既有權限。PG local regression 已驗證未來私有／helper 函式不可直接調用，無關既有及未來函式 ACL 不變。

## 一次性待核准操作範圍

待核准 SQL SHA-256：`22a0a67782ec1f29a27fab5b8ac53933021bcc51e117d2bad6d0ffcc0a121428`。執行前再次核對檔案雜湊與 reviewed commit；若變更則先重新審核，不套用其他 pending migrations。

1. **合併／部署**：核對新 main、三個 PR 的 reviewed head 與 CI，依 #23 → #24 → 本發布 PR 順序整合。不得要求公開 merge 一律跳過 CI。GitHub main 自動触發現有 Vercel Production 部署；初始 public／首頁 flags 保持 false，保留地圖／首頁既有變更。
2. **Production migration／安全設定**：只在 ifcicahnrpkwjcxmnmug 套用上述已縮限 SQL；安全取得 publishable key，生成新獨立控制 Secret、DB 只存 hash；只配置上述 Production env，不動 Preview、Alpha、OAuth、照片、原 provider。地址 provider 保持 false，無付費模型／geocode 測試。
3. **有限正式驗收**：短暫啟用新 DB row 與 server env、重新部署指定 SHA；最多 30 個 MCP HTTP requests，僅既有公開案件／座標。官方 SDK initialize/list 恰好三工具、三讀及私密欄位／write denial；完全無 Cookie、OAuth、test token。最小 quota 驗收可暫調新 request_ip_minute=1（兩次 tools/list 取得 429／Retry-After），只測試新 counter／lease；暫關 DB／env 驗證 503/no-store。測後先關閉、恢復政策 60/600/600/5000、5/20/40/200、4/16，僅清驗收 counter／lease。
4. **公開 GO**：上述全 PASS 後允許最後 server flag=true、DB enabled=true、首頁 flag=true 的正式部署；核對 READY／SHA／roadtag.org、首頁手機複製、公開案件與原 /api/mcp-chatgpt 的未登入拒絕仍正常。www HTTPS 的保留方法 redirect 另核對，但 Client 使用 canonical roadtag.org，不帶保護憑證。
5. **止損／觀察**：任一步 FAIL 立即停新 DB enabled 與 Public server／首頁 flags，不改業務資料；刪短效驗收設定／Secret 暫存。成功保留唯一正式 server Gate 和 hash；不撤銷正式 Gate 導致服務停擺。有限觀察 log 的 429/503／lease，用去敏摘要記錄 SHA、時間與結果。不登錄 Registry／Gallery，不啟動寫入。

這份 runbook 不是上述操作的預先核准。最終交付提供實際 PR／head／CI／Preview，再請 owner 一次核准以上範圍；不要在聊天貼 Secret。

## 標準公網驗收與回滾

授權後核對 Vercel metadata 的實際 SHA；MCP_HOSTED_EXPECTED_SHA 僅宣告預期，不能自行證明已部署。

```powershell
$env:MCP_HOSTED_TEST_AUTHORIZED='true'
$env:MCP_PRODUCTION_TEST_AUTHORIZED='true'
$env:MCP_HOSTED_APPROVED_PRODUCTION_ORIGIN='https://roadtag.org'
$env:MCP_HOSTED_PREVIEW_URL='https://roadtag.org/api/mcp-public'
$env:MCP_HOSTED_EXPECTED_SHA='<metadata verified SHA>'
$env:MCP_HOSTED_REPORT_ID='<existing public Production report UUID>'
$env:MCP_HOSTED_EVIDENCE_FILE='output/public-mcp-production-evidence.json'
# 不配置 VERCEL_AUTOMATION_BYPASS_SECRET／MCP_HOSTED_CREDENTIAL_FILE。
# 地址搜尋不啟用 MCP_HOSTED_ALLOW_GEOCODE。
npx tsx scripts/mcp-public-hosted.ts
```

匿名 harness 硬 pin HTTPS／canonical URL、禁止 redirect／Cookie／Authorization／Vercel bypass／control header。保存公開 allowlist 摘要、三工具／拒絕結果及時間，從不輸出 raw errors／Secrets。首頁複製僅在 reviewed release flag 下可用，每次先匿名 tools/list，確認三工具後複製；503／429／異常工具不複製，clipboard 拒絕有手動回饋及 aria-live。

緊急停用先執行只作用新 quota 控制面的 SQL：`update private.mcp_public_control set enabled=false where singleton;`，立即 fail closed。再把 Production server env／VITE 首頁旗標设 false 並 redeploy；需要撤銷控制 Gate 時才清 hash／移除 Secret。**不 DROP quota 表、不回滾其他 RLS、不刪案件。** 程式回退也必須保留雙層停用；舊 P2A route 不可無 quota 公開啟用。

## 驗證記錄

本地：Production lane／來源／Gate 拒絕、Host／Origin、provider 隔離、Migration ACL、Public MCP／lease／deadline／原五工具 transport focused regression、首頁複製及舊 ChatGPT 範例、Lint／Typecheck／Build／SEO PASS。舊 Phase2A Hosted 複雜競態證據沿用，不重測正式流量。

首頁真實 Chrome smoke：1280／390／320px 無水平溢出，未發布按鈕停用；必要 Cookie 選擇後，以明示本地 MCP response fixture 驗證 Enter／真實 clipboard 的精確網址，以及 503 不複製／aria-live 回饋，PASS。非正式 MCP 呼叫證據。截圖留在 output/playwright/public-mcp-*.png。

作者 Review 已修正：Gate 禁止重用 Alpha 實際 service/session Secret；Host 應接受 DNS 大小寫／HTTPS 預設 443 等價形式，仍拒絕錯誤 Host／Origin。新增 RED→GREEN 回歸。沒有新增獨立 reviewer，也不把作者審查／CI 冒稱獨立審查；既有 #23/#24 獨立 P2A-FIX review 沿用。

新 PR CI／停用 Preview 與 head 於 Engineering Ready 交付讀回；**真實 Production 三工具、正式 quota／Kill Switch、最終公開部署仍 PENDING OWNER APPROVAL**。沒有把 local fixture 或 SDK unit test 報為正式公網 PASS。
