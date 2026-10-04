# SEO 架構與索引政策

現行政策更新：2026-10-03。歷史基線另見 seo-baseline.md。

## Canonical host

`VITE_PUBLIC_SITE_URL` 是唯一公開站址來源，預設為 `https://roadtag.org`。Build 將其正規化為 HTTPS origin，注入首頁、資訊頁 canonical/分享 URL、robots Sitemap URL 與 sitemap；Vercel 部署 alias 僅作技術來源，不作公開 canonical。日後換自訂網域只改這個變數與 Vercel domain/redirect 設定，不讓 Preview hostname 成為 canonical。

## 路由及頁面

| Path | 類型 | 索引政策 | Canonical |
| --- | --- | --- | --- |
| `/` | 宣傳首頁與共用地圖 | index | Production `/` |
| `/map` | 互動地圖 SPA | index | Production `/map` |
| `/how-to` | 靜態使用指南 | index | Production `/how-to` |
| `/about` | 靜態計畫說明 | index | Production `/about` |
| `/privacy` | 靜態照片/位置/資料說明 | index | Production `/privacy` |
| `/terms` | 靜態使用條款 | index | Production `/terms` |
| `/admin` | SPA 管理頁 | `X-Robots-Tag: noindex, nofollow, noarchive` | 不列入 sitemap |
| Preview host | Vercel Preview | deployment protection + 全頁 robots noindex | canonical 仍指 Production |
| `/404.html` 與未知路由 | Not found | noindex / HTTP 404 | 不列入 sitemap |

`vercel.json` 將 `/map` 與 `/admin` rewrite 至 map.html，四個資訊頁 rewrite 至各自的靜態 HTML；未使用全站 catch-all，避免未知路徑都回首頁 200。部署後仍需以 HTTP 驗證 Vercel 對靜態目錄頁與未知 URL 的實際路由狀態。

## Crawler 與 sitemap

`public/robots.txt` 允許公開頁面並指向 Production sitemap，不以 `Disallow: /admin` 阻止 crawler 讀取 noindex header。Sitemap 只含六個穩定 public URL（/、/map、/how-to、/about、/privacy、/terms），不列 admin、Preview、報告 query 或篩選狀態。

## Metadata 與結構化資料

首頁 raw HTML 提供一組 title、description、canonical、OG、Twitter card 與 WebSite JSON-LD。四個靜態資訊頁各有唯一 title、description、canonical、OG、Twitter card 及可直接讀取的語意 HTML。Organization 未加入，因為尚無已確認公開營運單位；沒有 review/rating、政府合作或安全導航聲明。

社群圖為原生繪製 1200×630 示意圖，不使用假政府標誌，也不宣稱為正式測量地圖。PNG 可用 `python scripts/generate-og-image.py` 重繪；此設計工具需要本機 Pillow，正式 Vite build 不依賴 Python。

## 分享案件連結

案件分享使用 `/map?report=<uuid>&city=<id>&district=<name>` 等互動 query；canonical 固定為 `/map`，不加入 sitemap，不為大量重複 SPA shell 建立索引頁。若未來要讓個案獨立被搜尋，應先建立 `/reports/<id>` 的可爬內容、唯一 metadata、適當 moderation/privacy/removal 流程與資料輸出，再評估 prerender/SSR。

地圖只有一個 WebPage entity，透過 breadcrumb @id 連接 BreadcrumbList。首頁 FAQPage 對應可見問答；不承諾 Google FAQ 富搜尋結果。

## Preview / Production

Build 將 `VERCEL_ENV=preview` 時的 HTML 加上 robots noindex；Preview 同時須維持 Vercel Deployment Protection。CI SEO check 驗證 Preview noindex。Production 發布前要重新檢查 robots、sitemap、canonical、noindex header、回報 query、未知 URL、桌機與手機；Search Console 操作需已驗證站點的帳號擁有者進行。
