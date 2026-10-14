# Road Tag｜P2B-01 Cross-client Acceptance

2026-10-14（Asia/Taipei）。主要規格：`ROAD_TAG_P2B_01_CROSS_PLATFORM_GO_2026-10-13.md`。

**P2B-01 NO-GO：兩種 client 已真實通過，其中一種為 AI Agent；尚缺第三種 client與第二種非 OpenAI AI Agent 的成功工具呼叫。** Phase 2A GO 不受這個模型帳號／容量阻擋影響。沒有以 SDK 取代第二個 Agent，也沒有開始 P2B-02。

## 實際版本與範圍

- [Draft PR #23](https://github.com/qwert7278/keelung-accessible-map/pull/23)：`codex/roadtag-p2a-01`，head `d946dad562470578bff5ba218e91d7ea3fc1b3e8`，未修改或合併。
- [Draft PR #24](https://github.com/qwert7278/keelung-accessible-map/pull/24)：`codex/roadtag-p2a-02`，stacked on #23。本輪只增加既有 SDK harness 的可選公開摘要輸出及本報告／證據；沒有修改部署 API、五工具、UI、OAuth 或 migration。
- 實測 server SHA：`9aec7391e1692aad389ec71e8e2e146bf8bbf1b5`。SDK／Codex：`dpl_699x6PpmHeD9ZudCL6DALgBQ24wW`；14 日指定 Preview：`dpl_BbSgim4xXWCMQHjKQrSyaWaaSD2M`，READY、同 SHA、Preview target=null。
- 唯一測試 origin：`https://keelung-accessible-map-git-code-e64c38-masons-projects-2c78a251.vercel.app`，路徑 `/api/mcp-public`；Staging `wpravdqviylkcpsioybu`。使用 Deployment Protection 短效存取；沒有關閉部署保護。
- 實測 SHA 的兩個 Quality CI：[push](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38390980323)、[PR](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38390987661) PASS。交付用報告 commit 的 head／CI／Preview 在最終回報另行讀回，不能把歷史 CI 當成新 head CI。

## Client 矩陣

| 真實 client | 發現／呼叫 | 結果與界線 |
|---|---|---|
| Official TypeScript MCP SDK 2.1.0 | initialize、tools/list 恰好三工具；三個工具成功 | PASS；2026-10-13 20:18 台灣時間，Streamable HTTP / 2025-11-25 |
| Codex CLI 0.159.3 | 原生 HTTP MCP，模型實際產生三個 mcp_tool_call、成功結果 | PASS；2026-10-13 20:19 台灣時間，使用既有正常帳號，非手動 SDK 代打 |
| Gemini CLI 0.63.0 | 正常 Google OAuth；之後核准官方 Gemini API key 免費備援 | FAIL（工具呼叫 0）；Google OAuth API 回 IneligibleTierError；API key 的旧模型回 404，新模型回 503；不是 Road Tag MCP 工具錯誤 |
| Claude Code 2.1.63 | 既有模型帳號／設定 | FAIL（工具呼叫 0）；配置的模型 Provider 回 HTTP 401，不能把 CLI 已登入當成模型授權可用 |
| ChatGPT consumer UI／Claude Cloud／Manus | 未取得可用的本輪 connector 帳號／設定 | PENDING；不宣称這些產品已通過，也不推定它們採相同認證機制 |

Gemini 原 10 次請求上限曾因 native SDK 重試耗盡。owner 另外明確核准最多 5 次，第一個 503 即停止。本次使用 Node fetch 預算攔截器，在送出前累計所有 Gemini API 請求（含一次 models/list），硬上限 15；收到 503 立即結束程序，禁止後續重試。最終累計 **12 次**，尚未用完不代表允許忽略 503 停止條件。

最後一輪 init 指定 `gemini-3.5-flash`；CLI 後續 fallback 到 `gemini-3.8-flash:streamGenerateContent` 回 503，攔截器以 exit 86 停止，只有 init/message，沒有 tool_use/tool_result。CLI 的 fallback 不等於指定模型成功。沒有再送模型請求，沒有開 Billing／Vertex／付費方案。

AI Studio 實際帳號頁確認使用的是既有 `translate` 專案 Free tier 的 `test` key；沒有使用帳號另一個 Paid tier 專案，沒有建立新 key。測後只刪除此 key 的本機暫存，**不撤銷 owner 原有 key**。Google OAuth 的 ineligible 是本帳號／client 實際回應，不推論所有 Google 使用者都不可用。

官方 client 設定依據：[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)、[Gemini HTTP MCP](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)、[Gemini CLI authentication](https://geminicli.com/docs/get-started/authentication/)、[Gemini API billing](https://ai.google.dev/gemini-api/docs/billing)。未採用 --skip-trust；只有 owner 核准的隔離資料夾經正常信任流程。

## 真實查詢與一致性

Sanitized 機器可讀證據見 [mcp-p2b-01-evidence.json](mcp-p2b-01-evidence.json)。SDK／Codex 的三個公開結果以 deep equality 比對，包含 id、座標、status、行政區、URL 與附近報告順序；**兩 client PASS，三 client PENDING**。

- `get_report`：既有 Staging 公開 report `a998e059-f20b-4928-9e63-817cf8b10950`，open、TW-KEE／仁愛區，25.120772 / 121.743712。
- `resolve_location`：同一座標，resolved、基隆市／仁愛區。不做地址 geocode，Geoapify 呼叫 0。
- `search_nearby_reports`：500m、include_resolved=true，2 筆，依序 `fa0a3df3-fb93-46da-8d48-0570a0ba040d`、上述 `a998...`，truncated=false。
- URL 為指定 Preview origin 的 `/map?city=TW-KEE&district=...&report=...`，兩 client 相同；不是 Production URL／公開上線或前端畫面驗收證據。

安全：SDK discovery 不含 `create_report`／`add_observation`，對兩者的實際呼叫被拒絕，invalid UUID 為 isError；兩 client 的完整工具結果都先檢查不含 created_by、admin_note、image_path、photo_token、credentialHash，再保存 allowlist 摘要。其他 quota／deadline／SSE／DB permission 驗收沿用 [P2A Hosted](mcp-phase2a-hosted-acceptance.md)，沒有重跑 Phase 1／完整 Phase 2A。

## 清理、Review 與交付

測試遇到執行額度中斷後，恢復時先停用 Staging，再進行帳號排查；14 日最後短窗口重新啟用只供核准测试。不能聲稱中斷時所有清理已即時完成。臨時保護存取有 15 分鐘 TTL；本輪最後再明確撤銷。

14 日 SQL 實際清理：enabled=false、gate_configured=false、counters=0、leases=0；只操作三個新 quota 控制表。指定 branch Preview flag=false、control Secret 移除，official CLI env run 布林驗證 PASS。04:32:53Z 的真實認證 POST tools/list 回 503/SERVICE_UNAVAILABLE、Cache-Control:no-store（實測 SHA 9aec739）。短效存取另以官方 API 撤銷；Gemini API key 本機副本、隔離登入／信任／cookie profile、Claude 臨時 MCP config 與獨立 gate/hash 暫存刪除。既有正常 Vercel CLI 登入與 owner 既有 AI Studio key 保留。報告 commit 觸發的停用 Preview／CI 在最後交付讀回，與上述功能測試 SHA 分開記錄。

Review：本輪針對 harness/export 與資料保存範圍做作者審查，沒有未解決的安全或功能 finding；不是新的獨立 review。P2A 原獨立 review 見 [P2A-FIX review](mcp-p2a-fix-review.md)，未重複審查已通過的 Server。Export 僅由 MCP_HOSTED_EVIDENCE_FILE 明確啟用，只保留通過私密欄位檢查的公開 allowlist；額外地址呼叫不覆寫座標證據。Lint、Typecheck、diff check PASS；最新完整 Build／測試以新 head Quality CI 實際結果為準。

没有修改 Production、建立案件／照片、改 OAuth／原五工具、migration、merge 或公開發布；主工作目錄與既有未提交檔案保留。

## 唯一阻擋與下一步

必須補到一個可正常使用模型的非 OpenAI Agent，實際完成三工具，才符合 3 client／2 Agent gate。最少 owner 動作：**提供一個可用的免費 Gemini 模型帳號／存取，或恢復既有 Claude 模型帳號的正常授權；不要貼 key／token。** 目前 503 停止條件已觸發，不再要求增加請求額度。補測需重新核准短暫 Staging／Preview 窗口，僅補該 client 與結果比對，不重跑已通過工作。

下一個實際 Task 仍是 **P2B-01 的非 OpenAI Agent 補測**。GO 後 P2B-02 具體範圍：按當時 main 核對 #23→#24 stack／CI，經 owner 核准 merge；最小正式版適配目前 Preview-only 護欄與獨立 Production quota 設定，經 owner 分別核准 Production migration／env／部署；以 fresh client 唯讀三工具核對正式 URL、資料隔離、兩層 kill switch／rollback。不能只把 Preview flag 搬到 Production。Registry／Gallery／Plugin Directory 另行發布前驗收與核准。本輪不開始上述操作。
