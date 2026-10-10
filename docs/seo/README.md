# Road Tag SEO 唯讀工作流

本輪只有本地 CLI，不部署、不變更 Production Secret、MCP/OAuth/Supabase、不投放廣告。

## GSC
服務帳號已加入 sc-domain:roadtag.org，Restricted 權限，API 讀取成功。
透過 GOOGLE_APPLICATION_CREDENTIALS 或 GSC_CREDENTIALS_FILE 指向 **repo 外**的 service-account JSON；不要複製 key 到專案。
唯一 scope：https://www.googleapis.com/auth/webmasters.readonly 。不提交 sitemap、不變更使用者。

```powershell
npm run seo:gsc
npm run seo:gsc -- --days 7
npm run seo:gsc -- --days 90
npm run seo:gsc -- --days 28 --end-date 2026-10-07
```

日期使用 Pacific Time，預設排除最近3天，API指定final；輸出當期與前期等長期間。
artifacts/seo/gsc-summary.json、gsc-recommendations.md 已 gitignore；不保存原始回應。
總量直接讀取 property aggregate，不將 query/page相加當作總量；平均排名使用Google的曝光加權值。
只保留相關且安全的query、六個公開頁、device、date。信箱、電話、精確座標、帶query頁面過濾。此為最小化策略，不是任意私人資訊的完全匿名化工具。
每個維度最多50,000列，truncated標記上限；Google只返回頂部資料，非全量搜尋。
429等待1秒、僅重試1次；401/403 AUTH_REQUIRED；5xx UNAVAILABLE；不印token/provider body。
候選門檻100曝光、排名5–20、CTR<3%，最多10項；這是啟發式，不是排名保證。前期空資料不當作零或無限成長。
撤銷：Search Console → 設定 → 使用者與權限 → 移除服務帳號，不改網站設定。

## Keyword Planner CSV FALLBACK
Ads discovery可列出帳號，但尚未指定Road Tag可用customer、未驗證 GenerateKeywordIdeas 資格。不得借用其他專案帳號／開付費活動。
在已授權的Keyword Planner選台灣、繁中與歷史期間，匯出CSV或TSV到repo外或artifacts/seo/。
支援 UTF-8 BOM/UTF-16LE、英文/繁中欄名、引號、範圍與空值。
```powershell
npm run seo:keywords -- --input "C:\private\keyword-planner.csv" --market TW --language zh-Hant --data-period 2026-01..2026-09
```
輸出 keywords-normalized.json；缺值null，範圍min/max。市場/語言是操作者聲明，需核對匯出設定；期間未提供為unknown。
competition是廣告競爭，不是SEO難度。沒有真實CSV不把fixture或種子當作搜尋量。

## 測試與後續
npm run test:seo、npm run lint、npm run build、npm run seo:check。
VERCEL_ENV=preview 執行 build-seo與seo-check確認noindex。
每28天讀final等長期間：相關非品牌曝光、點擊、CTR、page/device、索引狀態。有效回報不是GSC conversion，需要另用現有授權統計。
不自動排程、不發布內容。官方：[Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)、[Keyword Ideas](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas)。


輸入資料提供後，CSV報表包含最多10個reviewCandidates，僅精確字詞匹配GSC；不模糊合併搜尋量，gsc缺失保持null，必須人工審核。
索引核對：npm run seo:gsc -- --inspect（僅6個公開URL，唯讀）。Restricted若不允許Inspection則列AUTH_REQUIRED，不擴權。
GSC數據為全國別property aggregate；台灣繁中是研究目標，不將未套country filter的曝光冒充台灣限定流量。

Code Review：手動靜態審查日期/分頁上限、最小scope、credential repo外限制、無provider body輸出、CSV缺值/範圍、資料來源與gitignore。發現並修正非整除分頁cap的truncated邊界，以及API失敗後舊報表誤用風險。
API失败會以安全狀態覆寫私有報表；CSV合併僅使用CONNECTED快照並保留GSC期間/擷取時間，操作者仍須核對資料新鮮度。
本輪沒有獨立人類Reviewer核准，也不自動merge；PR等待審查。
