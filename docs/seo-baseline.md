# 歷史基隆好行 SEO 基線（2026-09-30）

> 此文件保留當時觀察，不代表現行 Road Tag 狀態。現行六頁、roadtag.org 與 /map 政策見 seo-architecture.md；本輪驗證見 seo/final-seo-iphone-e2e-2026-10-03.md。

檢查日期：2026-09-30。Production：<https://keelung-accessible-map.vercel.app/>。此文件記錄部署前的實測與資料限制。

## Production 部署前實測

透過 Vercel deployment fetch 讀取首頁與 `/robots.txt`：兩者皆回 HTTP 200、`text/html`，且內容是 SPA 首頁；首頁原始 HTML 只有舊 description/title，沒有 canonical、Open Graph、Twitter metadata 或 JSON-LD。`/sitemap.xml` 的 Vercel fetch 未提供頁面內容，因此其目前回應類型標為待 Preview/Production HTTP 再驗證；原始 SEO 執行規格記錄它曾回首頁 HTML，視為已知風險而非本次新實測。

`/admin` 尚未在此基線中重新測 response header。Production 使用 Vercel 提供的 production alias；沒有已確認的自訂網域。

## 搜尋成效基線

Google Search Console 與 Bing Webmaster 權限未連入本工作階段，因此以下數值目前為「未知」，不可解讀為零：索引頁數、品牌/非品牌曝光、點擊、CTR、平均排名、Core Web Vitals、手動措施與安全問題。完成 Search Console 驗證後，記錄前 28 日可用資料與查詢/頁面匯出日期，再建立週期比較。

## 建置後預期索引範圍

- 可索引：`/`、`/how-to`、`/about`、`/privacy`。
- 不可索引：`/admin`（response header noindex）、Vercel Preview（受保護並由 preview build 加 robots noindex）、`/404.html`、未知路由。
- `/?report=<uuid>` 與其他 query state 共用首頁 canonical `/`，不進 sitemap。

## 發布後填寫

| 指標 | 基線/首筆資料 | 日期與來源 |
| --- | --- | --- |
| Sitemap 讀取及 URL 數 | 待 Preview/Production 驗證 |  |
| Search Console 已索引頁數 | 待帳號驗證 |  |
| 曝光、點擊、CTR、平均排名 | 待帳號驗證 |  |
| Core Web Vitals | 待 PageSpeed / CrUX 有資料 |  |
| 手動措施 / 安全問題 | 待帳號驗證 |  |
