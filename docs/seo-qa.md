# SEO QA 紀錄

## 本地驗證（2026-09-30）

- `npm run lint`：通過（修正一個未使用 import 後重跑）。
- `npm test`：16 tests / 4 files 通過。
- `npm run build`：TypeScript、Vite build、生成 SEO 頁面和 `seo-check` 通過。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- OG PNG 為 1200×630，並已人工檢視繁體中文字、可讀性與示意地圖；未使用 AI art、政府標誌或虛構政府/安全背書。
- robots 與 sitemap 的 build output 由 `scripts/seo-check.mjs` 驗證；canonical 全部指向 Production alias。

## Preview / Production 尚待部署驗收

| URL / 流程 | 預期 | 結果 |
| --- | --- | --- |
| `/` | 200，HTML metadata / WebSite JSON-LD | 待 Preview deploy |
| `/how-to`, `/about`, `/privacy` | 200，`text/html`、各自 H1/canonical | 待 Preview deploy |
| `/robots.txt` | 200，`text/plain`，Sitemap 指向 Production | 待 Preview deploy |
| `/sitemap.xml` | 200，XML，恰好 4 個 public URL | 待 Preview deploy |
| `/og-image.png` | 200，PNG 1200×630 | 待 Preview deploy |
| `/admin` | SPA 正常載入，X-Robots-Tag noindex | 待 Preview deploy |
| 隨機不存在路由 | 真正 404，不回首頁 shell | 待 Preview deploy |
| Preview 首頁和資訊頁 | Deployment Protection + robots noindex，canonical 無 Preview host | 待 Preview deploy |
| `/?report=<uuid>` | canonical `/`，不在 sitemap | build/source pass；瀏覽器待 Preview |
| 手機/桌機、社群分享擷取 | link/meta/OG 圖和版面正確 | 待 Preview browser |
| Lighthouse / Rich Results / Schema validator | 無 critical regression | external tools / Search Console 待 owner |

Search Console 未接入。Production 不在本次發布範圍內。
