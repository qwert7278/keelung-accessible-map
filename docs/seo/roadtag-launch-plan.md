# 路見不平 Road Tag：搜尋與使用者成長交付

更新：2026-10-03。正式網域：https://roadtag.org；已核對 Vercel Production alias 與公開 canonical。

## 本次交付

- 六個可索引網址：首頁、地圖、如何使用、關於、隱私權、使用條款。各頁有 title、description、canonical、Open Graph、WebPage 或 AboutPage 與 BreadcrumbList。
- 首頁 WebSite 與可見四題 FAQ 對應 JSON-LD。FAQPage 保留語意資料；Google 已於 2026 年停用 FAQ 搜尋複合式結果，不能以此承諾搜尋展開效果。
- `roadtag-structured-data.json` 是從實際 HTML 匯出的資料包，可用 `node scripts/export-roadtag-schema.mjs` 更新。
- Sitemap：https://roadtag.org/sitemap.xml；robots.txt 指向此 Sitemap。管理頁維持 noindex，Preview 維持 noindex。
- 首頁與完整地圖共用真實資料來源。正式建置強制停用 Demo；移除八筆舊本機示範資料，保留使用者本機自行建立的紀錄。未刪除 Supabase 真實資料、照片或帳號。
- 22 縣市、368 行政區可瀏覽；正式回報目前從基隆開始。其他縣市是瀏覽功能，避免將尚未開放的回報誤導成可使用。

## Search Console 提交

2026-10-03 瀏覽器實際回讀 `sc-domain:roadtag.org`：`https://roadtag.org/sitemap.xml` 狀態「成功」，提交與上次讀取日期 2026-10-02，探索到 5 個網頁、0 個影片。已有成功提交，不重複提交。CLI 憑證目前僅有其他兩個網站的權限；此次驗證使用現有擁有者登入的 Search Console。網站 Sitemap 自身列出六個 canonical 網址；Google 已探索數量與 XML 總數可能尚不同。

證據：`output/playwright/roadtag-search-console-sitemap.png`。
提交 Sitemap 不等於保證收錄；驗證後優先檢查首頁、地圖與如何使用的 URL 狀態，並觀察抓取與搜尋曝光。

## 第二階段：量測與推廣

先取得 GA4 Measurement ID 與同意／隱私設定，再串接。建議量測 tutorial_start、tutorial_complete、report_start、photo_ready、report_submit_success 與 city_change；不傳送精確座標、照片、自由文字、個人識別資訊。以完成真實回報與回訪為主要指標，避免只看瀏覽次數。

Keyword Planner 待帳號與工具權限確認後調查；目前沒有查詢量證據，不編造數字。起始題目：騎樓高低差、人行道障礙回報、輪椅通行、基隆騎樓、無障礙通行地圖。將問題解說連到如何使用，將所在地需求連到可實際瀏覽的地圖；暫不建立 368 個空內容 SEO 頁。

初期優先邀請基隆在地社群、輪椅／推車使用者與店家實際回報，提供地圖連結及三步圖解。每週觀察教學開始到送出成功的流失，再改善操作。對外聯繫與發文需另有明確發送授權。

## 動畫教學預留

目前提供九步互動教學，每一步標示當前欄位，慢速明暗提示可結束，尊重 reduced-motion。未來動畫放在 `/how-to` 的教學區，使用 poster、字幕與逐步文字，播放由使用者控制。影片未完成前不放失效播放按鈕，也不輸出虛構 VideoObject。地址轉座標需另外設計候選位置與確認機制，避免地址輸入後直接錯誤跳點。

## 無障礙驗收範圍

本次檢查桌面與手機佈局、表單 label、鍵盤操作、對話框焦點、非純顏色狀態、照片替代資訊與 reduced-motion。這是工程檢查，沒有宣稱取得無障礙認證；正式認證仍需完整 WCAG 與輔具人工稽核。

來源：[Google Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)、[Google 搜尋文件更新](https://developers.google.com/search/updates)、[WCAG 2.2](https://www.w3.org/TR/WCAG22/)。
