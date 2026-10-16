# PR #33／#34 隔離整合驗證

日期：2026-10-16。這是整合準備與可套用 patch；尚未合併任何 PR、未啟用文字搜尋。

## 固定驗證版本

- main／merge base：`13331f9307a3acb7a8ab14ef507e3eabd5da5116`
- #34 修正後：`0ae16ea5fd78bc49f2b00d4b598e0f8a87e4d164`
- #33 reviewed head：`8a66b564291593552bf274630e004dcebf3132d0`

使用 `git merge-tree --write-tree --name-only` 及 archive 建立忽略的隔離快照，沒有 checkout、修改 index、改動 #33 分支或其他 worktree。共同修改五檔：README.md、docs/public-mcp-connect-guide.md、index.html、src/public-mcp-onboarding.test.ts、src/public-mcp-onboarding.ts。實際衝突只有最後的 onboarding.ts 與 index.html；其餘三檔保留 Git 自動整合結果。

## 建議整合順序與可重現 patch

1. Owner 核准後先合併 #34；保留座標範例、簡化首頁與 `/mcp`，文字搜尋仍關閉。
2. 從該 main 建立獨立整合分支，合併上述 #33 reviewed head，勿直接覆寫或重設 #33。
3. 只把兩個衝突檔案還原成上述 #34 修正版。其他已自動合併檔案全部保留；`mcp/index.html` 也保留 #34 版本。
4. 在這個明確 baseline 上執行：

```sh
git restore --source=0ae16ea5fd78bc49f2b00d4b598e0f8a87e4d164 --worktree -- index.html src/public-mcp-onboarding.ts
git apply --unidiff-zero --check docs/patches/mcp-guide-geocoding-integration.patch
git apply --unidiff-zero docs/patches/mcp-guide-geocoding-integration.patch
```

5. 檢查差異、完成 focused tests 與 CI，再以獨立 PR 交 Owner 審查。以上命令只供未來隔離整合分支使用；本輪沒有對真正開發分支執行合併。若 main 或任一 reviewed head 改變，須重新確認衝突與 patch，不能盲目套用。

Patch 只修改 index.html、mcp/index.html、src/public-mcp-onboarding.ts：保留新首頁／教學頁與無網路網址複製，補回雙旗標能力文字、候選位置確認範例、Geoapify 隱私及來源標示。預設 HTML 仍明示文字搜尋未開放。公開 MCP 與文字旗標必須同時為 true 才顯示文字搜尋；其餘三組旗標維持座標模式。網址複製不受旗標或服務健康影響。

## 實際驗證

- Delivered patch 在隔離 merge-tree 快照 `git apply --check` 及實際套用 PASS；兩衝突檔沒有 conflict markers。
- 三個 focused test 檔：16 PASS，含四組旗標、無 URL 按鈕的首頁、URL 直接複製、429／503／offline／timeout、Clipboard deny、listener cleanup、CLI／TOML／JSON、metadata。
- `npx tsx tests/mcp-public-geocoding.ts`：PASS。使用 fixture／mock 驗證三工具、地址／地標／商家／巷弄／22 縣市、候選確認、配額先於 I/O、kill switch、401／429／5xx 不重試、abort／deadline／provider timeout、lease 釋放及隱私。真實外部呼叫 0；不宣稱真實地理定位準確度驗收。
- server/mcp/public.ts、server/location/geoapify.ts、server/roadtag/service.ts 與 #33 reviewed head byte-identical；沒有改寫 provider、公開 quota 或 Alpha。
- 隔離快照 `npm run build`（Typecheck／Vite／SEO）：PASS。既有大型 chunk 警告，不影響完成；#34 本身 Lint、Typecheck、Build、SEO、diff check 亦 PASS。

## Review、邊界與回滾

本輪人工靜態 review：P2 網址網路依賴、P3 分享描述已修；整合衝突已提供實際 patch。未發現新增未修 P0／P1；這不是獨立子 agent 審查。保留 exactly three read-only tools；沒有 env、key、DB、quota、Registry、DNS、正式案件或 Production 變更。

#34 仍為 Draft，Ready／merge／Production 部署需要 Owner 核准；#33 合併與 Public Geoapify 的 key／成本上限／實際呼叫／啟用另需核准。此 patch 測試通過不代表正式文字搜尋已上線。回滾 #34 為 revert 該 PR，經既有 main→Vercel 發布；不需 migration 或資料清理。未套用的整合 patch 可直接不採用；未來整合 PR 需另列其發布回滾。
