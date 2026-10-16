# Claude Public MCP：使用者提供的功能驗收

日期：2026-10-16（Asia/Taipei）。結果：**Claude Public MCP 3/3 Functional PASS — user-reported**。

來源：Owner 在本任務直接提供的 Claude Connector 真實執行結果；不是本 Agent 重跑、SDK 模擬或 Anthropic 官方認證。端點：https://roadtag.org/api/mcp-public 。本輪只記錄證據，未再次執行 Claude、模型或 Geoapify。

| 工具 | 使用者提供的結果 |
|---|---|
| resolve_location | PASS，公開座標 25.120772, 121.743712 解析成功 |
| search_nearby_reports | PASS，以該座標查附近500公尺，回傳1筆公開案件，距離458.6公尺 |
| get_report | PASS，該公開案件詳情讀取成功 |

案件 ID、標題、完整 payload、原始執行截圖／逐字紀錄、Claude Client 版本與部署 SHA 未提供，本文件不補猜。458.6公尺是該次回傳值，不是現在再次查詢的結果；公開資料會隨時間改變。不記錄使用者識別、帳號、憑證或私密欄位。

此證據僅支持特定使用者當次 Claude Connector 的 Production 座標唯讀功能成功；不表示所有 Claude 帳號／版本可用、不證明 Geoapify 地址搜尋、不證明其他 AI 平台逐一相容，也不重新宣告舊 Staging 跨 Client deep-equality gate通過。既有 SDK／Codex 證據仍保留在 mcp-p2b-01-cross-client-acceptance.md 與 mcp-p2b-01-evidence.json；不能將不同日期、環境的結果冒充同一組資料一致性驗收。

`/mcp` 的 Claude 教學只呈現以上有來源標記的成功紀錄。Public MCP 仍恰好三個唯讀工具；建立案件、照片與補充紀錄請走網站地圖，沒有回報不代表道路安全。
