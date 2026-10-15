# Road Tag 公開介紹與分享素材

狀態：文案準備完成，尚未代為發文；2026-10-15 [Official Registry 已登錄 org.roadtag/road-tag 1.0.0](https://registry.modelcontextprotocol.io/v0.1/servers/org.roadtag%2Froad-tag/versions/latest)，公開回讀 status=active。官網入口為 https://roadtag.org/#ai-mcp 。

## 中文介紹（80–140 字）

想讓自己的 AI 助理幫忙查詢道路通行障礙？Road Tag 提供民眾公開回報的唯讀查詢，可用座標找附近案件、查看狀態與連結。支援自訂遠端 MCP 的助理可自行加入，不需 Road Tag 帳號。地址搜尋與公開寫入暫不支援；沒有回報，不代表道路安全。

## English introduction

Road Tag provides public, read-only access to community-reported accessibility barriers on roads and sidewalks in Taiwan. Connect a compatible AI assistant using custom remote Streamable HTTP MCP to resolve coordinates, find nearby reports, and retrieve report details. No Road Tag account or token is required. Address and landmark search, public report creation, editing, and photo uploads are unavailable through this endpoint. Reports may be incomplete or outdated; missing reports do not establish road safety. Support depends on the client, account and administrator policy.

## 最短連接方法

在支援自訂遠端 Streamable HTTP MCP 的 AI 助理設定中新增 Road Tag：

```text
https://roadtag.org/api/mcp-public
```

[官網連接入口](https://roadtag.org/#ai-mcp) · [完整教學](./public-mcp-connect-guide.md)

> 請使用 Road Tag 查詢座標 25.120772、121.743712 附近 500 公尺內的公開道路障礙回報，整理案件、狀態與連結。只根據回報描述，不要把未回報道路當成安全道路。

## 發布方式

先分享官網入口與上述座標示例，邀請使用者回報「Client／版本、是否有自訂遠端 MCP、三工具是否出現、去敏錯誤」。不要收集 Token、私人對話、精確住址或帳號資料。未取得發文／平台上架授權，不自動發佈社群貼文。

上方 Registry 連結已在發布後實際查詢確認，但不保證所有 AI 平台自動發現或相容。若需要低頻健康監控，應另行核准頻率、通知條件及配額，這份文件沒有建立排程。
