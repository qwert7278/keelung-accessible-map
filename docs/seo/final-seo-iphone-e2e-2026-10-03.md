# Road Tag 最終 SEO／24MP／實機／E2E 驗證紀錄

日期：2026-10-03，Asia/Taipei。基線：本地 main／origin/main／遠端 main 均為 `68f8cff9bb7fe5bf34496c011615b471f76d9b3d`。保留既有未追蹤素材與使用者任務文件。

## Changed

- `src/utils/images.ts`：20,000,000 → 26,000,000 像素。10,000px 單邊、10 MiB 輸入、解碼前 header／解碼後 bitmap 檢查、1920px、WebP ≤1 MiB、bitmap.close 均保留。
- `src/utils/images.mobile.test.ts`：5712×4284 HEIC／HEIF 合成 header＋mock bitmap 通過；8064×6048 HEIC／HEIF／PNG 在 native／fallback decoder 呼叫前拒絕；單邊 guard 保留。
- `tests/image-privacy.html`：加入真正可解碼的 5712×4284 合成 PNG，桌面 Chromium 壓縮成 1920×1440 WebP；不把此測試稱為真 iPhone 24MP HEIC。
- `map.html`：地圖專用 description；同一頁僅留一個 WebPage，連接 BreadcrumbList。不改 canonical 或互動地圖架構。
- `scripts/seo-check.mjs`：檢查單一 WebPage、breadcrumb 參照、與首頁不同的 description。支援 metadata 屬性跨行格式。
- `docs/seo-architecture.md`：六個公開網址、首頁／地圖區分、分享 query 的 /map canonical。
- `docs/seo-baseline.md`、`docs/seo/release-verification-2026-10-03.md`：明確標為歷史快照，不重寫舊實測數字。
- `docs/seo/roadtag-launch-plan.md`：修正為 22 縣市／368 行政區均可回報。
- `docs/media-performance.md`：明確區分正式 20MP 基線、本輪本地 26MP 與待實機驗證。
- `docs/seo/roadtag-structured-data.json`：執行既有 export script，與實際 HTML 同步。

沒有修改 migration、RLS、Storage policy、正式資料、密鑰或新增服務。

## SEO

本輪正式 HTTP 回讀（目前正式版本仍是基線，尚未包含本輪本地 metadata 修改）：

| 路由 | HTTP | Canonical／索引控制 |
| --- | --- | --- |
| `/` | 200 | https://roadtag.org/ |
| `/map` | 200 | https://roadtag.org/map |
| `/how-to` | 200 | https://roadtag.org/how-to |
| `/about` | 200 | https://roadtag.org/about |
| `/privacy` | 200 | https://roadtag.org/privacy |
| `/terms` | 200 | https://roadtag.org/terms |
| `/robots.txt` | 200 | Allow /；Sitemap 指向 roadtag.org |
| `/sitemap.xml` | 200 | 六個 stable URLs；無 admin、query、Preview |
| `/admin` | 200 | X-Robots-Tag: noindex, nofollow, noarchive |
| `/seo-audit-not-found` | 404 | noindex, nofollow，非首頁 200 |
| `/map?city=TW-KEE&district=all` | 200 | canonical /map |

HTTP → HTTPS 301；www → apex 308；既有 Vercel production alias 為 200 並宣告 roadtag.org canonical。沒有更動網域設定。Preview build noindex 政策未變，公開 canonical 不指向 Preview；本輪未建立新的 Preview deployment。

Search Console owner session：Sitemap「成功」，已送出／上次讀取 2026-10-02，Google 探索 5 頁、0 影片；服務中的 XML 有六頁。未重複提交 Sitemap。

| URL | Google 索引狀態 | 上次檢索 | Crawl allowed／Fetch／Indexing allowed | User-declared canonical | Google-selected canonical |
| --- | --- | --- | --- | --- | --- |
| `/` | 已編入索引，網址在 Google | 2026-10-02 18:36:15，Googlebot 智慧型手機 | 是／成功／是 | https://roadtag.org/ | 受檢測網址，即 https://roadtag.org/ |
| `/map` | Google 無法辨識的網址，未編入索引 | 不適用，尚無紀錄 | 索引報告均為不適用；正式 HTTP 200、無 noindex，提交要求時 Google 線上檢查通過 | 索引報告不適用；正式 HTML 為 /map | 不適用 |
| `/how-to` | 已找到－目前尚未建立索引；由 sitemap 發現 | 不適用，尚無紀錄 | 索引報告均為不適用；正式 HTTP 200、無 noindex，提交要求時 Google 線上檢查通過 | 索引報告不適用；正式 HTML 為 /how-to | 不適用 |

`/map`、`/how-to` 各提出一次建立索引要求，兩者均已顯示「已要求建立索引／加入優先檢索佇列」。首頁已索引，未再提出。要求已受理不等於已收錄。

原始 HTTP 證據：`output/seo-live-audit-2026-10-03.json`。Search Console 原始 DOM：`output/final-seo-home-inspection.txt`、`final-seo-map-inspection.txt`、`final-seo-howto-inspection.txt`。索引要求證據：`output/final-map-index-requested.jpg`、`output/final-howto-index-requested.jpg`。

## iPhone 24MP

- 新上限：26,000,000；5712×4284 = 24,470,208，可通過 guard。
- 8064×6048 = 48,771,072，HEIC／HEIF／PNG 均解碼前拒絕；native 和 fallback decoder 未被呼叫。
- HEIC／HEIF 的 24MP unit fixtures 只改 header，解碼器為 mock；不假稱為實拍 24MP HEIC。
- 桌面 Chromium 實際處理 JPEG／PNG／WebP／HEIC／HEIF fixture、EXIF 旋轉、透明白底、無 EXIF／XMP／合成 GPS marker、WebP MIME、≤1 MiB 全通過。
- 真正可解碼的合成 24MP PNG → 1920×1440 WebP 通過。證據：`output/final-24mp-browser.jpg`。
- 原有 revision gate、錯誤恢復與壓縮期間禁止送出邏輯未改；回歸 unit suite 通過。本輪未重做真 iPhone 快速換圖 UI 實機驗證。

## Real Device

`iPhone Safari real-device verification: NOT COMPLETED`

使用者回答「not sure」，無法確認有可用 iPhone；沒有收到實拍照片／機型／iOS／Safari／Safari 截圖。24MP HEIC 實機成功與否、方向、凍結／crash／reload／耗時均未知。桌面 Chromium 與合成 PNG 不替代此項。

待機型與本輪 26MP 版本可用時：用無敏感內容的 24MP HEIC、JPEG、直式／橫式照片，檢查預覽方向、processing 狀態、不能誤送出、快速換圖、凍結／重載；記錄機型、iOS、Safari、尺寸、檔案大小、耗時與錯誤。只測選圖／壓縮，可停在送出前，不必建立正式假案件。實拍原圖不放 Git。

## E2E

`Production write E2E: NOT RUN — no explicit approval`

目前無已確認 staging／隔離 Supabase project。使用者沒有明確批准本輪在正式站建立 QA 案件；沒有新增正式 Auth 帳號、照片、案件或 timeline，也沒有清除／硬刪資料。

| 真整合鏈項目 | 本輪結果 |
| --- | --- |
| Anonymous Auth | 未跑新的成功寫入鏈 |
| Signed gate | 未跑真合法 session 的成功 reservation；既有測試覆蓋授權／簽章邊界 |
| Storage upload | NOT RUN |
| Report insert | NOT RUN |
| Feed／Share | 新 QA 案件 NOT RUN |
| Community update／operation retry | 真整合 NOT RUN；unit／隔離 SQL 通過 |
| Admin moderate／after photo | 真整合 NOT RUN；隔離 SQL 通過 |
| Cleanup 保留新 QA referenced photo | 真整合 NOT RUN；隔離 SQL cleanup race 通過 |

前一輪正式 worker HTTP 200、removed=0 為歷史紀錄；本輪未再次執行正式清理。不能以 mock／PGlite／本地 Demo 代替成功 Auth→Gate→Storage→Report E2E。

## Verification

- `npm test`：76/76，14 files；emitted Node.js city／upload／cron endpoint 檢查通過。
- `npm run test:db`：39/39；22 cities／368 districts、RLS negative、重試、權限、配額、cleanup race，全數合成資料 rollback。
- `npm run lint`：exit 0。
- `npm run build`：exit 0；HEIC lazy chunk 3.19 MB（gzip 792 KB）既有 warning 保留，無新增 dependency。
- `npm run seo:check`：exit 0。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- `git diff --check`：exit 0；僅正常 CRLF→LF 提示。
- 桌面 browser 照片回歸：ALL PASS，含真正合成 24MP PNG／48MP 預解碼拒絕。

## Release State

| 狀態 | 本輪 |
| --- | --- |
| local verified | YES |
| committed | NO |
| pushed | NO |
| Production frontend deployed | 本輪 NO；正式仍為 68f8cff，26MP 修改尚未上線 |
| Production backend deployed | 本輪未變更；既有 final_hardening／Edge v3 保持原狀 |
| Search Console checked | YES，三個重點 URL 與 Sitemap |
| iPhone real-device checked | NO |
| full write E2E checked | NO |

可執行的本地工作已完成，但尚不能稱為「全部收官」。Remaining：真 iPhone 24MP Safari 驗證、具授權且可清理的隔離成功寫入 E2E。
