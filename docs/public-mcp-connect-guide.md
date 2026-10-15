# 用自己的 AI 助理查詢 Road Tag

[官網連接入口與網址複製](https://roadtag.org/#ai-mcp)

Road Tag 收集民眾公開的騎樓、人行道與道路通行障礙回報。資料可能尚未更新或不完整，並非政府核定資訊、即時現場狀態或安全路線認證；未出現回報不代表道路安全。

## 連接方式

1. 確認自己的 AI 助理支援**自訂遠端 MCP Server**，且 transport 為 **Streamable HTTP**。只有本機 stdio 或舊式 SSE 選項的客戶端，不一定可直接連接。
2. 開啟該 AI 助理的 MCP／Tools／Connectors 設定，新增遠端 server。各產品位置、名稱、帳號資格及管理員政策可能不同。
3. 名稱填 `Road Tag`，網址填下方完整網址；驗證選擇無認證或 anonymous（若該產品提供此選項）。

```text
https://roadtag.org/api/mcp-public
```

4. 儲存後重新整理工具；應只看見下表三個唯讀工具。依客戶端正常流程允許查詢，再使用座標示例。

不需要 Road Tag 帳號、邀請碼、API key、OAuth Token 或任何 Control Secret。AI 產品自身可能要求使用者登入或具備既有方案；Road Tag 不替使用者開通方案。本教學沒有聲稱 ChatGPT、Codex、Claude、Gemini 或 Manus 各版本均可加入，也不代表平台官方收錄。

## 公開能力與使用範例

| 工具 | 可做的事 |
|---|---|
| `resolve_location` | 以經緯度辨識位置／行政區；地址與地標文字搜尋目前暫停 |
| `search_nearby_reports` | 查詢座標附近的公開回報 |
| `get_report` | 查詢指定公開案件詳情與案件連結 |

直接對 AI 助理說：

> 請使用 Road Tag 查詢座標 25.120772、121.743712 附近 500 公尺內的公開道路障礙回報，依距離整理案件、狀態與連結。只根據回報內容描述，不要假設未回報的道路就安全；若工具沒有距離欄位，請勿自行編造距離或排序。請註明資料可能未完整或尚待社群更新。

如果 AI 只有地址或地標，請先由使用者提供可信座標，不要假裝 Road Tag 已完成地址轉換。拿到公開案件 ID 後，可請 AI 使用 `get_report` 查詢該案。

公開 MCP 不提供 `create_report`、`add_observation`、修改、照片上傳或自動建案。要回報問題，請使用[網站地圖](https://roadtag.org/map)的正常流程。原 `/api/mcp-chatgpt` 是另外邀請與授權的封閉測試，不要拿它代替公開端點。

## 地址／地標搜尋準備（尚未開放）

文字搜尋的獨立 provider 與安全控制正在準備；正式服務目前仍使用上方座標方式。待官網明確顯示可用且工具描述不再標示暫停後，才使用以下範例：

> 請透過 Road Tag 查詢基隆車站附近 500 公尺的公開道路障礙；若有多個候選位置請先讓我選擇，再附上案件網址及地理資料來源。

啟用後 `resolve_location({query, city_hint?})` 最多回傳五個候選；可以輸入台灣地址、巷弄門牌、商家、車站或醫院。即使只有一個候選也需確認，地標只是查詢周邊中心，不是路障精確位置。找不到時補上縣市／門牌，不要要求 AI 猜座標。附近查詢仍最多 500 公尺。

文字會送往第三方 Geoapify，請避免私人住址或不必要個資；Road Tag 不建立搜尋歷史或將文字寫入案件。保留工具回傳的 [Powered by Geoapify](https://www.geoapify.com/) 及 [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright) 來源。額度／provider 故障可能只暫停文字搜尋，既有座標讀取仍可用。`RATE_LIMITED` 時依 `Retry-After` 等待，不自動重試或繞過配額。

工程與正式啟用是不同狀態；[發布核准／成本與回滾清單](public-mcp-geocoding-release.md)。Registry 1.0.0 仍描述 coordinates only，新版 metadata 須另行核准。

English: Text search is prepared but not enabled in Production. After an approved release, use a Taiwan address or landmark, confirm location candidates, and keep Geoapify/OpenStreetMap attribution. Queries are sent to Geoapify. Until then, use coordinates.

## 常見問題

| 狀況 | 處理方式 |
|---|---|
| AI 設定沒有自訂遠端 MCP | 目前產品／帳號／管理員政策可能不支援。仍可用網站地圖；Registry 登錄也不會解除平台限制 |
| 瀏覽器直接開網址出現 GET 405 | 這不是一般網頁；請由支援 Streamable HTTP 的 MCP Client 使用 POST。可選 GET 通道不支援，不代表 POST／SSE 失效 |
| HTTP 429 | 請依 `Retry-After` 等待，減少頻率及並行；不要更換身分繞過配額 |
| HTTP 503／首頁暫時無法複製 | 稍後重試，或改用網站地圖；服務可能暫停或維護。不要索取／輸入控制密鑰 |
| 地址或地標查詢失敗 | 首版刻意停用文字搜尋；改提供經緯度 |
| 沒有附近案件 | 只代表目前沒有符合查詢的公開回報，不能推論輪椅可通行或道路安全 |
| AI 說可以拍照建案 | 公開 MCP 沒有此能力；請以實際發現的三個工具為準 |

## English quick connect

Add `https://roadtag.org/api/mcp-public` to an AI client that supports custom remote Streamable HTTP MCP servers. Road Tag requires no account or token for this public read-only endpoint. Use coordinates to resolve a location, find nearby public community reports, or retrieve a report. Address/landmark search and public writes are unavailable. Missing reports do not prove road safety. Client availability and account requirements vary by product.
