# Road Tag｜Public Read MCP Release

2026-10-14（Asia/Taipei）。規格：`ROAD_TAG_PUBLIC_READ_MCP_PRODUCTION_RELEASE_GO_2026-10-14.md`。

**Production Public Read MCP：GO。** Owner 已明確核准本文限定的正式發布範圍，2026-10-14 已完成實際發布與匿名驗收。正式網址為 https://roadtag.org/api/mcp-public 。本輪取代舊 P2B-01 的三 Client／兩 Agent 強制門檻；歷史報告不改寫，沒有平台模型訂閱或 Registry 發布。

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

## 已核准的限定操作範圍

待核准 SQL SHA-256：`22a0a67782ec1f29a27fab5b8ac53933021bcc51e117d2bad6d0ffcc0a121428`。執行前再次核對檔案雜湊與 reviewed commit；若變更則先重新審核，不套用其他 pending migrations。

1. **合併／部署**：核對新 main、三個 PR 的 reviewed head 與 CI，依 #23 → #24 → 本發布 PR 順序整合。不得要求公開 merge 一律跳過 CI。GitHub main 自動触發現有 Vercel Production 部署；初始 public／首頁 flags 保持 false，保留地圖／首頁既有變更。
2. **Production migration／安全設定**：只在 ifcicahnrpkwjcxmnmug 套用上述已縮限 SQL；安全取得 publishable key，生成新獨立控制 Secret、DB 只存 hash；只配置上述 Production env，不動 Preview、Alpha、OAuth、照片、原 provider。地址 provider 保持 false，無付費模型／geocode 測試。
3. **有限正式驗收**：短暫啟用新 DB row 與 server env、重新部署指定 SHA；最多 30 個 MCP HTTP requests，僅既有公開案件／座標。官方 SDK initialize/list 恰好三工具、三讀及私密欄位／write denial；完全無 Cookie、OAuth、test token。最小 quota 驗收可暫調新 request_ip_minute=1（兩次 tools/list 取得 429／Retry-After），只測試新 counter／lease；暫關 DB／env 驗證 503/no-store。測後先關閉、恢復政策 60/600/600/5000、5/20/40/200、4/16，僅清驗收 counter／lease。
4. **公開 GO**：上述全 PASS 後允許最後 server flag=true、DB enabled=true、首頁 flag=true 的正式部署；核對 READY／SHA／roadtag.org、首頁手機複製、公開案件與原 /api/mcp-chatgpt 的未登入拒絕仍正常。www HTTPS 的保留方法 redirect 另核對，但 Client 使用 canonical roadtag.org，不帶保護憑證。
5. **止損／觀察**：任一步 FAIL 立即停新 DB enabled 與 Public server／首頁 flags，不改業務資料；刪短效驗收設定／Secret 暫存。成功保留唯一正式 server Gate 和 hash；不撤銷正式 Gate 導致服務停擺。有限觀察 log 的 429/503／lease，用去敏摘要記錄 SHA、時間與結果。不登錄 Registry／Gallery，不啟動寫入。

Owner 已回覆「核准上述 Production 公開讀取發布範圍」。核准只涵蓋以上操作，不包含後续 Registry／Gallery／公開寫入；不要在聊天貼 Secret。

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

工程 PR #28 的審核 Head 52e8be8，與合併後 main 的必要整合 Head 4992c6d，Quality push／PR CI 均 PASS。#23、#24、#28 已依序 merge；最終程式 main **6c708bd8efcdaa627ce9be05262dd9f95ffbe9f3** 的 [Quality CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38546131085) PASS。

## 正式發布實際證據（2026-10-14）

程式 [PR #28](https://github.com/qwert7278/keelung-accessible-map/pull/28) 已合併。正式 [Vercel deployment](https://vercel.com/masons-projects-2c78a251/keelung-accessible-map/7DNwAcpFDeTAtn8gAA7CEow6ybAu) `dpl_7DNwAcpFDeTAtn8gAA7CEow6ybAu` 為 READY／target=production／ref=main／SHA=6c708bd8efcdaa627ce9be05262dd9f95ffbe9f3，alias 含 roadtag.org。沒有從別的分支或第二個 Production 系統發布。

| 實際正式驗收 | 結果／證據 |
|---|---|
| 官方 TypeScript MCP SDK 2.1.0 | PASS；無 Cookie／Authorization／Vercel bypass，initialize、三工具發現及三工具呼叫 |
| get_report | PASS；既有公開案件 b770f433-72c7-4f3e-93e8-ec54a7a9c3da；正式案件網址正確；最後部署再次讀取 PASS |
| resolve_location | PASS；25.1269672, 121.7421773 → 基隆市／仁愛區 |
| search_nearby_reports | PASS；500m／include_resolved=true，10 件既有公開回報，含上述案件，truncated=false |
| 匿名寫入／輸出隔離 | PASS；create_report、add_observation 不可用；錯誤 ID 拒絕；完整 SDK 回應無 created_by／admin_note／image_path／photo_token／credentialHash |
| 匿名 REST 權限 | PASS；reports 私密欄位 401；private 控制表 schema 406；anon private／helper USAGE=false、控制表 SELECT=false |
| 429／Retry-After | PASS；短暫 request_ip_minute=1，tools/list 200 → 429／Retry-After=3／no-store；已恢復 60 |
| 兩層 Kill Switch | PASS；DB=true／server=false → 503；server=true／DB=false → 503；均 no-store |
| SSE／Lease | PASS；實際 tools/list／get_report 為完整 text/event-stream，SDK 正常結束，最終 active_leases=0 |
| 原五工具 OAuth 隔離 | PASS；既有端點允許匿名 initialize／discovery 是原設計，實際匿名 tools/call → 401；没有修改其設定／工具 |
| 正式首頁 | PASS；1280／390／320px 無水平溢出；390px 鍵盤 Enter、真實 clipboard 精確網址；複製前的真實 MCP POST 200，無 Cookie／Authorization |
| 正式網站 | PASS；首頁／map HEAD 200，www 首頁 308 → canonical roadtag.org |
| 資料／費用範圍 | 本輪沒有執行案件、照片、OAuth 寫入；沒有模型或 Geoapify 呼叫；地址／地標搜尋維持明示停用 |

Production migration 工具以實際套用時間登錄版本 **20261014095142**／name=mcp_public_controls；套用的是核准的 `20261013050238` 檔案全文，SHA-256 **22a0a67782ec1f29a27fab5b8ac53933021bcc51e117d2bad6d0ffcc0a121428**。没有批次 db push、覆寫舊 migration 或套用其他 pending SQL。

初始 default-off、獨立 Gate／DB hash、正式專屬 env、測試開啟、暫調 quota、停用清理、最後 GO 已依序執行。測試狀態在最後 GO 前清到 Counter／Lease=0；正式啟用後的正常讀取 counter 保留，不為清理重設公網配額。最終 DB enabled=true／Gate configured=true、server=true、首頁=true、geocoding=false，request 60/600/600/5000、geocode 5/20/40/200、concurrent 4/16；active_leases=0。Staging 保持 disabled／gate=null／counter=lease=0。只在 Vercel 和 DB 保留正式 Gate／hash，本機臨時 Gate 檔已移除，沒有建立保護 bypass 或公開控制 Secret。

已記錄 **20 次實際 MCP HTTP 請求**；預算檔保守占用 **21／30**（包含一次沒有送出 MCP 的首頁測試預留）。官方 SDK 的可選 GET 通道回 405，POST Streamable HTTP／SSE 正常，沒有視為跨平台失敗。沒有重跑 Phase 1、Phase 2A 完整驗收。

已解決的驗收工具問題：一次 Supabase request-state 過期，以重新讀回及短 SQL 重試恢復；一次首頁檢查早於 module 初始化，以等待真實啟用狀態修正。均未修改產品程式或降低標準。正式頁面 JS 無錯誤、compiled release flag=true，最後真實 clipboard 驗收 PASS。

有限觀察：14 日指定正式 deployment 最近 5 分鐘 runtime grouped logs 只有 info=1，沒有 error／warning group；這不是長期監控或所有 HTTP 狀態的統計。15 日續接讀回 roadtag.org 仍指向同一 READY deployment／SHA，DB enabled=true、Gate configured=true、request_ip_minute=60、active_leases=0，本機臨時 Gate 檔不存在；沒有重跑 MCP 全套或改動正式設定。

機器可讀去敏證據：[`public-mcp-production-evidence.json`](./public-mcp-production-evidence.json)。地址 provider 與第三方平台帳號驗收不作本次 GO 門檻。下一步可另行準備 Registry／Gallery 發布，需新核准；本輪停止於公開唯讀服務交付。
