# Cookie 與城市建議：第一階段

- 第一次進站提供「僅使用必要 Cookie」與「接受地區偏好」，兩個選項同等可見，可在頁底重新設定。
- 只有同意地區偏好後才呼叫同站 `/api/location`，使用既有 Vercel 的粗略縣市資訊；不建立外部 IP 查詢服務，不保存原始 IP、不取得 GPS。
- 分享網址指定的城市／行政區／案件、已保存的地區及當頁手動選擇優先。無法推估時保留基隆仁愛區與完整手動選擇。
- IP 推估只到縣市；行政區沿用該縣市預設瀏覽起點，不能當成訪客的實際行政區。VPN、行動網路與海外來源可能無法正確推估。
- Cookie 選擇保存 180 天。拒絕時移除地區偏好；拒絕不影響公開地圖、手動選區或回報功能。
- `/api/location` 未同意回 403；同意後只回城市代碼，禁止共享快取且不納入索引。
- 隱私頁同步說明必要連線／安全紀錄與應用程式不保存 IP 的差別。

## 第二階段（尚未啟用）

縣市使用統計沿用既有 Supabase，規劃只保存日期、縣市、次數的每日彙總，不保存原始 IP 或訪客識別碼。統計需要獨立的選擇與伺服器限流、寫入授權測試；這次沒有建立或套用資料庫 migration，也沒有開始收集使用統計。彙總次數表示使用次數，不能宣稱是獨立使用者人數。

## 驗證

本地透過伺服器專用 `ROADTAG_QA_GEO_REGION=TPE` 驗證同意後切至臺北中山區、拒絕時維持基隆、手動高雄與基隆分享連結的優先順序。此 QA 環境變數不被正式端點或前端 bundle 使用。另跑 lint、Vitest、TypeScript/build、SEO check；不寫入正式通報或照片。

參考：[Vercel request headers](https://vercel.com/docs/headers/request-headers)、[Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)。
