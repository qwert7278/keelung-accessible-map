# Road Tag：案件抽屜與位置 API 本地驗證

日期：2026-10-04。基準 `main`／`origin/main` 均為 `68f8cff`。
本輪依 `ROAD_TAG_REPORT_DRAWER_LOCATION_API_AGENT_2026-10-03.md` 修改。**TGOS 正式介接尚未完成，不能將本輪稱為全部完成或正式上線。**

## Changed

- 新增公開案件專用 `ReportDetailShell`，沒有修改通用 `Modal`、`MapView` 或既有 `api/location.ts`。
- 新增 `api/location/search.ts`、`api/location/reverse.ts`，契約與前端 client 放在 `src/services/`；provider 與 handler 放在 `server/location/`，不把輔助檔案當成公開 API route。
- 重排 `ReportForm` 第一階段。沿用 Leaflet、OSM、`districtAt()`、repository、照片與送出流程。
- 保留先前未提交的 SEO／26MP 修復；照片說明改讀既有 `MAX_IMAGE_PIXELS`，避免畫面仍顯示舊 20MP 上限。
- 沒有新增套件、DB migration、Supabase 權限變更、正式 QA 案件或正式環境密鑰。

## Drawer

- >=900px：固定右側非模態抽屜，`clamp(360px,32vw,520px)`、自身捲動、黏住標題／關閉按鈕、沒有 backdrop 或 focus trap。
- <900px：使用原有 `Modal + sheet`；embedded Admin 保持原有管理表單、三類照片及完整紀錄。
- 公開內容先呈現狀態／標題／位置／原始照片／通行程度／障礙類型／描述，再呈現分享與補充入口。
- 預設最新三筆紀錄，可展開全部；補充表單預設收起，儲存期間不能收起。讀取錯誤不會因表單收起而被隱藏。
- 實際地圖頁驗證：列表換案件、marker 開啟、Back／Forward、URL、深連結重載、ESC、關閉按鈕、鍵盤平移、縮放、全部紀錄與補充表單展開／收合皆通過。
- 關閉時若焦點在抽屜內，回到選定的案件卡片；焦點在地圖／列表時不強制搬移。
- `prefers-reduced-motion: reduce` 的取消動畫規則已在瀏覽器 CSSOM 確認；本機偏好是 `false`，未更改 OS 偏好或實測 iPhone。

| Viewport | 實際寬度 | 高度與行為 |
|---|---:|---|
| 1440×900 | 460.8px | 900px，內部捲動，非 modal |
| 1920×1080 | 520px | 1080px，非 modal |
| 1366×768 | 437.1px | 768px，內部捲動，標題保持在頂端 |
| 390×844 | 約374.7px | 原有 bottom sheet 約742.7px，無橫向 overflow |

## Location API

- `GET /api/location/search?q=&cityId=`：trim 後 2–120 字，拒絕未知 cityId，支援全部 22 個縣市 context，最多五筆 WGS84 結果。
- `GET /api/location/reverse?lat=&lng=`：拒絕缺值、空白、NaN／Infinity 與超出 latitude／longitude 範圍的值；成功契約只含地址／縣市／行政區，查無結果為 `null`。
- 回應包含 `no-store`、`X-Robots-Tag: noindex`、`nosniff`，不開 wildcard CORS。錯誤只回穩定代碼，不回原始 provider payload／錯誤或金鑰。
- 不存搜尋歷史、IP，也不碰 Supabase。client 使用 Road Tag 路徑與取消／8 秒 timeout；搜尋 transport 草案為 5 秒 timeout。

### TGOS 待完成事項

使用者已送出 **MOI TGOS MAP API 3.0** 申請，目前審核中。**帳號／申請收件通知不等於核發 APPID／APIKey，也不證明允許 Vercel server-side 使用。**

- `tgosProvider.search` 是根據官方舊版複合定位欄位建立的受控草案；`TGOS_LOCATION_ENABLED=false`，尚未使用正式憑證核對 authentication、3.0 相容性或實際 JSON envelope。
- **`tgosProvider.reverse` 目前保護性拒絕，實際 TGOS server reverse transport 尚未實作。**公開 reverse 契約與 UI 已用隔離 provider 驗證；目前正常環境回受控 `503`，保留選點與下一步。
- 取得服務核准後，要核對服務權限、伺服器授權方式、正式 endpoint／參數／payload，修正 adapter，再做 live search／reverse 驗證。**不能只填入 key 或把旗標改成 true 就視為完成。**
- 金鑰僅能放 server env `TGOS_APP_ID`／`TGOS_API_KEY`，不使用 `VITE_*`、Git 或公開瀏覽器 SDK。尚未設定 Vercel 正式環境。
- 左上「共用性網路地圖元件」用於申請地標搜尋；「坐標回傳門牌服務」的申請對象與 server 使用資格需另核對，不能假設個人帳號自動具有權限。

官方參考：[TGOS 3.0 範例與規格](https://api.tgos.tw/TGOS_MAP_API_3/)、[複合定位參數與 X/Y 欄位](https://api.tgos.tw/TGOS_MAP_API/docs/site/ios/20)、[最近鄰地址 SDK 方法](https://api.tgos.tw/TGOS_MAP_API/docs/site/web/PointAddr)、[Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)。

## Report Location UX

- 搜尋欄與正式地址分開，只按搜尋／Enter 才送出，不自動選第一筆；候選顯示完整縣市與行政區。
- 選候選會更新 pin／地址／camera，再由多邊形校正行政區；其他縣市不自動切換。
- GPS 顯示 accuracy；地圖／GPS 反查只補鄰近地址，不修改精確座標；地址手動修改後，較晚的反查不能蓋掉內容。
- 搜尋／反查失敗時，GPS、地圖、手動座標仍可使用。手動座標移至原生 details；「重新選擇」取消舊定位並清除舊地址。
- abort 加結果守衛處理舊搜尋、反查、GPS 與卸載；位置驗證期間若改點，舊 district 結果不會推進表單。
- G3 的 **11/11** 個 UI 情境在隔離頁使用真正 `ReportForm` 完成驗證，包含讓較舊回應真正晚到後確認最新結果保留；這不是 TGOS live 或實機 GPS 驗證。

## Tests

- `npm test`：**104/104**，15 個檔案；另包含實際 emitted Node.js search／reverse／原城市建議／上傳／cleanup endpoint 載入檢查。
- `npm run test:db`：**39/39**，隔離 SQL 包含 22 縣市／368 行政區寫入、越界拒絕、RLS、照片預約、重試與清理；所有合成 fixture 回滾。
- `npm run lint`、`npm run build`（包含 SEO check）、`git diff --check`：PASS。
- `npm audit --omit=dev`：0 vulnerabilities。既有 HEIC decoder 大 chunk 警告仍存在，本輪未擴充媒體管線。
- 實際本地 HTTP：無效 search／reverse 為 `400`；停用 provider 的有效 search／reverse 為 `503`，皆有 `noindex`。
- 手機詳情與搜尋排版皆測 390×844，無橫向 overflow。**mobile real-device：NOT COMPLETED**；完整 Auth＋Storage 寫入 E2E 未執行。

重跑方式：在 loopback 的獨立 dev port 使用 `VITE_DEMO_MODE=true`，開 `/tests/report-location.html`。fixture 可建立兩筆本地 IndexedDB 案件，再從頁面的連結進真正 `/map` 測 Drawer；成功／失敗／查無／慢回應與合成 GPS 僅在 fixture 頁生效，不進 production build。不要在正式站建立合成案件。

截圖位於本地忽略目錄 `output/drawer-location/`：`drawer-1440.png`、`drawer-1920.png`、`drawer-1366.png`、`drawer-final-1440.png`、`sheet-390.png`、`location-selected.png`、`location-390.png`。

## Release State

| 狀態 | 結果 |
|---|---|
| Local verified | Drawer／API 邊界／UI 隔離情境完成；TGOS live 尚未完成 |
| Committed | NO |
| Pushed | NO |
| Production deployed | NO，本輪未修改正式網站或 server secrets |

目前本地預覽：`http://127.0.0.1:5192/`，使用隔離 Demo repository；畫面中的合成案件與 Demo banner 不是正式網站資料。此輪不 commit／push／deploy，符合提供規格的當次限制。
