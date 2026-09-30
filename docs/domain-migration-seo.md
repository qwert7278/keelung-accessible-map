# 自訂網域 SEO 遷移清單

目前 canonical host 為 `https://keelung-accessible-map.vercel.app`。在正式 DNS 或自訂網域改動之前，先保留目前 Production host 持續服務。

1. 在 Vercel 專案加入新 domain，依 Vercel 提供的記錄值設定 DNS；若改用 Cloudflare，按 Vercel 建議設 DNS-only/Proxy 狀態並實際驗證憑證。
2. 驗證新網域 HTTPS、`www` 或 apex 選定方式、redirect loop 與 TXT/DNS ownership。
3. 在 Google Search Console 驗證新 domain property；Bing Webmaster 可稍後辦理。
4. 將 `VITE_PUBLIC_SITE_URL` 改為單一新 HTTPS origin；檢查 canonical、OG、JSON-LD、robots Sitemap URL、sitemap 全部同步。
5. 新網域保留首頁、`/how-to`、`/about`、`/privacy` 原 path。
6. 在 Vercel 對舊 Production host 設永久 308 redirect 到新 domain 的相同 path；不要只 redirect 首頁。
7. Preview 部署先驗證所有路由及 redirects，再以明確核准發布 Production。
8. 新 sitemap 部署後於 Search Console 提交；檢查首頁與三個內容頁的 user-declared / Google-selected canonical。
9. 至少持續監看 404、索引狀態、sitemap、曝光/點擊、重導與舊網域 backlinks；不要停用舊 host。

本清單不代表已購買網域或修改 DNS。網域、DNS、Search Console 均待使用者決定/帳號權限。
