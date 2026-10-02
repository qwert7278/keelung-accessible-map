# 架構與擴充

## 目前結構

首頁 `/` 與通行地圖 `/map` 同在主 repo 的 Vite 專案中建置；React 19 + Vite + TypeScript 地圖程式 → ReportRepository 介面 → Demo 或 Supabase adapter。

- `src/config.ts`：城市、顯示名稱、中心、服務範圍、行政區。
- `src/types.ts`：跨儲存實作共用的 Report／ReportUpdate／Repository。
- `src/services/demo.ts`：IndexedDB，瀏覽器本地測試資料。
- `src/services/supabase.ts`：匿名登入、安全公開 view、15 秒前景輪詢、Storage 上傳進度。避免 Realtime 整列 WAL 洩露內部欄位。
- `src/components/MapView.tsx`：Leaflet + OSM fallback；`src/services/maps.ts` 為 Google Maps。
- `supabase/migrations/`：資料表、索引、RLS、Storage policies、不可變歷史、資料驗證 trigger。

## 資料模型

`cities` 1:N `reports` 1:N `report_updates`；`private.admin_users` 記錄授權管理者。

每筆案件保存 city_id、district、lat/lng、category、wheelchair_access、status、原始照片 path、改善照片 path、建立與更新時間。公開 API 使用 snake_case，前端 adapter 轉為 camelCase。

正式狀態：open / in_progress / resolved。民眾建案只能 open；補充紀錄的 suggested_status 不會修改正式狀態。管理者可修改 status、wheelchair_access、after_image_path、admin_note；trigger 同筆交易寫入歷史。resolved 必須有改善後照片。時間由資料庫寫入；更新比對 updated_at，避免覆蓋另一位管理者的新資料。

照片：`report-photos/{reportId}/{before|updates|after}/{uuid}.jpg`，路徑不包含作者 UID。Bucket 公開讀取，限制 10 MB 和 JPEG/PNG/WebP；Storage owner_id 必須等於登入者，after 限管理者。報告 trigger 確認照片確實存在且屬於本人。無 replace／delete policy。前端壓縮為最長邊 1920px 的 JPEG，重新繪製以不攜帶原始 EXIF。失敗上傳與尚未建案的孤立物件需要後續可信任清理工作。

公開 `report_feed` / `report_update_feed` 使用 security_invoker，底層明列 SELECT 欄位，不包含 created_by / admin_note。管理者私有註記寫入 private.admin_audit；公開歷史只記錄固定訊息、狀態與照片。authenticated 只取得必要 INSERT 欄位與四個管理 UPDATE 欄位，UPDATE 最終由 RLS 的 private.is_admin() 授權。private.admin_users、admin_audit、rate_limits 啟用 RLS 且沒有一般角色 policy，刻意預設拒絕。user_metadata 無法授權。

## 擴充到全台灣

1. 在城市設定與 cities table 新增城市／行政區／bounds；不需改案件 schema。
2. 加入 city selector，將查詢與訂閱的 city_id 參數化。
3. 超過第一版最近 200 筆限制時，加入 PostGIS geography、GiST index、viewport/nearby RPC 與游標分頁；不把全台資料一次送到瀏覽器。
4. 官方施工資料採獨立 source/layer，不混用民眾回報的正式狀態與資料來源。
5. 日後加入審核公開狀態與案件派工；先定義營運者和權責。

## 第一版範圍與限制

- 地理 bounds 是寬鬆服務包圍框，非精確行政邊界。
- 搜尋是既有回報文字；Places／反向地理編碼未啟用。地址可以空白。
- Supabase 資料庫層每 UID 30 秒一筆新案、10 秒一筆補充；不足以防止大量建立匿名帳號，正式對外前需 CAPTCHA、配額與濫用監測。
- OSM 公共 tiles 只用於小量展示，遵守署名與快取政策，不做下載包／離線預抓；擴大流量應換合適供應商或 Google Maps。
- 這不是安全導航或政府受理系統；資料是使用者觀察。
