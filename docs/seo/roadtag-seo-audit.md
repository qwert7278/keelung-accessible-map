# SEO Audit — 2026-10-10

基準 origin/main be7126f62366509c7709ccc0a5e78483937827ed；本分支無網站runtime變更。

|項目|結果|
|---|---|
|公開頁|實際GET /、/map、/how-to、/about、/privacy、/terms均200，canonical為正確roadtag.org路徑|
|Metadata|六頁title/description存在且具獨特說明；沿用既有OG/JSON-LD|
|H1|首頁與4個說明頁初始HTML各1；/map為React shell，初始HTML無H1，渲染抓取待URL Inspection|
|結構化資料|既有Organization/WebSite/WebPage/Breadcrumb/FAQ；seo-check驗證可見FAQ一致性|
|內鏈|seo-check驗證教學/關於地圖連結指向/map，首頁教學與Closed Alpha限制保留|
|Sitemap/robots|6個公開頁，無admin、案件query或Preview；沿用public/sitemap.xml、robots.txt|
|Admin|vercel.json保留/admin与子路徑X-Robots-Tag noindex|
|Preview|build-seo加noindex/nofollow/noarchive，本輪獨立檢查|
|GSC|siteRestrictedUser，唯讀query/sitemaps成功|
|Sitemap提交|2026-10-02提交、2026-10-07下載；pending=false，errors=0，warnings=0，submitted=6|
|索引|sitemaps API indexed欄位不能當作可靠即時索引數；URL Inspection/網頁報表待核對|

目前未證實canonical、metadata、sitemap或內鏈bug。搜尋量少屬成長問題；/map初始HTML少先補抓取證據，不能據此重做SSR或MCP。
不批量建行政區頁、不宣稱官方派案或保證道路通行。


## 索引核對補充
URL Inspection API實測：/、/map、/how-to verdict PASS，已提交並建立索引，Google canonical MATCH。
/about、/privacy、/terms：NEUTRAL，已找到但尚未索引；不是全站索引故障，也不是sitemap未提交。
/map已索引，不因初始HTML無H1啟動重構；渲染內容細節如需改善再單獨審查。
Production唯讀核對：dpl_GMv6hsRfKVEVtyBiQD7m3YTXzd5h READY、SHA be7126f62366509c7709ccc0a5e78483937827ed。
PR #14 已MERGED，本分支從最新main隔離建立，原dirty tree未變。
