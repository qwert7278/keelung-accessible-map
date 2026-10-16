# Public MCP 接入教學 UX 驗證

日期：2026-10-16。分支 `codex/mcp-connection-guide`，從最新 main `13331f9307a3acb7a8ab14ef507e3eabd5da5116` 開始；不包含待審 PR #33 的 geocoding。未修改 MCP、DB、Secret、OAuth 或 Production。

## 可觀察的完成條件

- 首頁只有簡短查詢範例、複製、第一次接入連結及五個有名稱的圖示入口。移除首頁設定網址／冗長協議說明，保留公開唯讀／座標限定／網站回報界線。
- `/mcp` 是可獨立開啟的小頁面：網址放在設定，不是聊天框。先連接再問；無帳號入口時改用地圖。各平台逐一展開，不能使用一份 JSON 代表所有產品。
- ChatGPT 使用 Plugins 自訂 MCP；Claude 使用遠端 Connector，不把 Desktop 本機 JSON 當成遠端格式。Codex TOML/CLI、Gemini CLI `httpUrl` JSON、Claude Code `type:http` JSON/CLI 均有複製按鈕，保留原設定與確認流程。
- Logo 為本地官方站點識別圖示，連到設定教學，不代表官方收錄或所有平台驗收。未加入 Meta AI；使用者已確認本輪五個產品範圍。
- FAQ／回報入口：公開 MCP 只能讀，網站地圖處理回報。地址／地標搜尋未啟用，保持座標範例；不新增模型驗收、付費或 provider 呼叫。

## 官方依據（2026-10-16 核對）

- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/learn/docs-mcp
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- https://code.claude.com/docs/en/mcp
- https://geminicli.com/docs/tools/mcp-server/
- https://www.manus.im/features/connectors

## 驗證紀錄

- RED→GREEN：首頁移除網址按鈕後，原 initializer 直接退出，查詢範例無法複製。現在網址按鈕可選，範例不做 API 呼叫。
- `npx vitest run src/public-mcp-onboarding.test.ts src/mcp-guide.test.ts`：PASS，8 tests；完整設定文字／換行、clipboard 失敗手動複製、listener cleanup、無意外 API 呼叫。
- Build／Typecheck／SEO／Lint：PASS。本機桌面 1280px／手機 390px 無水平溢出；五個圖示載入、平台深連結自動展開、TOML／Gemini JSON 與首頁範例鍵盤複製均 PASS。
- GitHub CI／Preview：以交付 PR head 狀態核對，正式環境未部署。
- 配置格式與新路由列入既有 build SEO guard；Preview 仍需 noindex。圖示只從本站載入。
- Review：未改公開三工具及 quota；沒有繞過登入、工作區限制、MCP tool approval 或賦予公開寫入。只做 UI/文件，不宣稱本輪有新平台模型調用 PASS。
- 尚未部署；合併與正式部署需 Owner 核准。回滾為 revert 此 PR 經既有 main→Vercel，無 migration、DNS 或資料清理。
