# Road Tag UX／Location／Admin 修正驗證

日期：2026-10-04，Asia/Taipei。起始 main／遠端 main 均為 `515ec03d3c42ebe5de7f074efd511230b78b9fe3`；本輪依提供文件完成本地修正，不提交、推送或部署。

## Changed

| 檔案 | 修改目的 |
|---|---|
| `src/App.tsx` | 公開導航移除 Admin；未授權管理頁只顯示登入；GPS 更新真實縣市、行政區、URL、主地圖，保留開啟中的回報表單 |
| `src/components/ReportForm.tsx` | 回報縣市獨立 state；GPS 多邊形判斷；分離 pin 與 camera；能力開關、泛用搜尋文案、小型座標資訊 |
| `src/utils/locationSelection.ts` | 用既有 22 縣市 bounds 縮小候選，再由 districtAt 多邊形決定縣市／行政區 |
| `src/components/ReportPanel.tsx` | 摘要與次要內容分開；完整說明、其他照片、紀錄、補充表單按需開啟；公共紀錄每頁 3 筆 |
| `src/styles.css` | map route 專用 viewport grid；sidebar 自己捲動；桌面 Drawer 摘要不捲動，手機維持原 sheet |
| `src/consent-entry.tsx` | 首次 consent 保留；桌面 map、admin 不常駐 Cookie 設定，支援 viewport 改變 |
| `src/utils/abortRequest.ts`、`src/services/locationApi.ts` | AbortController＋setTimeout，清理 timer／外部 listener，不依賴 Safari 靜態 AbortSignal API |
| `api/location/capabilities.ts`、`server/location/safety.ts`、`server/location/handler.ts` | 分開 searchReady／reverseReady；HMAC bucket、每分鐘限流與 429／Retry-After；TGOS fail closed |
| `vite.config.ts`、`scripts/location-runtime-check.mjs` | 本地能力 endpoint 與實際 emitted Node 模組驗證 |
| `src/utils/locationSafety.test.ts`、`src/services/adminAuth.test.ts`、`src/services/locationApi.test.ts`、`tests/report-location.tsx` | 地理／限流／abort／Admin 邊界及本地 UI fixture；不寄信、不寫正式案件 |

## Admin

- `/map` DOM 及公開 header／Help／首頁搜尋核對：無 `/admin` anchor。隱藏入口只是導覽決策，權限仍由 Auth＋`is_admin` 決定。
- 真實 App 的隔離 guest fixture 在 `/admin` 顯示品牌、管理者登入、Email、寄送登入連結；沒有公開探索地圖、註冊或帳號名單。
- 既有 `shouldCreateUser:false`、正式 `/admin` magic-link redirect 保持；mock 測試確認一般帳號及 anonymous 即使 RPC true 也不能成為 admin，授權且非 anonymous 才通過。
- 真實寄信／點擊 magic link：**NOT COMPLETED**。本輪沒有寄送正式 Auth 郵件，亦未建立正式 QA 帳號。
- Production-like build／SEO check 核對既有 `/admin` noindex header 設定、sitemap 不含 Admin、`/map` canonical 保持；未修改正式服務設定。

## Current Location

原本 GPS 被目前所選 city.bounds 拒絕；現在由 `geographyAt()` 在候選城市的 polygon 中找行政區，更新 draft.cityId／district。ReportForm 不依城市 prop 重建，保留標題、描述、照片、類型。GPS／反查仍不能改動實際 pin。

- 從臺北市中山區開表單，合成 GPS 指向基隆仁愛：成功切到基隆仁愛、座標 25.12830／121.74190、誤差 18m，標題保留。
- 完整 App fixture 同樣更新主地圖縣市／行政區選單與 URL，回報表單保持開啟，標題 `完整 App 跨縣市` 保留。
- 延遲 GPS 1600ms，之後先點臺北地圖：等待 fixture 明確顯示「GPS 完成」，pin 仍為後選的臺北中山 25.05271／121.52038，舊 GPS 沒有覆蓋。
- Unit test 對 22 個縣市起始點都用 polygon 找到所屬 city／district；海外及 NaN 拒絕。

## Location UX

- 搜尋標籤「搜尋地址」，提示可輸入地標或店家，placeholder「例如：海洋大學、車站、路名」；移除特定私人店家案例。
- provider 未 ready 時搜尋欄不顯示，也不提示目前可搜尋；保留「使用目前位置」與地圖選點。
- 地址、地標搜尋由 mock provider 驗證候選列表，不自動選第一筆。點選候選才更新 pin；API district 提示不取代 polygon 判斷。
- query 與 draft.address 分離；已選位置小字同步 lat／lng。手動座標依 Part C 保留於預設收合的進階區，沒有刪除 domain model。
- 手機手動填 25.12911／121.74122：pin／小字更新，行政區有效，標題保留且可進照片步驟。
- 最大 zoom 19 連續點兩個不同位置，tile DOM 最後只剩 zoom 19；中等 zoom 17 連續點兩點仍只剩 17。MapView picker 沒有 remount，map source 不更新 camera key。
- 反查 mock failure 後仍保留 GPS pin，可前進照片步驟。TGOS 真實地址／地標搜尋與反查：**NOT COMPLETED**，申請審核及 server transport 待確認。

## Desktop One-Viewport

| 尺寸 | document scrollHeight | Drawer clientHeight／scrollHeight | 結果 |
|---|---:|---:|---|
| 1366×768 | 768 | 768／768 | 主頁與主摘要無垂直 overflow |
| 1440×900 | 900 | 900／900 | 同上 |
| 1920×1080 | 1080 | 1080／1080 | 同上 |

1366 主 workspace 高約 556px，地圖正常呈現；sidebar list 保留自己的 scroll。完整說明／照片／現場紀錄／補充表單進既有 Modal；5 筆紀錄可分 3＋2 筆切頁，資料不丟失。Admin embedded 仍顯示原本表單及完整紀錄，不套用公共分頁。

390×844：手機仍為 bottom sheet，無水平 overflow；定位表單進階預設收合。首次 Cookie banner 使用獨立 localhost 測試 origin 確認仍出現；選必要 Cookie 後，切換桌面時 settings 消失，頁面高度 768。首頁／privacy 仍由同一 consent entry 提供重新設定入口。

截圖在忽略目錄 `output/ux-location-admin/`，全部是本地隔離 QA，並非正式案件。

## Location API Safety

- `GET /api/location/capabilities` 回 `{searchReady:false,reverseReady:false}`，private no-store、noindex。真實 upstream 尚未驗證且共享 limiter 不存在，能力目前刻意保持 false；不是填入金鑰就能啟用。
- 本機／缺少 trusted forwarding header 共用 unknown bucket；Vercel runtime 才使用平台覆寫的 X-Forwarded-For，立即 HMAC，記憶體只保留 hash＋計數，不儲存原始 IP。平台 header 說明：[Vercel request headers](https://vercel.com/docs/headers/request-headers)。
- 每個 runtime 每分鐘風險 bucket 30 次、全 runtime ceiling 300 次，記憶體 entry 數受 ceiling 限制；超額 `429`，正數 `Retry-After`、no-store、noindex。
- 實際 loopback HTTP：capabilities off；第 1 次有效搜尋 503、第 31 次 429，Retry-After 正數。mock provider 可獨立測成功／失敗，不改 production capability。
- **這是單個 runtime 限流，沒有可靠的分散式／全站共享 ceiling。** 依 Part F2 的安全 fallback，TGOS 持續關閉；正式啟用前仍須補足並驗證共享限流。沒有新增 Supabase 表或外部基礎設施。
- Safari client 使用 AbortController／setTimeout，外部 abort、timeout、listener／timer cleanup 均通過。Node-only TGOS transport 的 AbortSignal.timeout 不進 browser bundle。

## Tests

- Unit：**138／138**，17 個檔案；Node emitted city／capabilities／search／reverse／upload／cleanup checks PASS。
- DB：**39／39**，隔離 PGlite，22 縣市／368 行政區、負向授權、Storage、配額、重試與清理；合成 fixture 回滾。
- lint：PASS；build／SEO：PASS；audit production dependencies：**0 vulnerabilities**；diff check：PASS。
- 桌面與 390px mobile browser QA：上述結果；OS reduced-motion 規則沿用；iPhone real-device：**NOT COMPLETED**。
- Production Auth／Storage 完整成功寫入、真實登入郵件：**NOT COMPLETED**，未自行寫入正式 QA 案件或照片。

## Release State

| 狀態 | 本輪 |
|---|---|
| local verified | 上述本地功能與隔離驗證完成，外部／實機限制如上 |
| committed | NO |
| pushed | NO |
| Production deployed | NO，維持前次 515ec03 |

預覽為 `http://127.0.0.1:5192/map`，使用 Demo repository。本輪沒有新 dependency、DB migration、權限放寬、正式資料寫入、密鑰設定或公開發布。

### 本次發布授權（2026-10-04）

使用者於上述本地驗證完成後明確要求部署。此次發布僅包含本文件列出的 UX／Location／Admin 修正；其餘本地照片上傳變更保留。已以 HEAD 加上述發布檔案建立隔離副本，重新執行 lint、138 項單元測試、39 項資料庫隔離檢查及 build／SEO。正式狀態以此次 main commit 與 Vercel Production SHA／READY 核對結果為準；上表為授權前快照。沒有 DB migration，TGOS 保持停用。
