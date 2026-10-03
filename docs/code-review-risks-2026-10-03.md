# Road Tag 初步風險 review

日期：2026-10-03。檢查版本：`cb4d760d08d71ac20f56a242ee9200da29201153`。本次為 review 與驗證，沒有修改產品程式、資料庫或發布版本。

## Findings（依優先程度）

### 1. [P1，全台開放的阻擋項] 全台能瀏覽，但正式回報仍只開放基隆

- `src/config.ts:46` 的 `canReportInCity` 在正式模式只允許 `TW-KEE`；`src/services/supabase.ts:259` 也會拒絕其他縣市。
- repo migration 的 `supabase/migrations/20260929073544_initial_accessible_map.sql:30` 只建立基隆的 enabled 城市；後端 trigger 同樣要求 enabled 城市。
- 正式站唯讀驗證：台北市／中山區顯示「此縣市提供地圖預覽，正式回報尚未開放」，回報障礙按鈕 disabled。因此目前不能對外宣稱全台都可送出標註。
- 建議：用向前 migration 補齊城市／行政區，隔離測試每個城市的有效／無效位置，再同步開放前端。不能只拿掉按鈕限制。

### 2. [P2] 照片上傳在案件限流之前，未送出案件也能累積公開檔案

- `src/services/supabase.ts:264` 先 upload 再 insert reports。insert 失敗時沒有清理或可重用的上傳紀錄；重試會產生新 UUID／新照片。
- `supabase/migrations/20260929114910_explicit_table_privileges.sql:109` 的 before 路徑允許任意符合 UUID 的案件資料夾，沒有要求已存在的案件／上傳意圖，也沒有照片上傳配額。
- `private.consume_rate_limit` 限制的是案件／補充寫入，不是 Storage 上傳，且依 auth UID 計算。不能將它視為對匿名帳號大量建立或直接 Storage API 濫用的完整防護。
- repo bucket 定義仍是 10 MiB、JPG／PNG／WebP（initial migration:157–158），前端 1 MiB／WebP 可繞過。未讀取正式 bucket 設定，因此這裡是 repo 層的缺口，非聲稱正式 bucket 已遭濫用。
- 建議：對齊後端格式／容量、建立上傳意圖與配額／濫用限制，並由受控後端清理逾期未引用物件；保留真實案件證據。不要開放一般使用者任意刪除 Storage。

### 3. [P2] 先取城市最近 200 筆，才在前端篩選，舊行政區案件會消失

- `src/services/supabase.ts:237` 在行政區／狀態／文字搜尋之前 limit(200)，每 15 秒重新取得同一批城市 feed。
- 超過 200 筆後，某區已有舊案件也可能顯示「沒有符合的回報」；側欄 5 筆分頁只處理這 200 筆，不能補回舊資料。分享按 ID 查案已避開此限制，但一般探索仍受影響。
- 建議：後端先套行政區與其他篩選，再以游標分頁；地圖改依視窗查詢並有明確資料上限提示。案件補充也有 100 筆上限（supabase.ts:290），擴充時一併考慮。

### 4. [P2] 回報表單未沿用選定行政區的地圖中心

- `src/components/ReportForm.tsx:110` 一律以 city.center 初始化 location，即使 initialDistrict 是七堵區，回報選點地圖仍從基隆預設仁愛區中心開始。
- `src/utils/validation.ts:22` 起的檢查只驗證城市的大矩形範圍；district 字串有效不代表座標位於該行政區。後端 trigger 也沒有行政區多邊形檢查。
- 可重現操作：地圖選七堵區 → 按回報障礙 → 選點畫面中心是仁愛區，而行政區欄位是七堵區；若直接選目前顯示的中心，會形成行政區與位置不一致的資料。
- 建議：表單起始 camera 沿用 districtCamera；選點後以可信行政區界線解析／提示不一致，保留使用者確認機制。中心點不等同行政區界線。

### 5. [P2] 網路結果不明時重試，可能建立重複案件

- `src/services/supabase.ts:263` 每次 create 都產生新 UUID，沒有沿用送出操作的 idempotency key。
- 若資料庫已完成寫入但回應遺失，UI 只會顯示失敗；等 cooldown 過後重試會新增另一筆案件，也會再上傳照片。UI 的 busy 防止同頁同時按兩次，不能解決此情境。
- 建議：同一份待送草稿持續使用固定操作 ID；重試前依 ID 確认結果，或使用後端冪等 API，並處理已上傳照片的重用。

## 已通過的驗證

- ESLint。
- Vitest：8 個測試檔、41 項測試全部通過，包括全部 368 行政區中心、分享連結、舊 feed 請求競態、圖片格式與 Auth 行為。
- Node.js location runtime check：Cookie 同意閘門、城市回應與 cache policy。
- TypeScript／Vite Production build 與 SEO check。
- `npm audit --omit=dev`：目前 production dependency audit 回傳 0 項已知漏洞；這不是完整應用程式安全保證。
- 正式站台北市／中山區唯讀驗證，確認預覽限制存在。

## 審查界線與正面觀察

- 公開資料走 security-invoker feed，欄位 grants 排除 created_by／admin_note；管理更新有後端 is_admin／RLS gate，不能只靠前端 admin flag。
- 前端照片重繪移除原始 EXIF、硬限 1 MiB WebP；地理建議 endpoint 有同意與 no-store 設定，程式未儲存原始 IP。
- 本次未對正式資料庫執行寫入／RLS 負向測試，未上傳照片／建立匿名測試帳號，未寄送登入信件。正式 DB 是否與 repo migration 完全一致仍需另外唯讀核對。
- 沒有做負載測試、完整滲透測試或無障礙認證。41 項單元測試不代表全部端到端寫入路徑均已驗證。

建議順序：先決定並完成全台真正開放的端到端配置；對外推廣前處理上傳防濫用；接著修正表單位置／行政區一致性與冪等送出；資料增加前完成後端篩選／分頁。
