# Road Tag 全台定位與主地圖頁本地驗收

本輪僅修改本地來源，未提交、推送或發布，未變更 Supabase 正式資料。

- 品牌：路見不平 / Road Tag；標語：路見不平，一起標註。
- 首頁定位：台灣騎樓與人行道通行回報平台。地圖頁：台灣騎樓與人行道通行回報地圖。
- 首頁及完整地圖共用 MapView 和 loadRepository，移除首頁硬編碼三個實際案件及獨立底圖；同一範圍的案件與狀態一致，案件連結附 city / district / report。
- 首次基隆市仁愛區；切換縣市自動選定設定的中心行政區、重建對應城市底圖、清空舊案件和篩選。選擇在同一分頁保留；URL 的明確範圍優先。
- 下拉選單包含 22 縣市、368 戶政行政區。官方名稱保留「臺」字。來源 https://api.nlsc.gov.tw/other/ListCounty 和 ListTown1/{code}，取得日 2026-10-02。API 說明：https://maps.nlsc.gov.tw/S09SOA/pro/Api_ajax_spec.jsp 。靜態快照 src/data/taiwan-districts.json；手動更新 node scripts/refresh-taiwan-districts.mjs。
- 城市中心行政區／座標是編輯起點，非人流或改善需求排名。選擇其他行政區目前篩選案件，有案件時以該區回報位置移動；空區可手動拖曳，不冒稱已建立全部行政區中心點。
- 座標 bounds 為寬鬆 envelope，非精確官方行政區界。回報表單沿用選定縣市與行政區，仍要求明確選點及照片。
- 原橫式 Logo 保留圖內標語，移除外加的重複標語；首頁及地圖一致。圖內 RoadTag 拼寫由原素材保留，文字／SEO 使用 Road Tag。
- 主頁 Header 集中 Threads、教學、FAQ、條款、隱私與管理等入口；nav hover 為空心描邊；頁尾只留版權與回到首頁。
- 五筆案件一頁，照片縮圖 60px、前後頁及既有搜尋／狀態／通行程度篩選。少於五筆不填補假案件；無實際照片的 Demo seed 使用首頁情境圖並標示「示意」，正式案件缺圖顯示照片 placeholder。
- 待改善標籤紅色空心，FAQ 回答全寬；FAQ JSON-LD 與四組可見問答一致。title / description / OG / Twitter / WebSite / WebPage / OG image 已同步全台定位。

## 尚未開放的正式能力

Demo 可在所有縣市本地回報。正式環境仍只開放 TW-KEE：其他城市可瀏覽預覽，但回報按鈕關閉並清楚標示未開放。其他城市尚未套用 DB cities seed，不會自動宣告全台正式營運；正式開放前需另行準備 city metadata migration、驗證授權及範圍再套用。既有 domain / canonical 沒有變更。

## 本地預覽

http://127.0.0.1:5174/ （Demo）
http://127.0.0.1:5174/map?city=TW-KEE&district=all （五筆列表）

驗收完成：lint、27 個 tests、TypeScript、Vite build、SEO check、git diff --check 通過。桌面 1440×1000 五筆縮圖均載入且在視窗內；手機 390×844 無水平溢出，更多選單在視窗內。已核對首頁臺北市中山區 → 完整地圖沿用範圍、回報表單沿用縣市與行政區、基隆切回仁愛區，以及案件下一頁。未送出任何正式回報。

驗收截圖：output/playwright/roadtag-map-five-desktop.jpg、roadtag-map-mobile.jpg。
