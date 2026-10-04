# Road Tag code review — 2026-10-04

## 範圍與版本

- HEAD：`2f2a3d27385a0e571466b0f9b6a70139ac842a86`。
- 審查目前本地程式，包括 PhotoUploader、ReportForm、styles、images 及 images tests 的未提交修改。這些本地修改不代表正式部署內容。
- 以 Remote Desktop Commander 回讀本機 images.ts；以本地 CLI 檢查來源與跑驗證，以 Chrome 的隔離 QA 頁核對定位競態。
- 本次僅審查與建立此報告／忽略的重現檔案；未修改應用程式、提交、推送、部署或操作正式案件。

## Findings

### P1：必填照片欄位被清空，阻擋回報第二步

位置：`src/components/PhotoUploader.tsx:58–65`；呼叫端 `src/components/ReportForm.tsx` 的照片步驟與原生 form。

PhotoUploader 為重選相同檔案立即將 `e.target.value` 清空，但 `required={required}` 仍為 true。即使壓縮成功、父元件持有 Blob 且按鈕重新啟用，原生 file input 仍沒有檔案。ReportForm 未停用原生驗證，因此瀏覽器會在 onSubmit 前阻擋「下一步」。這段行為也存在於 HEAD，並非本地 accept 文案修改才引入。

以 `output/review-native-photo-constraint.html` 在實際 Chrome 重現相同原生約束：合成記憶體 File 設入 file input 後 valid=true；清空後仍保留 File 物件，但 files=0、valueMissing=true、valid=false，requestSubmit 的處理函式呼叫次數為 0。沒有上傳或資料庫寫入。

建議：必填狀態與成功處理的照片值同步，例如 `required={required && !value}`，保留父層 Blob 驗證與處理中鎖定。補瀏覽器回歸測試：選擇照片→壓縮完成→第二步前進→返回第二步→同檔重選及失敗重試。

### P2：行政區載入失敗的 Promise 被永久快取

位置：`src/utils/districtBoundary.ts:9–10`。

pending 直接保存動態 import 的 Promise，失敗時沒有清除。第一次載入行政區 chunk 遇到短暫斷線或部署期間資產失效後，即使網路恢復，同一分頁再次 GPS、選點或按下一步仍取得同一 rejected Promise，無法重新載入資料；目前「稍後重試」提示不會恢復該載入流程。此項依來源判定，未實際攔截網路重現。

建議：loader reject 時刪除該 city 的快取再重新拋錯，保留成功及進行中的載入共用。對部署後失效 chunk 另外提供明確重新載入指引。測試第一次失敗、第二次成功與並行請求共用。

### P2：瀏覽器上一頁沒有使進行中的 GPS 失效

位置：`src/App.tsx:276–284`（popstate handler）；GPS 完成檢查在 locate。

手動切縣市／行政區會增加 gpsRevision，但 popstate 不會。GPS 尚未回傳時使用者按上一頁，先恢復的 URL、行政區與地圖會再被舊 GPS 結果覆蓋。

已在既有 `tests/report-location.html` 的延遲 GPS 情境重現：臺北市→選高雄市→定位→上一頁，立即看到 TW-TPE／中山區；固定 QA GPS 延遲完成後變為 TW-KEE／仁愛區，URL 同步被改寫。座標來自合成 QA，未讀取真實位置、未送出案件。

建議：popstate 開始增加 gpsRevision，沿用既有晚到結果防護；補延遲成功及失敗回呼不覆蓋上一頁／下一頁的測試。

## 驗證結果

- npm run lint：通過。
- npm test：17 test files，141 tests 通過；Node Location／Upload／Cleanup runtime checks 通過。
- npm run test:db：39 項隔離 SQL 檢查通過，涵蓋全 22 縣市／368 行政區插入、負向權限、配額、重試與清理；合成資料 rollback。
- npm run build：TypeScript、Vite 與 SEO check 通過。HEIC 動態 chunk 約 3.19 MB 的既有 build warning 仍存在。
- git diff --check：通過。
- 原生必填照片約束與 GPS popstate 競態：上述隔離瀏覽器重現成立。

## 限制

Chrome extension 尚未允許 file URL 存取，真實檔案選取流程未完成；沒有為測試變更瀏覽器權限。照片 issue 使用原生 DOM 合成 File 約束重現及來源核對，未聲稱完成整套壓縮／Auth／Storage 寫入 E2E。

未測真實 iPhone、完整正式 Auth／Storage 寫入、正式 TGOS；未清理或修改共享正式資料。測試通過不能取代上述三項問題的修復。

## 使用者要求修復後的本地驗證（2026-10-04）

以上為修復前審查紀錄；本節記錄後續修復，尚未提交或部署。

- P1 已修復：PhotoUploader 在沒有處理成功的 Blob 時才設原生 required；重選同檔仍清空 input，既有父層照片檢查與處理中鎖定保留。
- 行政區快取已修復：districtBoundary 使用 retryableLoader，保留進行中／成功資料；失敗移除對應 key，下一次允許新請求，不清除其他城市。
- GPS popstate 已修復：瀏覽器上一頁／下一頁同步地區前增加 gpsRevision，晚到的成功或錯誤回呼會沿用原有 revision 檢查失效。
- 新增 3 項快取回歸測試：短暫失敗後成功、並行載入共用與失敗重試、不同城市快取隔離。
- 新增本地專用 `tests/report-review.html`／`.tsx`：實際 PhotoUploader、JPEG 解碼與 WebP 編碼；照片由 canvas 合成，不需 file URL 權限，沒有網路上傳或 repository 寫入。
- Chrome 驗證：成功照片 image/webp 且下一步次數 1；損壞照片清空舊 Blob、顯示讀取錯誤且下一步仍為 1；重選相同合成檔案後正常 image/webp 且下一步次數 2。
- Chrome 延遲 GPS 回歸：高雄市按定位後上一頁回臺北市中山區，延遲回呼完成後仍為 TW-TPE／中山區，URL 未被改回基隆。
- npm test：18 files／144 tests 及 Node Location／Upload／Cleanup runtime 檢查通過。
- 結束前偵測到其他工作同步更新照片測試與 staging 狀態，保留該內容後再次驗證：18 files／145 tests、runtime checks、lint、build／SEO 均通過；本次沒有操作 Git index。
- npm run lint、npm run build／SEO check 通過。HEIC 既有 chunk warning 保留。
- 資料庫未修改，因此未重跑同一組 39 項隔離 SQL 檢查；前述結果為修復前此輪審查時的驗證。
- 保留原有未提交的照片格式／20 MiB 輸入與手機排版修改，不整批提交。
- 證據：`output/review-photo-fixed.png`、`output/review-gps-back-fixed.png`。上述瀏覽器測試不代表完成正式 Auth／Storage 寫入 E2E 或真實 iPhone 驗證。

## 本次正式發布授權與候選版本驗證

使用者於上述修復完成後明確要求「部署」。發布沿用 GitHub main → 既有 Vercel Production，不修改資料庫或金鑰。

- 基底 main：`515c409c79ebe1bb388c1d954a1cec4f47758a4d`；其中已包含 PhotoUploader 的必填照片修復。
- 本次新增提交只含 App GPS popstate 防護、行政區重試快取及測試、照片隔離瀏覽器測試頁與此紀錄。
- 不帶入其他待提交的 ReportForm／手機排版／PROJECT_MEMO 修改。
- 以 HEAD archive 加本次檔案建立隔離的精確發布候選版本；145 tests、Node runtime checks、lint、build／SEO 通過。
- 該候選版本桌面與 390×844 手機視窗核對合成 JPEG→WebP、成功前進及失敗重試；重新核對延遲 GPS＋上一頁情境。
- 以上「未提交／未部署」文字為前階段紀錄；最終正式狀態以發布後的 GitHub SHA、Vercel READY 與正式站點驗證為準。
