# Road Tag 歷史發布驗證：2026-10-03（SEO／教學版本）

> 下文為當日較早版本的驗證快照，非最新 main／收錄狀態。後續正式修復見 ../final-hardening-2026-10-03.md；本輪收官狀態見 final-seo-iphone-e2e-2026-10-03.md。

既有正式版本 `d89d7b3c464878f80e7445f5bdf2aea531ba908c` 已回讀 Vercel Production READY。此次 PR 接續此版本，補上正式網域預設值、圖解教學、CIS 文件與 SEO JSON 交付；不改 DNS、Supabase schema、資料庫資料或帳號。

正式網域 https://roadtag.org 已在 Vercel alias，公開首頁 canonical 與 JSON-LD 為此網域。Source fallback 與 `.env.example` 同步，避免未設定環境變數的建置又指向舊 hostname。

本地 lint、27 項測試、build、SEO 檢查與 production dependency audit 通過（0 vulnerabilities）。SEO 檢查新增逐頁 JSON 語法、頁面 entity、BreadcrumbList 與未解析 URL 占位字驗證。

實際 UI：九步教學前進至第九步，確認送出按鈕取得 `roadtag-guide-flash`、1.4 秒動畫。照片完成本機 WebP 處理。驗證表單已關閉，未送出正式測試案件。減少動態效果 CSS 將動畫停用，保留靜態標示；教學可隨時結束。

桌面清單與照片、正式首頁同步清單正常；390 × 844 CSS 像素手機沒有橫向溢出，縣市／行政區選單高 44px，四張真實照片均載入。清單每頁容量五筆；目前只有四筆真實回報，因此不補造第五筆。

Search Console 擁有者登入回讀 `sc-domain:roadtag.org`，Sitemap 成功，Google 探索到五個網頁。Google 後續索引狀態仍待處理，沒有將提交成功等同收錄成功。CLI 憑證尚未取得此資源權限。

證據：`output/playwright/roadtag-release-desktop.png`、`roadtag-release-mobile.png`、`roadtag-search-console-sitemap.png`。

發布完成後，以 PR 合併 SHA 與 Vercel Production 的 `githubCommitSha` 一致作為驗收；部署追蹤可見 PR 與 Vercel 記錄。完整無障礙認證與 GA4／Keyword Planner 為後續工作，未宣稱已取得認證或已接追蹤。
