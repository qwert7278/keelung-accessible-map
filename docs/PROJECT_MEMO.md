# Road Tag／路見不平 專案備忘

更新：2026-10-03。僅適用此專案；永久規則與即時部署狀態分開記錄。

## 固定決策

- 唯一開發來源：本地主 repo `C:\Users\qwert\Desktop\Road Recall system`。
- 唯一正式版本：GitHub `qwert7278/keelung-accessible-map` 的 `main`；Vercel 是唯一網站發布端。
- 工作方式：本地修改 → lint／test／build 與預覽 → 使用者確認此次版本 → 明確推送 `main` → 核對正式部署 SHA／網址。不要擅自把 Preview 當正式發布。
- ChatGPT Sites 已封存為 owner-only，不再合併、編輯、同步或發布；保留歷史，不刪除。AI 編程工具可以換，主 repo 與發布入口不增加。
- Supabase 保留既有 Database／Auth／Storage；migration 與測試在同一 Git repo，Production 資料、照片與密鑰不放 Git。一般網站 push 不自動套用 migration。
- 保持小幅、可審查修改，沿用現有架構；不為簡單改動引入多餘框架、服務或第二份文件規則。保留其他人的未提交內容。

## 媒體與速度規則

- 新回報、補充、改善照片均在上傳前自動轉 WebP；PNG／JPG 可作輸入，直式／橫式保留比例、最長邊 1920px、不放大，重新繪製移除原始 EXIF。無 WebP 編碼能力時提示更新瀏覽器，不改存 JPEG／PNG。
- 壓縮目標 300 KiB，品質 0.8 → 0.7 → 0.6，保留較小輸出；目標不是保證，上傳硬上限 1 MiB。原檔上限 10 MiB。優先保留可判斷路況的細節，不能用「18 bytes」作照片容量要求。
- Vercel 提供網站；照片留 Supabase Storage／CDN，直接上傳，不納入 Git、不經 Vercel Functions 搬運大檔。頁面照片採延遲載入；大量資料增加前須做縮圖、分頁／地圖範圍查詢與流量驗證。
- 2026-10-03 正式 Storage bucket 已透過向前 migration 對齊 WebP／1 MiB，新增上傳預約與配額；舊照片不重寫或刪除。全台啟用與驗證紀錄見 [推出前修復](launch-fixes-2026-10-03.md)。
- 未來影片先規劃獨立媒體管線：直接／可續傳上傳、背景轉碼、WebP 預覽圖、點選才播放；不要把影片當 WebP 圖片，也不要新增付費服務或自動播放。詳細現況、發布門檻與擴充方案見 [媒體效能計畫](media-performance.md)。

## 正式網域與後續 DNS 計畫

正式網域已為 `https://roadtag.org`，由同一 Vercel 專案提供。Cloudflare DNS／代理狀態須另行核對，不把網域已上線解讀為代理已啟用；不另建 Cloudflare Pages 或第二個站。

DNS 託管與 HTTP 代理是不同設定：DNS-only 時 HTTPS 由 Vercel 提供，不能宣稱已啟用 Cloudflare WAF／HTTP 代理保護。若之後需要 Cloudflare proxy，需另核對 Vercel 相容性與功能限制，確認來源憑證後採 Full (strict)，驗證快取、Auth、回報及上傳。未選定網域與確認計畫前，不改 DNS／TLS。

網域切換同時處理 canonical／分享 URL／sitemap、舊網址永久轉址與 Supabase Auth Site URL／redirect allowlist。完整清單見 [網域遷移](domain-migration-seo.md)。

## 文件入口

- [收官修復與本地驗證](final-hardening-2026-10-03.md)：HEIC、重試、防濫用與排程；明確區分本地及正式狀態。
- [單一發布流程](single-release-workflow.md)：日常維護、GitHub、Supabase、封存狀態。
- [部署設定](deployment.md)：現有服務配置。
- [Review 與站點核對](maintenance-review-2026-10-02.md)：時間戳記、版本差異、測試及已知待辦。
- 專用 skill：`../.agents/skills/road-recall-site/SKILL.md`；只針對此專案，不套用其他網站。

正式網址目前為 https://roadtag.org/ 。commit／HTTP／本地 port 是會變動的觀察，開工時重新核對，不把此備忘當即時狀態。
