# Road Tag 收官修復 — 2026-10-03

本輪依使用者指定的 Ponytail full 與收官清單，維持 React／Vite／Supabase／Vercel。使用者已選擇「尚無 staging，先完成本地與隔離驗證」。正式站仍為 https://roadtag.org；本輪不修改正式資料、照片、Auth、密鑰或部署。

## Changed

- `src/utils/images.ts`、`PhotoUploader.tsx`：JPG／PNG／WebP／HEIC／HEIF 自動轉 WebP，長邊 ≤1920、不放大、目標 300 KiB／硬上限 1 MiB，移除原始 EXIF／GPS。原檔 ≤10 MiB；解碼前解析圖片標頭，拒絕 >20MP 或單邊 >10000px，解碼後再次檢查。原生 decoder 優先，HEIC 失敗才載入固定版本 `heic-to@1.6.5` CSP 模組，沒有上傳原始 HEIC。
- `src/App.tsx`：移除第二次大小寫敏感文字篩選。正式查詢維持後端 ILIKE 先篩選再分頁與 `%`／`_` 字面值逸出；本地 repository 採相同大小寫語意。
- `ReportPanel.tsx`、repositories：補充與管理更新保留固定 operation UUID；成功回應遺失時，查詢該使用者已提交的 operation，避免第二張照片與第二筆 timeline。管理更新仍有 `updated_at` 衝突檢查；輪詢更新時間不會改掉未完成操作 ID。
- `api/prepare-photo.ts`、Edge `prepare-photo`：同站 server gate 驗證 platform IP，簽署 body／Bearer／時間戳／risk hash；Edge 再以 Auth getUser 驗證實際使用者，service-only RPC 預約照片。撤除瀏覽器直接預約 RPC 權限，照片本體仍直接傳 Supabase Storage。
- `api/photo-cleanup.ts`、`_shared/cleanup.ts`、`vercel.json`：每日 UTC 03:00 服務端排程，最多 100 批 ×20 筆、40 秒批次開始期限（預留最後一批最多 15 秒）、各 HTTP 請求最多 5 秒。只清除 DB 選出的過期且未被引用 path；先 Storage API 刪物件，成功後刪 reservation metadata，失敗保留供下次重試。既有請求順便清理機制保留。
- active deployment／SEO／domain／release／media 文件改用 roadtag.org；帶日期的歷史驗證紀錄保留。HEIC 第三方授權置於 `public/licenses/`。

## Database

新 migration：`supabase/migrations/20261003101522_final_hardening.sql`，新增欄位與窄權限 RPC，未改任何已套用的舊 migration。**尚未套用 Production**。

`report_updates.operation_id` 有 unique constraint；`reports.last_operation_id` 供管理 audit 同交易寫入一次 timeline。public feed 不新增內部作者或操作欄位。`owned_update` 只回目前作者自己的 timeline ID。

跨帳號風險 bucket 每小時最多 30 次新照片預約，保留原每使用者 10/hour 及全站 2000/day 緊急上限。重試既有 operation 不再次計次。應用程式只存每日 HMAC IP 雜湊，不存原始 IP；預約與排程會刪除超過 2 日的 bucket，正常每日排程下約 2–3 日清除。平台基礎日誌不在此應用資料表承諾範圍內。

Schema 為 forward-only；**移除舊 public reservation EXECUTE 屬協調發布變更，不能當成舊前端相容 migration 單獨套用**。舊已開啟頁面須重新載入新前端。

## Verification

驗證結果在本輪完成後列於下方；測試 fixtures 為自產合成圖，隔離 SQL transaction 全部 rollback，沒有正式假案件。

- Unit／endpoint tests：72 tests / 14 files 全通過；另外 location／upload／cron 的 emitted Node.js endpoint 載入與拒絕未授權請求檢查通過。
- PGlite migration from zero：39 checks 全通過，包含 22 cities／368 districts 真 SQL INSERT、RLS negative、內部 operation 欄位不可讀、community／admin retry、stale timestamp 衝突、跨匿名 UID 網路 quota、2000/day 全站 quota、cleanup race、無訪客時舊 hash 清理。
- lint／build／SEO／diff check 全通過；npm audit --omit=dev --audit-level=high：0 vulnerabilities。GitHub CI 尚未執行本地未推送版本，不以本地結果冒稱 CI 已完成。
- Chromium 瀏覽器實際處理 JPEG／PNG／WebP／HEIC／HEIF 全通過；直式 EXIF 旋轉、透明 PNG 白底、WebP 無 EXIF／XMP／合成 GPS marker、≤1 MiB、不放大小圖、48MP 解碼前拒絕均通過。可重跑 `tests/image-privacy.html`。
- 實際 PhotoUploader：HEIC 成功預覽；改選損壞 JPEG 清除舊預覽、錯誤可讀、不能繼續送出；重新選正常 JPEG 後恢復並成功建立本地案件。處理中選檔與下一步 disabled。revision gate 的舊請求／unmount 防護有單元測試。
- Desktop 本地 create／HEIF update／PNG admin improvement／案件 query URL reload 成功：1 筆案件、1 筆民眾補充、1 筆管理 timeline，狀態變已改善／可通過，三種照片讀取正常。小寫 station 找到大寫 STATION。390×844 CSS viewport 無水平溢出（scrollWidth 371）；響應式地圖與表單可操作。處理中禁止送出、同檔重選可用。這些是 browser-local repository 驗證，不視為真實 Supabase Auth／Storage E2E。

本地瀏覽器證據（不含正式資料）：`output/hardening-photo-check.jpg`、`output/hardening-mobile-search.jpg`。測試頁：`tests/image-privacy.html`。QA 伺服器與臨時 tab 在驗證後關閉。

## Remaining

1. 使用者目前無獨立 staging。真 Auth → gate → Storage → insert → feed／share → update／admin → scheduled cleanup 的完整整合寫入，**尚未驗證**。本地 Demo、mock endpoint 與 PGlite 不替代這項；不能用正式站假案件補測。
2. iPhone Safari／Android Chrome 實機照片、低記憶體與 12–20MP 實際耗時 **尚未驗證**。HEIC decoder lazy chunk 約 3.19 MB（gzip 約 792 KB），普通照片不載入；build 的 chunk warning 保留，沒有隱藏。
3. 正式啟用前需設定 server-only secrets，並驗證 Vercel trusted IP 在目前 DNS／proxy 設定下正確。不保存 secret 值於 Git／前端。30/hour 同 IP 限額可能影響共用 NAT；分散 IP 的攻擊仍可能耗盡全站緊急額度，沒有宣稱阻擋所有攻擊。

## Release

本輪為 **local verified** 交付；未 commit、未 push、未 Production deploy、未套 Production migration，未驗證新 Production backend。開工及收尾 local main／origin/main 均為 `27bbe7c`（清單所列 `6e7c715` 之後已另有 Threads 連結修正），正式環境未因本輪變動。

協調發布前置（需當次明確發布指示）：

1. 建立獨立 staging 或安排可回復的隔離測試環境，跑真 Auth／Storage 流程。
2. Vercel server env：`UPLOAD_GATE_SECRET`、`CRON_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`。Edge env：同一 `UPLOAD_GATE_SECRET`；其他 Supabase URL／service key 使用既有服務端設定。密鑰以安全平台設定，不放 `VITE_*`。沒有啟用新付費方案或新外部服務。
3. 預先準備好帶簽章檢查的新 Edge、同站 proxy、server env、新前端與 migration，安排短維護窗協調啟用。不要只套 migration 或只部署新前端／Edge，使現有回報中途失效。確認未簽章 Edge 403、錯 Auth 401、權限/配額檢查、合法 WebP upload；通知舊頁面重載。
4. GitHub main → 既有 Vercel：確認 READY、SHA、roadtag.org routes／canonicals、三種照片操作與錯誤恢復。cron 必須設定正確 `CRON_SECRET`；用 service-only worker 驗證未引用孤兒刪除、引用照片保留、失敗後重試。
5. 檢查每日清理運行紀錄；沒有正常訪客仍會執行。Vercel Hobby 排程為每日一次且可能在排程小時內執行；逾時 backlog 下一日續清，40 秒批次期限／2000 筆不是清空任意大小積壓的保證。失敗會回 503，不能以部署成功當 cron 已驗證。

參考：[HEIC decoder](https://github.com/hoppergee/heic-to)、[Vercel trusted headers](https://vercel.com/docs/headers/request-headers)、[Vercel cron 限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)。
