# 維護 Review 與站點核對 — 2026-10-02

本次維護：專案 memo／skill／Codex 記憶、站點核對、本地預覽、封存後的失效連結修正。沒有改 DNS、部署、Supabase 或合併兩站。既有未提交產品內容保留。

## 版本與網址

| 環境 | 已核對狀態 |
| --- | --- |
| GitHub main | `0cf67f059ba3f7b9238ab7036b4b8b9eb484b7ec`，API 回讀 |
| Vercel Production | 同 SHA，READY，deployment `dpl_8B8Kgp1K25PSJE8HwS8ggYFw3UwT` |
| 正式 `/` | https://keelung-accessible-map.vercel.app/ ，HTTP 200，現行 React 地圖入口，HTTPS／HSTS 正常 |
| 正式 `/privacy`、`/terms` | HTTP 200，但仍含封存 Sites 連結，尚待本地核准後發布修正 |
| ChatGPT Sites | 已封存，未登入 HTTP 401；不是正式網站 |
| 本地 | 從本主 repo 啟動的 Vite dev server，http://127.0.0.1:5174/ |
| 本地 `/map`、`/admin`、`/privacy`、`/terms` | HTTP 200；指定 routes／entry 核對完成 |

本地含未提交的新首頁與 `/map` 入口，和目前 GitHub main／正式站不同。此次未替使用者批准這些產品改動，也未推送。5173 已有服務，沒有停止或冒認其來源；本次可確定的服務在 5174。

## Findings

### [P1] 封存 Sites 後政策頁的首頁連結失效

正式與本地 `seo-pages/privacy.html`、`seo-pages/terms.html` 的品牌／回首頁連結指向舊 Sites，該站現在拒絕公開存取。已在本地把這四個連結改成 `/`，使其留在本站，並驗證本地兩頁不再包含舊 Sites hostname。只改連結，未改文案、版面或其他功能。Production 尚未部署此修正。

### [P2] 網域遷移不能只換 DNS 或環境變數

本地 `index.html` 的 policy links 與預設 hostname 等仍含現行正式網址。未來切換需搜尋舊 hostname、核對 `VITE_PUBLIC_SITE_URL`、SEO 產物、舊網址 path/query 轉址及 Supabase Auth redirect allowlist。此次只補遷移清單，尚不更換網域。

### [P2] 發布前仍須精確整理工作樹

目前在 `codex/homepage-map-markers`，HEAD 等於 GitHub main，但本地 main ref 落後；工作樹含其他未提交／未追蹤內容。發布時不得整批 stage、reset 或把這些變更自動當成已批准；按單一發布流程精確審查該次 commit。Quality CI 與 Vercel Production 完成需各自核對。

## 驗證與限制

- `npm run lint` 通過。
- `npm test` 通過：4 個測試檔、16 項測試。
- 本次重查 build／SEO 已通過；之前 review 的五項失敗屬較早工作樹狀態，不再作當前失敗結論。
- 四個政策頁連結改完後再次 build／SEO 通過；首頁、地圖、管理、隱私與條款五個本地 routes smoke 通過，政策頁不再含封存 Sites hostname。
- 專案 skill `quick_validate.py` 通過；Memo／skill 的相對文件連結驗證通過。
- 正式站、本地地圖與首頁已送出 `open_in_codex` 開啟請求；工具回覆 queued，頁面將在該 chat 顯示時開啟。Vite dev server 維持運行於 5174。
- HTTP smoke 是唯讀；沒有操作真實回報、照片上傳、管理狀態或 Auth 郵件；未宣稱完成桌面／手機互動驗收。

固定規則維護在 [PROJECT_MEMO.md](PROJECT_MEMO.md)，詳盡發布操作維護在 [single-release-workflow.md](single-release-workflow.md)；本文件只保留當次 review 證據，避免把歷史快照當永久規則。

## 本地圖片修正（同日後續）

- 原因：首頁引用 `images/...`，素材卻多放一層在 `public/images/images/...`。已移至 `public/images/...`，保留原有圖像與版面；瀏覽器捲動後確認首頁 7 張圖均成功解碼，含四張情境圖與 footer 品牌圖。
- 首頁橫幅改用 WebP：原 PNG 1,127,671 bytes，WebP 54,178 bytes，減少約 95.2%；原始 PNG 保留。重製指令：`python scripts/optimize-homepage-images.py`（需 Pillow）。其餘首頁圖片已是 WebP，沿用延遲載入。
- footer 的條款／隱私連結改為 `/terms`、`/privacy`，本地測試留在本地網站。
- 通報照片壓縮維持最長邊 1920px、品質 0.8、canvas 重新繪製移除原始 EXIF；改為優先 WebP，瀏覽器不支援時退回 JPEG。Supabase Storage 上傳副檔名與 Content-Type 依實際 blob 格式一致設定，避免 WebP 被當成 JPG。既有 migration 已允許 WebP，未更動資料庫。
- 建置增加首頁圖片存在與 WebP 檔頭檢查，避免缺圖仍通過建置。`npm run lint`、19 項測試、`npm run build`／SEO 與 `git diff --check` 通過；編碼 fallback／失敗釋放資源納入測試。
- 桌機照片與 footer 視覺驗證通過，證據保存在忽略的 `output/local-photos-fixed-desktop.png` 與 `output/local-footer-fixed-desktop.png`。圖片 URL 均 HTTP 200／image/webp。窄螢幕確認圖片解碼、footer 高度與無水平溢出；override 受現有縮放影響，實際 CSS viewport 與設定值不同，且窄版 footer 截圖出現空白，故不視為手機視覺驗收完成。
- 沒有推送 GitHub、部署 Vercel、修改 Production 資料或執行真實照片上傳；上傳程式的驗證是本地測試，並非線上端到端驗收。

## WebP 與媒體速度要求（使用者確認本地後）

使用者要求新照片全部 WebP，後續已取消 JPEG fallback；目標 300 KiB、硬上限 1 MiB、最長邊 1920px、保留直橫比例與路況細節。案件詳細照片增加 lazy／async，地圖品牌圖改 WebP。Lint、23 項測試及 build／SEO 通過；真實瀏覽器 PNG 1,127,671 → WebP 52,284 bytes，尚未真實上傳 Production。正式 Storage gate、縮圖／分頁、Vercel／Supabase 分工與影片前期方案記錄在 [媒體效能計畫](media-performance.md)，固定規則與使用者要求已寫入專案 memo 與 Codex 記憶 note。未 push／部署／更動正式 bucket。

## 接新網域前的 Code Review（同日後續）

範圍：目前未提交工作樹的結構、建置、SEO、導航、圖片、資料查詢與 migration。GitHub API 重新核對 main 為 `0cf67f059ba3f7b9238ab7036b4b8b9eb484b7ec`，等於本地 HEAD；本地未提交內容仍未在 main。本次沒有重新核對 Vercel 部署，也沒有讀寫正式資料庫驗證 RLS。

### 必要小修：已在本地完成

1. **[P1] .env 網域設定未被 SEO 腳本讀取**：`scripts/build-seo.mjs:9` 與 `scripts/seo-check.mjs:6` 原本只讀 `process.env`；React／Vite 會讀 `.env.local` 與 `.env.production.local`。工程師以 env 檔設定新域名時，網站與 SEO 可能使用不同 origin。兩個腳本補上 Vite `loadEnv("production", ...)`，系統環境變數仍優先；check 使用與 build 相同的 URL origin。
2. **[P1] 舊 Sites 分流使自訂網域 SEO 檢查失敗**：真實測試網域建置發現首頁仍含寫死的舊 Vercel hostname，觸發既有 SEO gate。`index.html:1251` 移除已封存 Sites 的條件分流，地圖 URL 一律由目前 origin + `/map` 產生。canonical／分享用正式 origin 仍由建置設定控制。
3. **[P2] 說明／政策頁地圖連結指向首頁**：四頁的 10 個導覽／頁尾／CTA「地圖」連結由 `/` 改 `/map`，品牌與「回到首頁」保留 `/`。涉及 `seo-pages/about.html:17`、`how-to.html:24`、`privacy.html:17`、`terms.html:17`；未改文案、樣式或表單。SEO gate 增加此錯誤目標的回歸檢查。

### 後續門檻：此次不擴大修改

- **[P2] 正式上傳限制對齊**：`supabase/migrations/20260929073544_initial_accessible_map.sql:157` 仍是 JPG／PNG／WebP、10 MiB，前端已是 WebP／1 MiB。不能把前端門檻當不可繞過的後端限制；按媒體計畫準備向前 migration、隔離驗證與發布順序，保留舊檔。此 review 未執行 SQL 或聲稱正式 bucket 現況已改。
- **[P2] 超過 200 筆後的完整性**：`src/services/supabase.ts:230` 返回最近 200 筆，搜尋與分享案件選擇依賴此陣列；較舊案件可能無法經分享連結選中。現有小量資料不需要大改，但擴充前需分頁／視窗查詢與按 id 取得案件，不能只增加 limit。
- **[P2] 寫入失敗可能留下孤立照片**：`src/services/supabase.ts:256` 先傳圖再 INSERT；若 cooldown、驗證或網路導致資料寫入失敗，沒有照片清理流程。更新／管理寫入也有相同模式；先規劃定期孤立物件清理與失敗重試，不能為 cleanup 放寬一般訪客 DELETE／RLS。尚未證實正式站已有大量孤立檔案。
- **網域切換執行條件**：新 HTTPS origin、Vercel domain／舊域名 path/query 轉址、Supabase Auth Site URL／精確 `/admin` redirect allowlist 必須一起核對。網域尚未提供，不改 DNS／Auth。來源：[Vite env 規則](https://vite.dev/guide/env-and-mode)、[Supabase redirect 規則](https://supabase.com/docs/guides/auth/redirect-urls)。

### 保留的設計與驗證

- 保留 Vite／React、靜態首頁／SEO 頁、既有 component 與 repository 分層；沒有換框架、重做 UI、引入付費服務、增加影片功能或改資料結構。
- SEO 已有語言、canonical／OG／JSON-LD、robots、sitemap、OG 圖、Preview noindex 與 admin noindex response header 設定；`/map?report=` 共用 `/map` canonical，沒有把每個 query 加進 sitemap。這是程式／產物核對，並非 Search Console 索引驗證。
- Lint、23 項測試、完整 TypeScript／Vite build／SEO、`git diff --check` 通過。`npm audit --omit=dev --audit-level=high` 回報 0 vulnerabilities；不代表完整安全稽核。
- 以暫時 `.env.production.local` 指定保留測試域名 `https://road-recall-review.example`，實際建置 Preview；首頁、map、四政策／說明頁、robots、sitemap 的新域名／placeholder／noindex gate 全通過。測試檔已還原／移除，最後重新建置回既有正式 origin。
- 桌機瀏覽器 `/how-to` 讀回三個地圖連結皆 `/map`，品牌連結仍 `/`；窄版 DOM 相同、CSS viewport 600px／內容 581px，未水平溢出。窄版 screenshot 工具失敗，未宣稱真實手機完整視覺驗收。桌機證據：`output/code-review-how-to-desktop.png`。
- 沒有 push、commit、部署、改 DNS、寄送 Auth 郵件或對 Production 試寫；發布時仍須按單一發布流程審查整個未提交工作樹。
