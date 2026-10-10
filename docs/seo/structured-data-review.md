# Structured Data Final Review — 2026-10-10

|頁面|現有 JSON-LD 類型|Schema Markup Validator|Google Rich Results Test|
|---|---|---|---|
|/|Organization、WebSite、WebPage、BreadcrumbList、FAQPage|PASS：0錯誤、0警告|PASS：1個有效Breadcrumb|
|/map|WebSite、WebPage、BreadcrumbList|PASS：0錯誤、0警告|PASS：1個有效Breadcrumb|
|/how-to|WebPage、BreadcrumbList（WebSite外部@id參照）|PASS：0錯誤、0警告|PASS：1個有效Breadcrumb|
|/about|AboutPage、BreadcrumbList（WebSite外部@id參照）|PASS：0錯誤、0警告|PASS：1個有效Breadcrumb|

所有測試使用公開的 roadtag.org URL，沒有上傳私人欄位、照片、credential或原始GSC查詢。
Schema Validator可能將外部的isPartOf參照顯示為CreativeWork；不代表網站新增了該類型。
JSON格式、@id/url/canonical、isPartOf、首頁publisher與可見FAQ內容一致。沒有需要改寫的JSON-LD欄位。
本輪把canonical、shared WebSite、publisher、breadcrumb順序與引用檢查直接補入既有scripts/seo-check.mjs；不建立另一套SEO系統。
Production可索引、Preview noindex、admin noindex與現有JSON-LD沒有衝突。

## Google 測試證據
- [首頁](https://search.google.com/test/rich-results/result?id=NCiH_bpdXZh0Ghwar7yl1A)
- [地圖](https://search.google.com/test/rich-results/result?id=KtzaqAYYkuOU_4Igi9odTw)
- [關於](https://search.google.com/test/rich-results/result?id=lY49xui48x3UKHEjOwqwFg)
- [教學](https://search.google.com/test/rich-results/result?id=hmQHHT9rj9ljDssnTZ3aWQ)
- [Schema Validator](https://validator.schema.org/)：四頁逐一公開URL測試，全部無錯誤/警告。
結果連結可能不是永久保存；這份紀錄保留本次日期和結果。

## 立即必要／未來可做
- 立即必要：修復CSV無效量級範圍與非有限值；補既有SEO graph回歸檢查。無需新增Schema。
- /how-to有實際步驟，可在內容穩定且每一步與網站操作一致後考慮HowTo語意；本輪不新增，不以Rich Results為目標。
- 未來案件頁的WebPage/ImageObject/Place/GeoCoordinates：只有真實公開、可索引、經隱私評估的案件才考慮；只描述公共障礙位置，不加入回報者位置/UUID/私人欄位，不自動全量索引。
- 首頁/how-to/about的WebPage可以日後補breadcrumb引用，屬非必要關聯改善。map的WebSite未重複publisher也非Schema錯誤。
- 尚有既有about正文的服務範圍/合作說明與首頁用語不同，屬後續公開內容一致性審查；本輪Schema沒有引用該矛盾說明，不為此擴大文案修改。

Google官方已在2026-05停止FAQ rich result並於6月移除相關文件：[Search更新](https://developers.google.com/search/updates)。How-to rich results早已停用：[官方說明](https://developers.google.com/search/blog/2023/08/howto-faq-changes)。
保留與可見內容一致的FAQPage語意，不宣稱一定取得Rich Results。
