# Road Tag Registry 發布準備

任務 `ROADTAG-REGISTRY-DISCOVERY-01`；2026-10-15，Asia/Taipei。

**Engineering GO / READY TO PUBLISH — awaiting owner approval。未登入 Registry、未做 DNS／HTTP proof、未 publish；不是已上架。** 既有 Production MCP 保持運作；本 PR 不改 handler、UI、資料庫、安全設定或 provider。

## PR #29 審查結論

本輪完整唯讀審查 Head `dcd9a9ff4209a4d85f87a2c12e18018ec8d9cb3b`，base=main，MERGEABLE，仍 Draft。只有 `docs/public-mcp-release.md` 與 `docs/public-mcp-production-evidence.json`。未發現阻擋項；這是本輪文件審查，不冒稱新增的獨立安全審查。

JSON 能解析；program／SDK SHA 同為正式 `6c708bd8efcdaa627ce9be05262dd9f95ffbe9f3`。Migration 原檔版本與實際套用版本有清楚區分；14 日測試及15 日讀回分開，20 次實際／21 次保守占用沒有互相冒充。JSON 的負向測試文字包含私密欄位名稱，但沒有私密欄位資料或 Credential。地址停用、寫入不可用、非所有平台驗證、Registry 未發布均有聲明。物件欄位及憑證 pattern 檢查 PASS。

Quality [push CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38707583666)／[PR CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38707590438) PASS，Preview PASS。未取得本任務的 Ready／merge 核准，因此沒有改 Draft 或合併，main 仍是上述正式 SHA。新 metadata 分支直接從最新 main 建立，不把新內容塞進 #29。

## Metadata 與官方驗證

根目錄 [`server.json`](../server.json) 為唯一提交來源：

| 欄位 | 準備值 |
|---|---|
| 名稱 | `org.roadtag/road-tag`；自有網域候選，待 owner 核定及驗證 |
| 版本 | `1.0.0`；第一個 Registry metadata 版本，不改網站 npm 版號 |
| Schema | `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json` |
| Transport | `streamable-http`；POST 的 SSE 回應不等於舊 `sse` transport |
| Remote | `https://roadtag.org/api/mcp-public` |
| Website | `https://roadtag.org/#ai-mcp`，已有連接入口 |
| Package／headers／variables | 全部不需要；沒有 npm／Docker 包或認證 header |

官方 description 上限 100 字元，計畫中的長範例已縮為 **97 字元**，仍明示 community、read-only、coordinates only 及 address/landmark unavailable；完整說明放教學。

2026-10-15 使用官方最新 release **mcp-publisher 1.8.1**（commit `f52dc8525a441a3abf5fedc9912152d95af5aab1`），下載 Windows amd64 archive 並比對官方 checksum PASS：`399ad0d6e00a50812b563a71d8bfbff5160c085e6b13aac6ec083d98d5ff7c45`。執行：

```powershell
mcp-publisher validate server.json
# Validating against https://registry.modelcontextprotocol.io...
# ✅ server.json is valid
```

這個 validate 使用官方 `/v0/validate`，未發布、不需登入。另以現有 AJV 對官方 JSON schema 驗證 PASS；未新增依賴。Schema 下載 SHA-256 `3fba09590c99f61735d234822279f4223fab9e300c0a81e81c91ab62a4114de0`；metadata SHA-256 `9c87d46b6d22836f501fcd2e676bd2dafe5bb33fe451ebfc005dc8ebbe7f6d07`。AJV 對 schema 根節點 `$ref` sibling 的提示符合 draft-07 行為，驗證成功；以官方 CLI 語意結果為主。預檢摘要見 [`public-mcp-registry-evidence.json`](./public-mcp-registry-evidence.json)。

[精確名稱公開查詢](https://registry.modelcontextprotocol.io/v0.1/servers/org.roadtag%2Froad-tag/versions/latest) 在預檢時為 HTTP 404，沒有該名稱條目；不代表已保留名稱、證明 owner 身分或保證提交時不衝突。官方另限制一個 remote URL 只能由一個 server name 使用；真正 publish 前須再查衝突，不能以其他 namespace 搶註同一 URL。

## 網域驗證方案（未執行）

採自有網域 DNS 身分，保留品牌 namespace `org.roadtag/*`。依[官方 authentication](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx)，proof 放 **apex `roadtag.org`** 的 TXT，不放 `_mcp-auth` 等子網域。不改現有 A／AAAA／CNAME、TLS、SPF、DKIM、DMARC 或任何 Production env。

取得 owner 核准後才：

1. 在 owner 本機安全位置生成**全新獨立 Ed25519 發布金鑰**，限制檔案讀取權限；與 MCP Gate／Supabase／OAuth 完全分開。不生成付費 KMS 資源、不索取或展示私鑰。
2. 由 owner 或已授權的網域管理介面新增單筆 TXT：type=`TXT`、name=`@`（roadtag.org）、content=`v=MCPv1; k=ed25519; p=<新公鑰的 raw 32-byte base64>`、TTL=Auto。`p` 是公鑰，不是私鑰、不是 hash；核准前沒有建立 key，所以這裡不虛構實際值。不要覆寫其他 TXT；若已有 MCP proof，先核對 owner 與輪替安排，不能逕自刪除。
3. 查詢 authoritative／公開 DNS，確認 apex 實際可讀 proof。以官方 `mcp-publisher login dns`、domain=`roadtag.org` 完成 challenge；用受控本機程序讀取獨立私鑰，不把真實 `--private-key` 命令存入 shell history、Git、日誌或聊天。Publisher token 只存本機受保護位置。
4. 核對 `org.roadtag/*` 身分與正式 Registry target，再跑 validate。只有在另含 publish 的 owner 核准下，才執行 `mcp-publisher publish server.json`。
5. 回讀上方精確名稱 URL，必須 HTTP 200 且 name/version/remotes/url 完全相符，保存公開條目證據，才改狀態為 Registered。若 CLI login／publish 失敗，記錄去敏錯誤，不影響既有 MCP GO。

若 owner 無法改 DNS，可另核准 HTTP proof：`https://roadtag.org/.well-known/mcp-registry-auth`，內容是同一公鑰 record；這需要新增正式公開檔與網站部署，**本 PR 沒有放此檔**。只有網域驗證不可行且 owner 核准身分改變時，才改 `io.github.qwert7278/road-tag` 並由 owner 完成官方 GitHub OAuth；不偷換 namespace，不使用現有 GitHub Token 當 Registry 發布憑證。

## 連接教學與最小網站範圍

首頁 `#ai-mcp` 已有三工具說明、唯讀／座標限制、網址與範例複製及獨立 Alpha 說明，無需再建頁。15 日正式首頁 HTTP 200，實際 HTML 的入口、copy button、正式 URL、文字搜尋限制均存在。README 新增發現入口，[教學](./public-mcp-connect-guide.md)補齊帳號／產品限制、405／429／503 排除方式，[中英文分享稿](./public-mcp-discovery-copy.md)可供 owner 複製。

沒有修改首頁、CSS、路由、canonical 或 sitemap；沒有新增網頁需部署。手機／鍵盤／clipboard 沿用14日正式驗收，沒有把本輪 HTML 只讀檢查冒稱重新實測 UI。未做新的 MCP 呼叫、模型登入、付費或壓測。

## 待 owner 一次核准的實際範圍

- #29 由 Draft 改 Ready、依現有保護規則 merge；本準備 PR 在最新 CI PASS 後依核准整合。這些 README／metadata／docs 變更可能觸發現有 Vercel 部署，核對新 main／CI／READY／正式站，不改 env／DB。
- 定稿 `org.roadtag/road-tag`，生成獨立發布金鑰並新增上述 apex TXT，正常 DNS 身分驗證。
- 只向 Official MCP Registry 發布本 metadata 的 `1.0.0` 一次，回讀公開條目；不包括其他 Gallery／Plugin、公開寫入、社群自動發文或付費服務。

可以分項核准；未授權的項目維持 pending。這份清單不是授權，沒有排程或自動發布工作。

## 回滾與觀察

尚未發布：只保留／修改 Draft PR，Production 無需回滾。文件整合後若文字出錯，修正或 revert 該文件變更並循 main 發布；不要停用正常 MCP 或回退 quota。

已授權的 DNS proof 若須撤回，只在 owner 核准下移除本次新增的那筆 TXT、撤銷本機 publisher token／私鑰。已發布的 Registry metadata 狀態修改／deprecate／delete 是另一次公開操作，不能假裝刪檔等於撤銷 Registry；先取得 owner 核准。Registry 不穩定時既有正式端點繼續運作。

另行核准監控時，採低頻、單次 `tools/list`、依 429 的 Retry-After，僅於持續 503／工具集合異常／需要 owner 操作時通知；本輪未建立監控或發送社群內容。

## 官方來源（2026-10-15 查閱）

- [最新 publisher release](https://github.com/modelcontextprotocol/registry/releases/tag/v1.8.1)
- [Quickstart／remote-only／description limit](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)
- [Remote URL 與 ownership](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/remote-servers.mdx)
- [Official Registry requirements](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [CLI commands](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md)

計畫的舊 `docs/guides/publishing/publish-server.md` 已 404，使用上面的目前官方文件。Schema／CLI／namespace 規則在實際 publish 前再次核對。
