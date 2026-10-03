# Road Tag 推出前修復與驗證

2026-10-03。對應 [初步 review](code-review-risks-2026-10-03.md) 五項問題。唯一網站發布路徑：GitHub main → 既有 Vercel → roadtag.org。

## 修復

1. 正式開放 22 縣市、368 行政區。採 [國土測繪中心界線](https://data.gov.tw/dataset/7441)，2025-03-18 版、政府資料開放授權條款第 1 版，包含瑪家鄉三和村附加界線。多邊形簡化 0.0001 度、校驗容差 0.0002 度（約 20 公尺）；不是導航安全保證。前端按縣市延遲載入，後端獨立驗證區域與座標。
2. Storage 新上傳限 WebP／1 MiB。由驗證登入者的 prepare-photo 取得固定路徑預約，Storage RLS 校驗所有權、有效預約、MIME／容量。每 UID 每小時 10 次、最多 4 個待完成預約、全站每日 2,000 次預約；交易鎖防配額競態。既有照片保留。
3. 行政區／狀態／通行程度／文字在後端先篩選；每批 200 筆，時間＋ID 游標追加，防同時間漏失／重複。列表每頁 5 筆，標示已載入數量與更多案件。
4. 表單從所選行政區開始。選點不一致時，改為縣市內實際行政區並要求再次確認；跨縣市或海外座標拒絕，後端再次驗證。
5. 同一表單草稿及照片重試沿用案件 ID／路徑；寫入回應遺失時，查詢本人既有結果。不是跨重新整理的離線草稿功能。

## 資料庫與上傳服務

正式 Supabase ifcicahnrpkwjcxmnmug 已套用 20261003093920–20261003094016 的十份向前 migration。大型界線分批匯入 private 表；新縣市先停用，最後交易才啟用全台及防護。新測試資料庫按順序執行全部 migration，勿重跑正式初始化。產生器固定已套用版本，未來地理更新須新增 migration。

prepare-photo v1 已部署。Gateway verify_jwt=false；函式內以 auth.getUser() 向 Auth 驗證 Bearer token，不是未登入開放上傳。service-role 只在 Edge 內從平台環境取得，前端與 Git 不含密鑰。未登入正式請求回傳 401。

預約 24 小時後，下一個合法上傳請求以 Storage API 清理最多 20 個逾期、未被案件／補充引用的檔案，再移除預約紀錄。先鎖定預約，防遲到案件引用；失敗留待重試。這是按使用量清理，不是定時工作，不處理更新前沒有預約的歷史孤立檔案。一般使用者沒有 Storage UPDATE／DELETE 權限。

## 驗證

- 49 項單元測試：22 縣市／368 區、篩選順序、游標、競態、重試冪等、Edge 驗證與清理邊界。
- 27 項隔離 PostgreSQL 檢查：執行全部 migration，逐一 INSERT 全部 368 區有效位置；越權、錯區、海外座標、非預約／超量／PNG 上傳、逾期與清理競態、管理者改善及 audit、配額。合成資料 rollback，正式 DB 不建立 QA 案件／照片／Auth 帳號。
- lint、TypeScript、Production build、SEO／sitemap／JSON-LD 檢查。
- 本地真實 modal 及照片壓縮：臺北中山区三步送出成功；七堵區起始位置、錯區改為仁愛區並要求確認；390×844 手機確認頁。
- 正式唯讀：22 enabled 縣市、368 邊界、原有 4 案件保留、1 MiB／WebP bucket；匿名及一般登入者不能清理或读 private 預約。

## 限制

未做完整滲透／壓力測試或無障礙認證；未用假資料在正式站試傳。補充仍有 100 筆上限；地圖僅顯示已載入案件，尚無 viewport 查詢與縮圖管線。全站配額不能取代 CAPTCHA／跨帳號機器人防護，輪換匿名帳號仍可能消耗全站配額。

Supabase Advisor 的 private 表「RLS 無 policy」是刻意禁止直接存取；匿名 policies 仍有所有權／is_admin gate，隔離越權測試通過。既有 Auth leaked password protection 提醒未在本次更動帳戶方案／驗證設定；正式管理者依 [Supabase 密碼保護](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) 另核對設定與方案。

網站 commit、PR、正式 Vercel READY／SHA 在發布後補記。
