# 部署 Code Review — 2026-10-02

本次範圍：唯讀核對部署來源、Git 分支、正式網址、ChatGPT Sites 與本地 build。沒有修改應用程式、推送 GitHub、部署、停用網站或調整網域。執行本地 build 只重建被 Git 忽略的產物；新增本 review 文件。

## 結論

目前有兩個獨立公開發布入口，尚未符合「只有一套系統發布」：

1. 主專案 → GitHub `main` → Vercel Production：正式通報地圖應用程式。
2. 另一份 Sites 來源 repo → ChatGPT Sites v6：靜態宣傳首頁，連往 Vercel 地圖。

ChatGPT／Codex 是撰寫與修改程式的工具；GitHub 保存版本；Vercel 建置並提供正式網站。使用 ChatGPT／Codex 寫程式本身不會形成另一個發布系統，但使用 ChatGPT Sites 發布網站會。本專案確實存在後者。

使用者希望的唯一正式發布流程：

```text
本地主專案修改
  → lint / test / build + 本地預覽
  → 使用者確認這次本地版本
  → commit 並推送 GitHub main
  → Vercel 自動建置 Production
  → 核對 Production commit、正式網域與主要路由
```

「推送 GitHub」必須指定更新 `main` 才代表這個正式發布入口；推送其他分支通常建立 Preview。Vercel 部署成功且正式網址通過驗收，才算上線完成。

## 即時證據

| 項目 | 2026-10-02 核對結果 |
| --- | --- |
| 主專案 | `C:\Users\qwert\Desktop\Road Recall system` |
| GitHub repo | https://github.com/qwert7278/keelung-accessible-map |
| 本地目前分支 | `codex/homepage-map-markers` |
| 本地 HEAD | `0cf67f059ba3f7b9238ab7036b4b8b9eb484b7ec` |
| GitHub API 回讀 main | 同上 |
| 本地 main branch ref | `1bc0d7a8764f94963b4f72935c06a29418422208`，落後於遠端 |
| Vercel Production | `dpl_8B8Kgp1K25PSJE8HwS8ggYFw3UwT`，READY，source=`git`，ref=`main`，SHA 同 GitHub main |
| 正式網址 | https://keelung-accessible-map.vercel.app/ ，已指派到上述 Production |
| Vercel Preview | `dpl_DE1KMuvY1BX4Mv9CBMsBNBKhvd7D`，READY，來源為功能分支，SHA 同上；它是同一 Vercel 專案的預覽，並非第二套原始碼 |
| ChatGPT Site | `appgprj_6abca6ec70ec8191a60df8421aa7237c`，public / active |
| ChatGPT Site URL | https://keelung-accessible-guide.mason7278.chatgpt.site/ |
| Sites live deployment | `appgdep_6abe4ef11cf88191ad5cda49c950973e`，publish / succeeded，v6 |
| Sites v6 source SHA | `9fb92574c67c4a2c110949e2e5c372b30ccda329`，來自另一個來源 repo |
| Sites 自訂網域 | API 回讀為空 |

不同 SHA 本身不是內容差異的充分證明；本次另核對 live HTML，Vercel `/` 為 React app entry，Sites `/` 為獨立靜態宣傳首頁，因此確認不是同一份網站產物。主專案 build 腳本亦沒有 Sites 同步步驟。

## Review findings

### [P1] ChatGPT Sites 仍是獨立公開發布入口

證據：`sites-public-hub-source` 與 `sites-public-hub` 各自含 `.git`／`.openai/hosting.json`。Sites 綁定來源追蹤自己的 `dist/index.html` 與圖片；主 repo 的 `package.json` build 和 `.github/workflows/ci.yml` 均沒有將主 repo 版本同步發布到 Sites 的步驟。Live Sites v6 有自己的來源 SHA。

影響：在本地修正並推送 GitHub main，不會更新 ChatGPT Sites 的首頁。兩邊可能持續呈現不同內容。

建議：以 GitHub main → Vercel 作唯一正式網站發布管道。停止獨立維護 Sites 內容；對現有 Sites 公開網址，另行執行經使用者決定的停用或轉址措施。本次不變更公開站點。若要求「唯一發布系統」，新增雙平台 publisher 仍然會保留兩個發布目標，不是最直接的解法。

### [P1] 尚未提交的首頁改動不能通過目前正式 build

來源：`index.html`、`vercel.json:9`、`scripts/seo-check.mjs:51`。

第二次執行 `npm run build`：TypeScript、Vite bundle 與 SEO assets 生成完成；最後 SEO check 退出碼 1，回報：

```text
Homepage language must remain zh-Hant-TW.
Homepage title/topic is missing.
Homepage og:type must be website.
WebSite JSON-LD is missing.
Vercel rewrite /admin -> /index.html is required.
```

本地已把 `index.html` 換成靜態首頁，地圖入口放到未追蹤的 `map.html`，並把 `/admin` 改寫到 `/map.html`；SEO checker 仍要求舊版 `/admin` → `/index.html`。這是首頁整合尚未完成的證據。應補齊首頁 metadata，並依新的路由架構更新 checker；不能只刪掉檢查來讓 build 通過。

首次 build 遇到 `dist/404.html` 的暫時 EBUSY 鎖定；重試後通過 Vite 階段，故最終可重現的阻擋是上述五項 SEO／路由檢查失敗。

影響：目前工作樹直接發布，Vercel 的 `npm run build` 預期會失敗。當前線上 Production 是之前已成功的 commit，不受本地未提交修改影響。

### [P2] 本地所在分支與本地 main ref 容易造成發布版本誤判

證據：本地目前在 `codex/homepage-map-markers`，其 HEAD 等於遠端 main，但本地 `main` ref 仍是舊 commit；同時有大量未提交／未追蹤檔案。

影響：直接一般 `git push` 可能只更新功能分支；切換落後的本地 main 也可能回到舊來源。`map.html` 與 `public/images/` 若未精確加入此次 commit，新首頁的 build input／圖片也不會出現在 GitHub。

建議：保留現有工作，先完成本地整合及驗收；發布前精確確認 commit 內容與遠端 main，再明確更新 GitHub main。不要直接切換、reset、整批 stage 或推送目前未審查的工作樹。

## 路由與 CI 核對

| 正式路由 | 即時 HTTP 結果 | 說明 |
| --- | --- | --- |
| `/` | 200 | 現行 React 地圖 app entry；不是本地新靜態首頁 |
| `/admin` | 200 | 現行 React app entry，具 `X-Robots-Tag: noindex, nofollow, noarchive` |
| `/map` | 404 | 現行 commit 尚未提供這個入口；本地新架構才準備加入 |
| Sites `/` | 200 | 靜態宣傳首頁，連往 Vercel 根網址的現行地圖 |

Vercel HTTP 結果由 Vercel 官方 connector fetch 回讀；Sites HTTP 由 Node fetch 回讀。一般 web fetch／PowerShell SSL 在此環境未成功，沒有據此判定網站故障。本次沒有執行瀏覽器互動驗收或操作真實通報資料。

GitHub Actions 的 Quality workflow 只執行安裝、audit、lint、test、build 與 SEO check，沒有第二個網站部署 job。GitHub API 顯示 main 最新 Quality run 已成功：

https://github.com/qwert7278/keelung-accessible-map/actions/runs/36861165588

這個成功屬於已提交的 `0cf67f0`，不代表本地未提交的新首頁通過。GitHub API 回讀 main `protected=false`；workflow 本身不提供 main 發布前的強制檢查閘門。若日後需要技術上強制禁止未通過檢查的版本上線，需另核對／設定規則，不可把 Quality job 的存在當成已具此保證。

Vercel `get_project` connector 的 schema／adapter 欄位不一致，本次未成功讀回完整 project 設定；Production 分支與發布來源結論來自實際 deployment metadata 和 alias，未宣稱已核對所有帳號權限、Deploy Hook 或 Dashboard 手動發布入口。

## 建議的收斂順序

1. 完成主 repo 的單一首頁、`/map`、`/admin` 與 metadata 整合，修到 build 通過。
2. 本地檢查與預覽完成後，由使用者確認此次版本。
3. 明確推送 GitHub main，核對 Vercel READY、SHA 及正式路由。
4. 處理舊 ChatGPT Sites 公開入口，避免繼續展示另一份獨立版本；停用／轉址屬另一次公開站點變更。

本次已完成部署 review；未實作上述修正或發布變更。

## 後續存取變更與重新評估（2026-10-02）

使用者先明確要求只保留 GitHub main、廢止 ChatGPT Sites。依此授權，已把該 Site 從 public 改為 custom，清空所有非擁有者與群組允許名單；API 回讀 revision 3、只有 owner 可存取。未登入 HTTP 驗證為 401，Vercel 正式根網址仍為 200。Site v6 與來源歷史沒有永久刪除，亦未新增發布。

使用者隨後要求先分析兩個平台再決定保留哪個，因此暫停進一步刪除、退役整理與設定變更。上述存取限制保留，原 review 的 public 狀態為變更前的歷史快照。

ChatGPT Sites 確實提供已保存版本與來源 commit；本案 v6 對應另一個來源 repo 的 `9fb9257`。選擇 GitHub main → Vercel 的理由是符合本地修改、GitHub 版本追蹤與單一發布流程，並非 Sites 完全沒有版本控制。官方產品說明：https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites 。
