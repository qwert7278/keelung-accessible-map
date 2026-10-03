# 自訂網域 SEO 遷移清單

目前 canonical host 為 `https://roadtag.org`。GitHub main → 既有 Vercel 是唯一發布來源；Vercel alias 僅作部署技術網址。

2026-10-03 現況：正式站已使用 roadtag.org。本清單保留作後續網域設定核對，並非重新建立網站或聲稱所有外部帳號設定已完成。

Cloudflare DNS-only 與 Proxy 分開決定：DNS-only 由 Vercel 提供 HTTPS，不能視為已啟用 Cloudflare HTTP／WAF 保護。Vercel 官方不建議在前方堆疊反向代理，原因包括流量可見性與快取問題；若使用者仍需要 Proxy，遷移時單獨評估相容性、來源憑證與 Full (strict)，驗證後再啟用。來源：[Vercel 與 Cloudflare](https://vercel.com/kb/guide/cloudflare-with-vercel)、[Cloudflare Proxy status](https://developers.cloudflare.com/dns/proxy-status/)、[Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)。

1. 在 Vercel 專案加入新 domain，依 Vercel 提供的記錄值設定 DNS；若改用 Cloudflare，按 Vercel 建議設 DNS-only/Proxy 狀態並實際驗證憑證。
2. 驗證新網域 HTTPS、`www` 或 apex 選定方式、redirect loop 與 TXT/DNS ownership。
3. 在 Google Search Console 驗證新 domain property；Bing Webmaster 可稍後辦理。
4. 將 `VITE_PUBLIC_SITE_URL` 改為單一新 HTTPS origin；檢查 canonical、OG、JSON-LD、robots Sitemap URL、sitemap 全部同步。
5. 新網域保留當次已發布的首頁、`/map`（如已發布）、`/admin`、`/how-to`、`/about`、`/privacy`、`/terms`，以及案件分享 query；不要只驗證首頁。
6. 在 Vercel 對舊 Production host 設永久 308 redirect 到新 domain 的相同 path；不要只 redirect 首頁。
7. Preview 部署先驗證所有路由及 redirects，再以明確核准發布 Production。
8. 新 sitemap 部署後於 Search Console 提交；檢查首頁與三個內容頁的 user-declared / Google-selected canonical。
9. 至少持續監看 404、索引狀態、sitemap、曝光/點擊、重導與舊網域 backlinks；不要停用舊 host。
10. 更新 Supabase Auth Site URL／redirect allowlist，驗證新網域 `/admin` magic link；不要修改 Database／RLS／Storage 來配合網域切換。保留必要本地 QA allowlist。
11. 搜尋主 repo 中舊 hostname，修正仍指舊網域的內部連結；確認硬編碼 policy link、Auth redirect 與 SEO 產物均已處理。DNS 記錄值以實際 Vercel 專案當時回傳為準，勿照抄舊 IP。

正式站與 canonical 已使用 roadtag.org；Search Console 與 Auth 後台設定需依實際帳號另行核對，不以文件替代實測。
