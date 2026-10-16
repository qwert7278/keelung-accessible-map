# Public MCP 文字位置搜尋：工程與發布驗收

Task: `ROADTAG-PUBLIC-MCP-GEOCODING-01` · 2026-10-15

範圍：既有 `resolve_location`，不增加第四個工具、不開放寫入。工程基準 main `13331f9307a3acb7a8ab14ef507e3eabd5da5116`；分支 `codex/public-mcp-geocoding`。本輪只做程式、fixture 測試與 Draft PR；Production、Staging env、DB、Secret、Registry 均未變更，外部地理編碼呼叫 **0**。正式文字搜尋仍暫停。

## 實作與安全決策

- `createGeoapifyProvider` 接受明確的專用 key。私有 provider 繼續讀既有 `GEOAPIFY_*`；Public 從 `MCP_PUBLIC_PRODUCTION_GEOAPIFY_API_KEY`（Preview 為 `MCP_PUBLIC_GEOAPIFY_API_KEY`）注入，無任何 Alpha fallback。Production 如誤填成已配置的 Alpha 或 Preview key，只停文字搜尋。不同 key 是否屬同一 project 無法從 key 字串判斷，發布前必須驗證 project。
- 各 lane 都需要自己的 `*_GEOCODING_ENABLED=true` 及 key；預設 false。每個 Public request 的 DB signal clone 保留 provider，未提供 provider 時明確注入 null，不會退回私人全域設定。座標／其他唯讀工具不依賴 provider。
- 有效文字輸入、feature gate、SQL geocode admission 全通過才呼叫固定官方 host。沿用 `mcp_public_acquire` 鎖定 policy row 的四組計數、活躍 request lease；任何失敗都不退款、不換 key、不 fallback、不重試，一次工具呼叫最多一筆 autocomplete HTTP。Public 不消耗 Alpha 的記憶體 actor budget；跨實例 SQL 才是公開費用上限。
- request quota 拒絕維持 HTTP 429／`Retry-After`，控制面失效／停用維持 HTTP 503。geocode quota 拒絕回 MCP `RATE_LIMITED` 工具錯誤並帶 HTTP `Retry-After`；MCP 工具錯誤本身仍可用 HTTP 200 SSE 傳輸，並非宣稱上游 429 會原樣轉傳。Provider 401／429／5xx 統一去敏為 `LOCATION_SEARCH_UNAVAILABLE`。
- Provider 每次 HTTP 5 秒；整個 MCP request 仍最多 25 秒，取消會傳播，SSE 完整讀取後釋放 lease，保留 waitUntil／30 秒 SQL TTL。
- 台灣 country filter、原有座標邊界與行政區 polygon 檢查、最多五個候選、重複／無效結果排除；`19之1號` 正規化沿用現有邏輯。縣市提示不限制跨縣市搜尋，既有基隆 proximity hint 保留，其餘提示目前不額外改變供應商排序。
- 每筆候選含 label/address、座標、行政區、kind、可取得的 confidence/precision、`needs_confirmation:true`。零結果 not_found、多候選 ambiguous，禁止自選第一筆。地標只是查詢周邊的中心，不能當成障礙的精確位置。
- Public 回傳 Geoapify／OpenStreetMap 來源標註，tool 描述要求保留；尚未啟用的首頁保持座標範例／文字搜尋暫停，只有 server 驗證完成且 UI release flag 同時核准後才切換文字範例。
- 查詢文字會傳送 Geoapify；Road Tag 不記錄完整 query、私人住址、原始 IP 或含 key URL，不建立查詢歷史／持久快取，不寫入案件。第三方處理仍適用其隱私政策，不能宣稱端到端不留存。

## Geoapify 費用、授權與上限

2026-10-15 查閱官方公開文件，未登入帳號或取得實際 project 的計費／硬停設定：

- [Pricing](https://www.geoapify.com/pricing/)：Free 每日 3,000 credits、5 requests/s；日配額是 soft limit。
- [Autocomplete](https://www.geoapify.com/address-autocomplete/)：每筆 HTTP 為 1 credit；此實作不是逐字輸入呼叫，無重試。
- [API keys](https://myprojects.geoapify.com/help/api-keys/)：同一 project 的 keys 共用方案／配額。應以獨立 Public project 做預算隔離，不能只換 key；不是為了分散流量規避計費。
- [Billing](https://myprojects.geoapify.com/help/billing/)：方案及計費以 project 為單位。Owner 需確認 Public project 是 Free、無付費訂閱／付款設定／其他服務用量。
- [Terms](https://www.geoapify.com/terms-and-conditions/)：供應商保留超量收費或停權權利，Free 需要 Geoapify 與 OSM attribution；禁止用多 project 分散流量繞過計費。因此「Free／無信用卡」不能視為供應商保證零超額費用。未取得帳號／條款確認及 Owner 接受前不開放。

沿用 SQL **程式預設** geocode 上限：每 risk 5/min、20/day，全站 40/min、200/day。既有部署實際 policy 尚未於本輪回讀，不把程式預設當現況證據。SQL 計數是 UTC 固定窗口，非滑動 24h：最多 200 次/UTC 日（30 日 6,000 credits），跨日的任意 24h 保守最多 400 次；跨分鐘可突發 80 次，不代表均勻速率。這些是 admission 上界，失敗／取消後仍可能已消耗配額；若 key 另被使用、外洩、policy 提高或 gate 被繞過，不能沿用此上界。

既有同身分 4／全站 16 的並行限制不等於 Geoapify 5 requests/s；瞬間突發可能得到上游 429，安全回覆且不重試。初期可由 Owner 核准更保守的既有 policy（例如全站 5/min、100/day），本輪不變更正式 policy。

**Cost ceiling：OWNER APPROVAL PENDING。** 本服務的 SQL 有硬性 admission 上限；尚無供應商帳號的可證實硬停／零超額帳單保證，最大金額不能從公開軟額度推算。若 Owner 不接受已知風險且供應商無法提供確認，文字搜尋保持停用，座標 MCP 照常服務。

## 2026-10-16 發布前狀態與有限 Staging 執行卡

已重新核對官方 Pricing、Billing、API keys文件：Free仍為每日3,000 credits／5 requests/s，日限額明列soft limit；project各有方案與帳務，另換key不能證明預算隔離。以上是公開文件，不是此帳號已開通方案或硬停的證據。既有程式／SQL限額與金鑰隔離沿用上文，未修改、未從Production回讀或提高policy。

| 項目 | 本輪狀態 |
|---|---|
| 專用Provider／Alpha key隔離、default-off、SQL admission／lease／kill switch | Engineering PASS，沿用前輪測試，不重跑 |
| 隔離Project與實際方案 | 帳號既有專案選單顯示Road Tag與Road Tag MCP Staging；後者Plan & Billing為Current plan Free／3,000 credits，唯讀確認。未建立專案／key，未複製、保存或輸出key；正式Public專案及其他消耗隔離仍PENDING |
| 超額收費條件、可驗證硬停／最高金額 | BLOCKED，雖Staging目前Free，未取得硬停／零超額帳單保證或付款／歷史訂閱完整核對；公開soft quota不能當零超額保證，需Owner確認或供應商書面條件 |
| 最多8次Staging真實Provider查詢 | READY FOR APPROVAL，未執行，Provider呼叫0 |
| Production啟用／合併／key配置 | OWNER APPROVAL PENDING |

Staging核准後，先記錄branch head／Preview SHA、Staging基線disabled／gate／counter／lease與policy（只記數值，不記Secret），確認成本條件後才配置獨立臨時key及control gate。**整個窗口最多8筆Provider HTTP，無自動重試、無併發，失敗／取消也計入上限**。固定順序：公共建築門牌、公共地點巷弄門牌、車站、醫院、店家、跨縣市地標、模糊地標、預期無結果，各1次；不使用使用者私人住址。若供應商意外回429／5xx、帳務不明、洩密或安全檢查失敗，停止剩餘呼叫，不補打。候選有無及準確度如實記錄，單一或多個皆先確認；不為湊PASS改寫期待值。

沿用最多24次MCP HTTP總預算（含初始化／通知／工具發現與其他protocol請求），每次發出前計數；若Client協定額外流量會耗盡預算，停止回報，不能默默加次數。測後或任何例外均先停Preview Public／geocoding旗標與Staging DB enabled，清gate hash、窗口counter／lease，移除本輪env／alias臨時存取、撤銷本輪新建key並清本機暫存；不撤銷Owner原有key。復原後回讀enabled=false、gate未配置、counter=lease=0、Preview端點停用；cleanup有缺口就標FAIL並停止啟用。無migration、無案件／照片寫入。正式文字搜尋回滾仍依本文件末節，不將Staging核准當Production核准。

## 驗證證據

所有 provider、DB transport 與位置 fixture 都在本機；22 縣市測試只證明候選處理與地理邊界，不證明真實供應商每個門牌／商家都有資料。

| 檢查 | 結果 |
|---|---|
| 新隔離測試在舊碼先 RED | PASS：Alpha disabled 時 dedicated Public key 回 UNAVAILABLE，證實缺口 |
| 全台 fixture 找到共享 Alpha actor limiter | PASS：原測試在第 20 次後失敗；Public 改沿用 SQL admission，Alpha limiter 保留 |
| 首頁雙旗標先 RED | PASS：只有公開 MCP release flag 時不宣稱文字搜尋；雙旗標啟用後測試由 RED 轉 GREEN |
| `npx tsx tests/mcp-public-geocoding.ts` | PASS：官方 SDK 三工具；門牌／巷弄／POI／商家／22 縣市／模糊／空結果；隔離／配額／錯誤／取消／5s timeout／lease／私密欄位 |
| `npx vitest run src/public-mcp-onboarding.test.ts src/services/geoapify.test.ts` | PASS：19 tests |
| `npx tsx tests/geoapify-mcp.ts` | PASS：私有五工具最小相容性回歸；不重跑 Closed Alpha |
| `npm run test:mcp-public` | PASS：本地三工具、SQL quota／ACL、取消、環境、migration regression；不執行 Hosted migration |
| Lint／Typecheck／Build／SEO | PASS；Typecheck 曾因新增測試的 SDK structuredContent 型別失敗，已補明確型別後通過 |
| GitHub CI／Preview | 以 PR head 的檢查為準；網址於 PR 交付 |
| 本機首頁兩種旗標狀態、1280／390px、鍵盤複製 | PASS：無水平溢出；未發布維持暫停；啟用後候選／第三方說明與文字範例可見 |
| 真實 Geoapify／Staging／Production | NOT RUN：未授權，本輪 0 次 |

## Code Review

本輪為人工靜態 review 與自動化測試；不冒稱獨立子 agent review。最終未發現未修的 P0/P1 程式問題；對無 key／私有 key／Preview key／空白 key、quota admission、clone、取消與輸出逐項檢查。

- P1 已修：Public 原本讀 Alpha key，geocode admission 也取決於 Alpha env，無法安全啟用獨立 Public provider。現在 provider 注入及 gate／quota 同一設定來源，所有 public clone 保留隔離。
- P2 已修：Public 原本共用 Alpha actor 記憶體 budget，公開搜尋會影響另一產品線容量；現在 Public 使用既有 SQL，私有 actor limiter 不變。
- P2 已修：geocode quota denial 原本丟失 Retry-After；現在在 MCP response header 保留等待語義。
- P2 已修：相同上游候選可能重複展示，現在先去重再上限五筆；完整門牌與 confidence 不自行補猜。
- P2 已修：空白專用 key 不能視為功能可用；已先做 RED 再以 trim 驗證修正，保留其他工具可讀。
- P2 已修：免費地理來源需 attribution，Public payload 與已啟用 UI／教學加入來源連結。
- 尚未解除：供應商帳號成本／硬停與真實搜尋正確率待 Owner 核准有限實測。這是發布門檻，不是本機 PASS。

## Owner Approval Checklist（唯一核准清單）

1. **成本與 key**：確認獨立 Public Geoapify project、Free／付款／其他服務用量、超額規則及可行硬停。接受上述固定窗口上界與上游可能 429；若不能確認或接受，不啟用。不新增付費方案；key 以安全 secret 通道提供，禁止貼對話。
2. **有限 Preview／Staging**：建議最多 8 次 Geoapify HTTP（門牌、巷弄、車站、醫院、店家、跨縣市、模糊、無結果各一次），MCP 最多 24 HTTP；使用 Staging `wpravdqviylkcpsioybu` 與此分支 Preview，獨立臨時 key/control secret/hash。必要 alias 存取最多 15 分鐘。無寫案，測後 disabled、gate 清除、counter/lease=0、移除臨時 env／存取／key。若已用完 8 次仍有覆蓋缺口，回報而不自動增加。
3. **正式發布**：核准本 PR 已審 SHA、最新 CI 後 Ready／merge、既有 Vercel Production 部署。安全配置 Production 專用 key；只切 `MCP_PUBLIC_PRODUCTION_GEOCODING_ENABLED` 及 `VITE_MCP_PUBLIC_TEXT_SEARCH_RELEASED`，保留 Public read/DB gate。先回讀既有 geocode policy，是否調低另依核准值執行。不需新 migration，不改 RLS／Alpha／OAuth。
4. **有限 Production smoke**：最多 3 次 Geoapify（地址、POI、跨縣市各一），最多 12 次 MCP HTTP（initialize/list、三次 resolve、附近讀取、既有座標／案件、拒絕寫入；不建立案件）。記錄實際請求數；僅查公共地標／商家，避免私人住址。核對 Production SHA／READY／雙旗標／來源與工具描述一致，異常立即關文字 gate。
5. **文件與 Registry**：本 PR 保留現行 1.0.0 coordinates-only server.json。文字搜尋正式 PASS 後另核准將連接教學／README 的「暫停」狀態改為已啟用，產生相容 metadata 1.1.0 並官方驗證／publish 一次。此項可延後，不阻擋原端點文字查詢；不得沿用舊 Registry publish 授權。未登錄時明確標記 Registry update pending。

## 回滾

先關 `MCP_PUBLIC_PRODUCTION_GEOCODING_ENABLED=false`，只停止新的文字搜尋；將 `VITE_MCP_PUBLIC_TEXT_SEARCH_RELEASED=false` 重建首頁，保留座標／附近／案件及 MCP read/DB gate。已在途請求最多受 provider 5s／request 25s 與配額保護；視情況撤銷該 Public key。若需 code rollback，revert 本 PR 後走同一 main→Vercel 流程（仍需 Owner 授權）；不要重跑舊 migration、清除正式案件或變動 Registry/DNS proof。
