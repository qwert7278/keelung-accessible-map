# SEO QA 紀錄

## 2026-10-01 Beta V2.1 local build

- `npm run build`：通過，metadata、safe routes、robots、sitemap 與 1200×630 OG image 檢查通過。
- Magic Link 與 share URL 使用 canonical Production URL，避免分享 localhost / Preview host。
- 本輪未變更 SEO 頁面、canonical、索引控制或 Production deployment。
- Commit `1023b92` 已推送；Vercel Preview READY：`https://keelung-accessible-h4b0eajh0-masons-projects-2c78a251.vercel.app/`。
- 以 Vercel authenticated fetch 驗證首頁 HTTP 200，raw HTML 有 Production canonical、OG/Twitter、WebSite JSON-LD 及 `robots=noindex`；response 含 `X-Robots-Tag: noindex`。
- 瀏覽器直接進 Preview 會轉到 Vercel Login（Deployment Protection）。未變更保護設定，因此這輪沒有宣稱已通過部署後的互動流程或行動版 screenshot QA；本機 Demo Admin 流程已互動驗收。
- Production deployment 未變更，亦未 promotion。

## 本地驗證（2026-09-30）

- `npm run lint`：通過（修正一個未使用 import 後重跑）。
- `npm test`：16 tests / 4 files 通過。
- `npm run build`：TypeScript、Vite build、生成 SEO 頁面和 `seo-check` 通過。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- OG PNG 為 1200×630，並已人工檢視繁體中文字、可讀性與示意地圖；未使用 AI art、政府標誌或虛構政府/安全背書。
- robots 與 sitemap 的 build output 由 `scripts/seo-check.mjs` 驗證；canonical 全部指向 Production alias。

## Preview / Production 尚待部署驗收

SEO Preview deployment：`https://keelung-accessible-jyp7fy380-masons-projects-2c78a251.vercel.app/`，commit `a90f860`，Vercel 狀態 READY；Production 未變更。GitHub Actions Quality run 9 通過：[run 36713630610](https://github.com/qwert7278/keelung-accessible-map/actions/runs/36713630610)。

已完成 Preview 首頁 fetch：HTTP 200 / `text/html`；raw HTML 有 Production canonical、OG/Twitter、WebSite JSON-LD 及 `robots=noindex`，response 有 `X-Robots-Tag: noindex`。該 header 可能同時由 Vercel Deployment Protection 產生。Vercel fetch/browser 對其他路徑會被保護層導回 SSO，所以下表標「受保護，待有登入狀態驗收」，不能把 302 當作頁面本身失敗，也不能宣稱路徑驗收通過。

本機 Vite preview 直接讀取生成的 `/how-to/index.html`、`/about/index.html`、`/privacy/index.html` 均為 200 / `text/html`；robots 為 200 / `text/plain`、sitemap 為 200 / `text/xml`、OG image 為 200 / `image/png`，favicon 為 200 / `image/svg+xml`。Vercel clean paths 及 HTTP 404 仍以部署後驗收為準。

| URL / 流程 | 預期 | 結果 |
| --- | --- | --- |
| `/` | 200，HTML metadata / WebSite JSON-LD | Preview pass；canonical 指 Production；Preview noindex pass |
| `/how-to`, `/about`, `/privacy` | 200，`text/html`、各自 H1/canonical | 本機輸出 pass；Vercel route 受保護層阻擋驗收 |
| `/robots.txt` | 200，`text/plain`，Sitemap 指向 Production | 本機輸出 pass；Vercel route 受保護層阻擋驗收 |
| `/sitemap.xml` | 200，XML，恰好 4 個 public URL | Build/本機輸出 pass；Vercel route 受保護層阻擋驗收 |
| `/og-image.png` | 200，PNG 1200×630 | 本機 pass；部署路徑受保護層阻擋驗收 |
| `/admin` | SPA 正常載入，X-Robots-Tag noindex | Vercel rewrite/header config 與 SEO check pass；部署路徑受保護層阻擋驗收 |
| 隨機不存在路由 | 真正 404，不回首頁 shell | Vercel catch-all 已移除、404.html 存在；HTTP 狀態受保護層阻擋驗收 |
| Preview 首頁和資訊頁 | Deployment Protection + robots noindex，canonical 無 Preview host | 首頁 pass；Preview build 對資訊頁 noindex 由 CI/build check pass，部署路徑受保護層阻擋驗收 |
| `/?report=<uuid>` | canonical `/`，不在 sitemap | build/source pass；瀏覽器待 Preview |
| 手機/桌機、社群分享擷取 | link/meta/OG 圖和版面正確 | 待 Preview browser |
| Lighthouse / Rich Results / Schema validator | 無 critical regression | external tools / Search Console 待 owner |

Search Console 未接入。Production 不在本次發布範圍內。
