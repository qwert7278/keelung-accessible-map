# Road Recall 媒體效能計畫

核對日期：2026-10-03。最新發布見 [推出前修復](launch-fixes-2026-10-03.md)。僅此專案。規則入口為 [PROJECT_MEMO.md](PROJECT_MEMO.md)；本文記錄實作狀態、擴充順序與驗收條件。

## 目前架構與判斷

Vite／React 網站由 Vercel 部署；`src/services/supabase.ts` 用瀏覽器 XHR 直接上傳至 Supabase Storage，案件資料在 Postgres，圖片使用穩定 public URL。媒體不經 Vercel Functions，也不放 Git。圖片數量增加不會直接增加 Vercel 的媒體傳輸工作，但同頁下載量、Supabase 流量／容量、資料查詢與使用者網路仍可能造成變慢。

Supabase Storage 有 CDN，但冷快取仍須回源、快取不保證永久保留；不能因有 CDN 宣稱一定快或沒有流量成本。Vercel Functions 的 request／response payload 上限目前為 4.5 MB，未來影片維持直接上傳，不用 Function 轉送影片本體。

目前 city feed 每 15 秒依行政區／狀態／通行程度／文字先篩選，每批 200 筆，以 created_at／id 游標追加；列表每頁 5 筆，地圖顯示已載入案件。補充仍最多 100 筆，尚無補充分頁或 viewport 查詢。

## 本地已做

| 項目 | 行為 |
| --- | --- |
| 使用者照片輸入 | 本地收官修復加入 JPG／PNG／WebP／HEIC／HEIF，原檔最大 10 MiB、20MP，解碼前檢查尺寸；正式啟用狀態見 [收官驗證](final-hardening-2026-10-03.md)。影片仍未開放 |
| 自動轉檔 | WebP only；直橫式保持比例、最長邊 1920px、小圖不放大、移除原始 EXIF |
| 大小控制 | 目標 300 KiB，逐步使用品質 0.8／0.7／0.6；保留最小輸出，硬上限 1 MiB；無法達成時提示裁切重試，不無限降品質 |
| 格式對齊 | 新 Storage path 為 UUID.webp、Content-Type image/webp；Repository 上傳前再驗 MIME／大小 |
| 相容性 | 不支援 WebP 編碼時停止並提示更新瀏覽器；不能把 PNG 改副檔名當 WebP |
| 載入 | 案件前後照片與更新照片增加 lazy／async；既有列表／首頁延遲載入保留 |
| 快取 | 新照片唯一 UUID、不覆寫，設定一小時 cache-control；仍須正式上傳後核對 CDN／瀏覽器 response headers |
| 固定素材 | 首頁七張內容圖皆 WebP；地圖品牌圖 PNG 39,329 bytes → WebP 11,804 bytes |

分享用 OG PNG、SVG 圖示與第三方 OSM PNG 圖磚不屬於回報照片轉檔範圍；不改第三方底圖格式。舊回報 PNG／JPG 可繼續顯示；此次沒有掃描、重新壓縮或改寫 Production 舊照片。

`300 KiB` 是 307,200 bytes，`1 MiB` 是 1,048,576 bytes；18 bytes 無法承載可辨識的路況照片。格式轉换不等於固定大小，更不等於所有場景的頁面速度保證。

## 2026-10-02 歷史發布門檻（由 10-03 修復紀錄取代）

1. 精確審查本次變更、lint／test／build；使用真實橫式 JPG／PNG、直式照片、接近 10 MiB 原檔在桌機與手機確認方向、內容可辨識、壓縮耗時及失敗提示。現在有 mock 的直式／比例測試，不能當所有手機實測。
2. 既有 migration 的 bucket 仍允許 JPG／PNG／WebP 與 10 MiB。新增向前 migration 將新上傳限為 image/webp／1 MiB，並限制 INSERT 的 .webp 副檔名；保留既有 RLS 所有權與管理者判斷，不修改 SELECT、不刪舊檔。先在隔離資料庫驗正向／負向授權與超限拒絕，再按批准計畫套用。CLI 未安裝，本次未建立或執行 migration，不手造已驗證 migration。
3. 前端不是不可繞過的安全邊界；如需保證任何 API 客戶端只能存真正 WebP，後端須驗檔案內容／解碼，不只 MIME／副檔名。可用隔離暫存＋驗證後發布；需另作架構與成本審查，不能把目前前端門檻當後端內容驗證。
4. 新版前端發布並確認 READY 後才收緊正式 bucket，避免仍使用 JPEG 的舊客戶端突然失敗；安排提示重新整理、驗收與回滾。不可因網站 push 自動重跑初始化 migration。
5. 隔離 QA 真實上傳後回讀格式、bytes、URL、cache headers；在一般訪客、回報者、管理者權限驗證 before／updates／after。此次未對正式 Storage 試傳。

## 大量圖片的下一階段

- 列表使用 480–640px WebP 縮圖，建議目標 30–80 KiB；案件詳細才取較大版本。不要讓 200 張列表照片一次下載完整 1920px 圖。現階段尚未建立縮圖管線。
- 可選在上傳時產生兩個尺寸，或使用 Supabase Image Transformations。官方目前後者需 Pro 或以上，可能另計用量；未核對此帳戶方案、不自動啟用／升級付費服務。
- 以地圖範圍／游標分頁查詢資料，手機首屏只載必要案件；長列表必要時才加入虛擬化。評估索引與 EXPLAIN，避免不必要框架。
- 本專案初步驗收目標：行動網路下 p75 LCP ≤2.5 秒、INP ≤200ms、CLS ≤0.1；另記錄案件查詢延遲、首屏圖片 bytes、Storage upload failure／CDN HIT／egress。這些是目標，尚無正式使用者量測或壓力測試。
- 以 10,000 張 ×300 KiB 估算約 2.86 GiB 儲存；20 張完整照片約 5.86 MiB，改 40 KiB 縮圖則約 0.78 MiB。每月 100,000 次瀏覽 ×10 張 ×300 KiB 約 286 GiB 媒體傳輸，尚未加重試／影片。快取仍可能計流量，實際費用按帳戶當時方案與用量核對。

## 影片候選方案（未實作）

- 首版候選：最長 30 秒、720p、輸出目標 ≤10 MiB；需依真實路況辨識與手機測試再定。影片使用 MP4 等影片格式，WebP 只作 poster／縮圖。
- 媒體上傳獨立 bucket／資料紀錄與配額，不提高照片 bucket 限制來兼收影片；保留案件所有權、RLS、審核、刪除／失敗清理流程。
- 影片直接傳 Storage，大檔與不穩定網路採 TUS 可續傳；Supabase 官方建議超過 6 MB 或需可靠續傳時採此方案。
- 背景工作產生壓縮影片、poster、必要時多碼率 HLS；轉碼完成前顯示處理狀態。不要在 Vercel 的網頁 request 內同步跑重型轉碼。
- 列表只顯示 WebP poster，點選才播放、預設 preload=none，不自動下載／播放全部影片。影片多時先評估播放用量、轉碼費與 CDN，付費影音服務由使用者決定。

## 本次驗證與限制

- Lint、23 項測試、TypeScript／Vite build／SEO 通過。新增測試涵蓋 strict WebP、直式與小圖比例、目標／硬上限、品質調整、失敗釋放 bitmap。
- 真實瀏覽器把 1,127,671 bytes PNG 轉成 52,284 bytes WebP，1916×821、約 345ms；此單一樣本不是所有照片大小或裝置效能保證。證據：`output/webp-compression-verified.png`。
- GitHub 未 push、Vercel 未部署、正式 Supabase 未寫入；未執行壓測、未核對即時方案／容量／egress。優先階段為發布前 Storage 門檻，再以實際用量決定縮圖／分頁與影片管線。

## 官方依據

- [Vercel Functions 限制](https://vercel.com/docs/functions/limitations)
- [Supabase Storage CDN](https://supabase.com/docs/guides/storage/cdn/fundamentals)
- [Supabase Storage bucket 限制](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase 影像轉換與方案](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase TUS 可續傳上傳](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
