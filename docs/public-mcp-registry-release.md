# Road Tag Registry 發布準備

任務 `ROADTAG-REGISTRY-DISCOVERY-01`；2026-10-15，Asia/Taipei。

**Registry Publish GO — 已正式登錄。** Owner 已回覆「核准上述完整限定清單」，並親自完成 Cloudflare 正常登入。以下最終摘要記錄實際結果；後面的準備階段快照與通用操作方案保留供追溯，不代表仍待本輪授權。沒有改 handler、UI、資料庫、安全設定或 provider。

## 正式發布摘要（2026-10-15）

- #29 merge：`b3fd86d527d1913c51b678301e463de47fe1a028`；#30 merge／main：`496893995c93a2151afa2c17fb081b6f6917dd33`。原 Head 與 CI 皆核對後依序 Ready／merge，未跳過保護。
- 最新 main [Quality CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38711698956) PASS；Production `dpl_B2iaECuAjoMa6CiYfTkrDAQFUtLw` READY，roadtag.org alias／SHA 一致。
- 僅新增 apex roadtag.org 一筆 TXT MCP 公鑰 proof，TTL Auto；既有 A、www CNAME、兩筆網站驗證 TXT 及 Proxy 狀態均保留。公開 1.1.1.1 查詢確認恰好一筆 MCP proof。獨立 Ed25519 私鑰只在 owner ACL 保護目錄，不入 repo。
- 官方 `mcp-publisher 1.8.1` DNS login PASS，登入後 validate PASS；只執行一次 `publish server.json`，metadata 仍是核准 SHA-256 `9c87d46b6d22836f501fcd2e676bd2dafe5bb33fe451ebfc005dc8ebbe7f6d07`，沒有增加版號或重試 publish。
- [官方公開條目](https://registry.modelcontextprotocol.io/v0.1/servers/org.roadtag%2Froad-tag/versions/latest) HTTP 200，name=`org.roadtag/road-tag`、version=`1.0.0`、status=`active`、isLatest=true、remote=`https://roadtag.org/api/mcp-public`、type=`streamable-http`，完整回讀相符。Registry publishedAt=`2026-10-15T09:22:47.846749Z`（台北 17:22:47）。
- 文件部署後與 Registry 發布後，各做一次匿名 tools/list，合計 **2／3** 次核准額度，皆 HTTP 200／no-store／恰好三工具。沒有 Cookie、Authorization、控制 Secret、業務寫入、模型或 Geoapify 呼叫。
- 發布完成後官方 logout PASS，清除本輪 Publisher 登入狀態。owner 保護目錄 `%USERPROFILE%\.roadtag\registry\roadtag.org` 保留獨立私鑰與公鑰供後續授權維護；不刪 DNS proof，不影響正式 MCP，後續發布或金鑰輪替仍需新授權。

本次後續 PR 只補登已發生的公開發布事實及去敏證據，不再執行 merge／Production 部署、DNS 或 Registry mutation。沒有因 Registry 登錄宣稱所有 AI 產品都已自動收錄。

## PR #29 審查結論

合併前完整唯讀審查 Head `dcd9a9ff4209a4d85f87a2c12e18018ec8d9cb3b`，base=main，當時 MERGEABLE／Draft。只有 `docs/public-mcp-release.md` 與 `docs/public-mcp-production-evidence.json`。未發現阻擋項；這是本輪文件審查，不冒稱新增的獨立安全審查。

JSON 能解析；program／SDK SHA 同為正式 `6c708bd8efcdaa627ce9be05262dd9f95ffbe9f3`。Migration 原檔版本與實際套用版本有清楚區分；14 日測試及15 日讀回分開，20 次實際／21 次保守占用沒有互相冒充。JSON 的負向測試文字包含私密欄位名稱，但沒有私密欄位資料或 Credential。地址停用、寫入不可用、非所有平台驗證、Registry 未發布均有聲明。物件欄位及憑證 pattern 檢查 PASS。

Quality [push CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38707583666)／[PR CI](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38707590438) PASS，Preview PASS。準備階段依授權邊界保留 Draft；owner 後來核准後才按上方摘要完成合併。新 metadata 分支直接從當時最新 main 建立，沒有把新內容塞進 #29。

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

## 網域驗證方案（DNS 已完成，替代方案未啟用）

採自有網域 DNS 身分，保留品牌 namespace `org.roadtag/*`。依[官方 authentication](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/authentication.mdx)，proof 放 **apex `roadtag.org`** 的 TXT，不放 `_mcp-auth` 等子網域。不改現有 A／AAAA／CNAME、TLS、SPF、DKIM、DMARC 或任何 Production env。

以下是核准後採用的 DNS 流程，供後續另行授權維護時參考：

1. 在 owner 本機安全位置生成**全新獨立 Ed25519 發布金鑰**，限制檔案讀取權限；與 MCP Gate／Supabase／OAuth 完全分開。不生成付費 KMS 資源、不索取或展示私鑰。
2. 由 owner 或已授權的網域管理介面新增單筆 TXT：type=`TXT`、name=`@`（roadtag.org）、content=`v=MCPv1; k=ed25519; p=<新公鑰的 raw 32-byte base64>`、TTL=Auto。`p` 是公鑰，不是私鑰、不是 hash；核准前沒有建立 key，所以這裡不虛構實際值。不要覆寫其他 TXT；若已有 MCP proof，先核對 owner 與輪替安排，不能逕自刪除。
3. 查詢 authoritative／公開 DNS，確認 apex 實際可讀 proof。以官方 `mcp-publisher login dns`、domain=`roadtag.org` 完成 challenge；用受控本機程序讀取獨立私鑰，不把真實 `--private-key` 命令存入 shell history、Git、日誌或聊天。Publisher token 只存本機受保護位置。
4. 核對 `org.roadtag/*` 身分與正式 Registry target，再跑 validate。只有在另含 publish 的 owner 核准下，才執行 `mcp-publisher publish server.json`。
5. 回讀上方精確名稱 URL，必須 HTTP 200 且 name/version/remotes/url 完全相符，保存公開條目證據，才改狀態為 Registered。若 CLI login／publish 失敗，記錄去敏錯誤，不影響既有 MCP GO。

若 owner 無法改 DNS，可另核准 HTTP proof：`https://roadtag.org/.well-known/mcp-registry-auth`，內容是同一公鑰 record；這需要新增正式公開檔與網站部署，**本 PR 沒有放此檔**。只有網域驗證不可行且 owner 核准身分改變時，才改 `io.github.qwert7278/road-tag` 並由 owner 完成官方 GitHub OAuth；不偷換 namespace，不使用現有 GitHub Token 當 Registry 發布憑證。

## 連接教學與最小網站範圍（準備階段快照）

首頁 `#ai-mcp` 已有三工具說明、唯讀／座標限制、網址與範例複製及獨立 Alpha 說明，無需再建頁。15 日正式首頁 HTTP 200，實際 HTML 的入口、copy button、正式 URL、文字搜尋限制均存在。README 新增發現入口，[教學](./public-mcp-connect-guide.md)補齊帳號／產品限制、405／429／503 排除方式，[中英文分享稿](./public-mcp-discovery-copy.md)可供 owner 複製。

沒有修改首頁、CSS、路由、canonical 或 sitemap；沒有新增網頁需部署。手機／鍵盤／clipboard 沿用14日正式驗收，沒有把本輪 HTML 只讀檢查冒稱重新實測 UI。未做新的 MCP 呼叫、模型登入、付費或壓測。

## 本輪已取得 owner 核准並完成的範圍

- #29 由 Draft 改 Ready、依現有保護規則 merge；本準備 PR 在最新 CI PASS 後依核准整合。這些 README／metadata／docs 變更可能觸發現有 Vercel 部署，核對新 main／CI／READY／正式站，不改 env／DB。
- 定稿 `org.roadtag/road-tag`，生成獨立發布金鑰並新增上述 apex TXT，正常 DNS 身分驗證。
- 只向 Official MCP Registry 發布本 metadata 的 `1.0.0` 一次，回讀公開條目；不包括其他 Gallery／Plugin、公開寫入、社群自動發文或付費服務。

本輪清單已全部明確核准並依上方摘要執行；此授權不推及其他 Gallery、社群或未來版本，沒有建立排程或自動發布工作。

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
