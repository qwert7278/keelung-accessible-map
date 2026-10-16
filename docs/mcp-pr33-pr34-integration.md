# PR #34 正式驗收與 PR #33 工程整合

日期：2026-10-16。結論：#34 Production GO；#33 Integration Engineering GO，正式文字搜尋仍關閉，待 Owner 核准。這份紀錄取代先前只有隔離 patch 的整合準備狀態。

## #34 Production 證據

- main／#34 merge：`b3ac88a046e33162b72cf6f9dbb4e802cd3b2fef`。GitHub Quality [38849038935](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38849038935)：SUCCESS。
- Vercel：`dpl_2BrGLdg7Wh1w4p3inAqaF5oZ9YWr`，target production、READY，githubCommitSha 等於上述 merge，正式 roadtag.org alias 指向此 deployment。沒有重新部署或修改設定。
- 正式首頁與 `/mcp`：HTTP 200；首頁鍵盤複製座標範例、教學頁網址／範例複製及成功狀態 PASS。五平台教學實際展開，Codex TOML、Gemini CLI httpUrl、Claude HTTP 設定及平台界線保留；沒有重新進行模型帳號驗收。
- 正式 `/mcp` title、canonical、一般／OG／Twitter description 一致；sitemap 含正式 `/mcp`，沒有模板 URL token。頁面未宣稱文字搜尋或公開寫入可用。
- 使用官方 MCP SDK Client 連線正式端點：initialize、tools/list（恰好三個工具，readOnlyHint）、resolve_location 座標（25.120772,121.743712）PASS，沒有 Geoapify 查詢或案件寫入。初始 Python urllib transport 回 403，未執行 MCP；改用既有 Node SDK 正常連線即通過，未調整 WAF、存取或憑證。

## 實際整合

- 新 worktree：`roadtag-geocoding-integration/Road Recall system`；分支 `codex/mcp-geocoding-guide-integration`，從最新 main 上述 merge 建立。
- #33 reviewed head：`8a66b564291593552bf274630e004dcebf3132d0`，原分支／worktree 未變更。
- 重新執行 merge-tree 與實際 no-commit merge：共同五檔 README.md、docs/public-mcp-connect-guide.md、index.html、src/public-mcp-onboarding.test.ts、src/public-mcp-onboarding.ts；實際衝突僅 index.html 與 onboarding.ts。
- 閱讀雙方衝突後，保留 main 的簡化首頁、五平台連結、可選 URL 按鈕及直接複製；補回 #33 雙旗標，首頁與 `/mcp` 都有狀態 hook 與隱藏的 Geoapify 隱私／來源註記。只有兩旗標同為 true 才換文字範例，其餘三組保持座標模式。固定網址複製完全不 fetch。
- 既有 patch 只在確認 baseline 與衝突後使用；不再需要下次重複套用。`docs/patches/mcp-guide-geocoding-integration.patch` 保留為先前固定版本的歷史參考，不是對本整合結果可再次套用的 migration。
- server/mcp/public.ts、server/location/geoapify.ts、server/roadtag/service.ts 與 #33 reviewed head byte-identical。保留專用 Public provider、既有 SQL admission／lease／timeout／kill switch、位置確認及 attribution；沒有新增 SQL migration 或更動 schema／policy。

## 本機驗證

- `npx vitest run src/public-mcp-onboarding.test.ts src/mcp-guide.test.ts src/mcp-guide-metadata.test.ts src/services/geoapify.test.ts`：初次29 PASS；追加頁面接線 regression 後 metadata 2 PASS，合計30個案例。涵蓋四組旗標、無 URL 按鈕首頁、429／503／offline／timeout 不妨礙複製、Clipboard deny／cleanup、設定格式與 metadata；新增案例確認兩頁 default-off／隱私 hook、來源網址與五平台入口。
- `npx tsx tests/mcp-public-geocoding.ts`：PASS，SDK 三工具、地址／地標／商家／巷弄／22 縣市 fixture、確認／去重、Alpha 隔離、quota before I/O、上游錯誤不重試、取消／deadline／provider timeout、lease／資料隔離。真實 Geoapify 呼叫0，不宣稱已驗證真實搜尋正確率。
- `npm run lint`、`npm run build`（Typecheck／Vite／SEO）、git working／staged diff check PASS。新增測試另跑 ESLint／Typecheck PASS；`tests/mcp-public-controls.ts` 與 `tests/mcp-public-cancel.ts` 均 PASS（本機 SQL quota／lease／fail-closed 與取消／late admission release）。既有大型 chunk warning，無新增 build failure。
- 整合 localhost5201 首頁與 `/mcp`：座標範例、文字搜尋尚未開放、隱私 notice 隱藏、鍵盤複製及狀態回饋 PASS，無水平溢出。離線以 unit fetch spy 不被呼叫驗證。未執行實體螢幕閱讀器測試。
- GitHub CI／Preview 與整合 SHA：以 Draft Integration PR head 的回讀結果交付，不將本機 build 稱為正式發布。

## Code Review 與剩餘門檻

本輪人工 review，非獨立子 agent review；未發現未修 P0／P1。整合風險是舊首頁覆蓋新教學、必需 URL 按鈕造成首頁 initializer 退出、單旗標誤稱文字搜尋啟用；已解決並加 regression。三工具、候選確認、配額、來源與 fail-closed 保留。

獨立 Public Geoapify project／帳號 Free與超額成本及硬停、有限 Staging 實際地址測試仍 PENDING，依 `public-mcp-geocoding-release.md` 交 Owner 核准。不設定 key、不啟用付費、不修改 Production SQL／env、OAuth、私有 MCP、Registry、DNS、正式案件或照片。本輪不合併整合 PR／#33，不部署 Production。

若未來正式啟用文字搜尋有異常，先關 dedicated server geocoding gate，再關 UI text-search flag重建，保留原座標唯讀；code rollback 為 revert 整合 merge 後走既有 main→Vercel，需 Owner 核准，無新 migration。本輪僅 Draft PR，正式站維持 #34，不需清理資料。


## PR #35 Final P2 Fix（2026-10-16）

- 將共用 onboarding 的文字範例換成「請使用 Road Tag 搜尋基隆車站，先列出候選位置讓我確認，再查詢附近 500 公尺的公開道路障礙，附上案件連結與資料來源。沒有回報不代表道路安全。」首頁與 `/mcp` 共用同一 initializer；技術接入文件的預備範例同步修正。
- 移除「若有多個」條件，單一／多個候選皆要求先確認；不改後端 needs_confirmation、provider 或三工具。旗標未同時啟用仍保留既有座標文案與尚未開放狀態。
- RED：新測試在舊文案下12 PASS／1 FAIL；修正後20 focused tests PASS（onboarding13、guide5、metadata2）。四組旗標各驗證首頁／教學頁模式及實際複製文字，啟用範例不得含若／多個／第一筆的條件，未啟用仍是座標；fetch spy 未被呼叫。
- 本次差異人工 review：只有範例、對應測試及驗收文件；沒有新增未修 P0／P1。未重跑完整歷史 MCP 測試；未呼叫真實 Geoapify。Typecheck／Lint／Build／SEO／diff check PASS；CI與Preview以本次 head最終交付結果為準。
- 結案狀態：通過所有工程檢查後為 Engineering GO / Ready for Owner Review，PR保持 Draft。不合併、不開正式文字搜尋；獨立 project成本確認與最多8次Staging實測仍屬下一階段。


## Public Adoption 收尾（2026-10-16）

P2已於09d0039修復，本輪不重做。新增 `mcp-claude-functional-acceptance.md`，如實記錄Owner提供的Claude Production座標三工具3/3 PASS（500m內1筆、458.6m），案件ID／原始payload未提供；舊P2B文件標為歷史快照並連到新證據，不竄改舊JSON或跨環境一致性結論。

`/mcp` 補上Road Tag用途、座標順序／如何替換範例與地圖替代入口，Claude教學加入有來源、日期與適用範圍的成功紀錄；首頁保持原簡潔版本。僅文案／文件變更，沒有新增P1／P2操作流程問題或變動工具／旗標。桌面瀏覽器確認說明可見、Claude成功紀錄可展開、文字搜尋仍未開放、無水平溢出；沒有重跑Claude或Geoapify。

Geoapify發布文件已補帳號待確認清單與8次Staging執行卡、異常停止及cleanup證明要求。已唯讀確認既有Road Tag MCP Staging專案Current plan為Free／3,000 credits；未複製、保存或輸出key，未改方案／設定。正式Public project隔離、供應商硬停及最高費用仍BLOCKED，不把Free當零超額保證。本輪無任何provider呼叫、env／key／DB／DNS／Registry／Production變更。本輪metadata／route測試2 PASS，Typecheck／Build／SEO／diff check PASS；沿用前輪P2的20 focused tests與Lint PASS，不重跑未改動的邏輯。

下一階段成長工作依序：① 用現有接入頁邀請小批自願使用者完成一次座標查詢並回饋卡點；只收非敏感功能結果，不蒐集完整私人對話。② 請社群用既有網站回報與補充現況，重視真實、可確認的公共障礙，不造案件。③ 用既有案件連結分享已確認公開紀錄，註明日期與資料可能變化，無回報不保證安全。④ 整理具來源與範圍的成功案例、更新限制與維護資訊，再擴大邀請。以上僅優先順序，未發送邀請、社群貼文、加入追蹤或新增分享功能。

現在最有價值的發布解除工作是Owner確認獨立Geoapify project的方案／超額與硬停證據，再核准執行卡；Public座標採用不必等待文字搜尋，可先核准本Draft內容的Ready／合併／部署。本輪不執行這些需核准的操作。
