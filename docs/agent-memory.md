# Road Recall 專案記憶：已知坑與標準流程

更新日期：2026-10-02  
適用範圍：`C:\Users\qwert\Desktop\Road Recall system` 的網站、GitHub、Vercel、ChatGPT Sites 與驗收工作。

這份文件記錄已觀察到的專案事實與重複踩坑。它不是把舊部署狀態永久當成現況；每次執行時仍須重新檢查分支、commit、部署與正式網址。

## 最新決策：只保留 GitHub main → Vercel（2026-10-02）

日常入口改為短版 [PROJECT_MEMO.md](PROJECT_MEMO.md)，此檔保留歷史細節；專案 skill 已改為單一發布規則。未來新網域／Cloudflare DNS 計畫記在 Memo 與網域遷移清單，尚未執行。

使用者已明確批准封存 ChatGPT Sites，且要求不合併兩站。唯一正式發布流程是本地主 repo 修改 → 檢查／預覽 → 使用者確認本次版本 → 推送 GitHub `main` → Vercel Production → 正式網址驗證。Supabase 保留既有服務；schema／RLS migration 與程式在同一 repo 追蹤，線上資料與密鑰不進 Git。一般網站 push 不自動套用 migration。

ChatGPT Sites 僅保留 owner 存取的歷史版本，不再編輯、同步、建立 publisher 或發布；舊 Site 目錄不作正式來源。此最新決策取代舊文件／skill 內的雙平台同步與 Sites 發布要求。封存、維護與驗證紀錄見 [single-release-workflow.md](single-release-workflow.md)。不要為了此次封存修改現有未提交產品內容、切換／重置分支、刪除資料或推送。

## 不可違反的專案原則

1. **唯一可編輯來源是本目錄的 Git 專案。** 日常修改只能落在這份工作樹；`dist/`、Preview 輸出與歷史 Site 封存不得各自手改。正式來源為 GitHub `main`，正式發布端為 Vercel。
2. **先確認路由與頁面來源再改 UI。** 本地尚未提交的 `index.html`／`map.html` 架構不代表已部署；先查 `package.json`、`vite.config.ts`、`vercel.json`、Git 狀態和正式網址。過去 `site-homepage/` 與 Sites 來源目錄為歷史複本，不再維護。本次封存不合併、修改或發布既有本地產品內容。
3. **把不同網址視為不同部署，逐個核對。** GitHub 主幹更新、Vercel Preview、Vercel Production、ChatGPT Site 是不同狀態。只有在正式網址載入並核對預期內容後，才可以說已部署上線。Preview 通過不等於 Production 通過；Git push 成功也不等於任何網站已更新。
4. **所有上線內容由主 repo 的指定 commit 產生。** 發布紀錄要留 Git commit SHA、目標、部署 URL、狀態和驗收結果。不得在外部 Site 編輯器直接做只存在雲端的內容改動。
5. **對外網址可能共用真實資料。** 未確認是 Demo／獨立 QA 專案前，不要在 Production 建案、上傳照片、寄 magic link、更新狀態或刪除資料。優先用 Demo 或隔離測試環境，測試後確認清理結果。

## 已知坑與避免方式

### 1. 把不同頁面／複本誤當同一首頁

- 主 repo 現在以 Vite `index.html` 提供宣傳首頁 `/`，以 `map.html` 提供地圖 SPA build entry，再由 `/map`、`/admin` rewrite 至同一 app。這是本機變更，未部署前 Production 仍保留舊路由。
- 舊 `site-homepage/` 與 Sites 綁定 repo 是歷史封存，不得再當編輯來源或發布端。
- Vercel 由主 repo `npm run build` 產生 `dist`；首頁與地圖 entry 現已加入同一 build。需跑 build/SEO 檢查與本機路由驗收後再交使用者檢視。
- Sites 有獨立的 AppGen 專案 ID／綁定來源與發布流程，來源推送曾遇到 TLS/Schannel、HCS、HTTP 500 等錯誤。錯誤時要回報受阻狀態與最後成功版本，不可手動另建一份副本冒充同步。
- 2026-10-02 已決定封存 Sites，只保留 GitHub main → Vercel，不再執行雙平台同步。本地未提交的新首頁／路由是另一件工作，需另行本地驗收後才可發布。

### 2. 分支、主幹、推送與正式網站混為一談

- 先記錄 `git status --short`、目前 branch、`HEAD`、`origin/main`。推送後再次讀取遠端 SHA，不能只根據 push 命令的輸出推測成功。
- 推分支只會更新分支。主幹更新要驗證 `origin/main`；Production 更新則要看 Vercel Production deployment 與正式網址。
- 使用者已明確表示「部署上線」是正式網站，不要再把 Preview 或只推分支當作完成。
- 不要將使用者在工作樹裡的修改、圖片、規格文件一併提交；精確檢查 diff，只 stage 此任務的檔案。
- Production 部署完成後至少檢查首頁、主要操作路徑、手機版和必要的 SEO/錯誤狀態，並確認頁面內容對應預期 commit。

### 3. 驗收不能停在程式編譯

主 repo 目前的常用檢查：

```powershell
npm run lint
npm test
npm run build
```

涉及瀏覽器 UI 時，另以本機或 Preview 驗證實際路由、桌面/手機、鍵盤和頁面文字；涉及後端授權時須有負向測試。單純文件/skill 變更不必為了形式重跑完整應用程式測試，但要驗證 Markdown 連結、檔案路徑和 skill 格式。

### 4. Supabase 權限和資料安全

- 公開端只用 Supabase URL 與 publishable key。service-role/secret key 不可出現在 `VITE_*`、瀏覽器 bundle、靜態首頁或提交的 `.env`。
- anon/authenticated 的 table/column grants 要最小化；RLS 是最後授權層。公開 API 不曝露 `created_by` 或 `admin_note`；一般使用者不能改案件正式 status、刪除/截斷資料、改管理欄位或升權。
- 社群建議只新增補充紀錄，不可直接改正式案件狀態。管理操作須由私有 admin 權限驗證，改善為 resolved 必須附改善後照片。
- `private.admin_users`、`private.admin_audit`、`private.rate_limits` 對一般角色刻意預設拒絕，不能為了消除 Security Advisor INFO 而開放讀取。
- Migration 向前新增；不要為回復功能而刪改已套用 migration。涉及線上清除先精確界定資料與備份，並做唯讀確認。
- 真實資料 QA 不能靠假設。明確標記合成資料，測試後檢查案件、補充、audit 和 Storage 物件是否都清乾淨。

### 5. 圖片與位置隱私

- 上傳前在瀏覽器縮圖、壓縮，並透過重新解碼/繪製移除 EXIF/GPS metadata；驗證輸出尺寸與 metadata，不只看 UI 顯示。
- 對外樣本照片需有公開使用權；街景截圖等來源需先確認權利，不能因為使用者能看見就推定可再發布。
- Demo 案件明確標示虛構；不把合成資料寫進 Production。

### 6. OSM 與外部服務

- OpenStreetMap 是預設地圖來源；Google Maps 僅在明確設定 provider 環境變數時啟用。
- 遵守 OSM tile policy，不做大量預抓/離線打包。外部服務 token 只放在必要的環境變數，並限制來源與權限。
- `localhost:5173`、`5174`、`4175` 都曾用於不同本機預覽；確認終端程序、專案路徑、port 和目前載入 commit，不以 port 推斷版本。

### 7. UI 回饋與已知產品要求

- 首頁敘事圖文要保有沉浸尺度、16:9 圖片與標題/說明；桌面交錯排列、手機改單欄。障礙 carousel 圖片來源、版權和 alt text 都要明確。
- 全幅 footer、首頁可見狀態點、回到首頁入口、Threads icon、回饋彈窗與政策連結都是既有要求；每次改首頁需回歸檢查，不要只檢查地圖頁。
- 文案描述這是民眾公共回報與紀錄平台，可協助政府掌握問題；不可暗示案件已正式送達政府、政府正在處理或地圖能保證安全導航。
- 管理者操作與公開瀏覽分清楚；主操作按鈕 hover/focus 必須保持可讀，不能讓文字因變深背景而消失。

## 每次工作流程

1. 讀本檔與 repo-local skill，確認 user 要改的是首頁、地圖、管理頁、後端或發佈。
2. 檢查 Git branch/status/SHA、路由/build 入口、涉及的部署目標；不覆蓋未提交工作。
3. 在唯一主 repo 原始碼中做最小、可審查修改；外部平台只作發布端。
4. 執行與改動匹配的 lint/test/build 和安全檢查。
5. 本機先驗證指定頁面；部署時按 Preview → 使用者驗收 → Production，或依當次已授權的發布流程執行。
6. 唯一正式目標 read-back：Vercel Production 與正式網址，核對 GitHub main SHA。ChatGPT Sites 不在發布清單內。
7. 結尾回報：改了哪些原始碼/文件、驗證結果、主幹/Preview/Production/Sites 各自狀態、尚待使用者提供的外部設定（若有）。

## 2026-10-01 歷史發佈基線

- 主 repo：`C:\Users\qwert\Desktop\Road Recall system`。
- `HEAD` 與 `origin/main` 當次檢查均為 `684b6d1fe62bece1a2086152ef64cec6f933f887`，branch 為 `codex/homepage-map-markers`。這只是歷史觀察值，下次須重新查。
- Vercel 預設從 Git repo `npm run build` 建置 Vite `dist`；`vercel.json` 以 SPA fallback 支援 `/admin` 等路由。
- ChatGPT Sites 有另一個 Site ID 和來源 repo；已觀察到的來源 push 故障及版本差異表示目前不能宣稱兩個正式首頁已自動一致。
- 工作樹有使用者修改與未追蹤檔案；本次新增文件時不應順手清理、重置或提交它們。

## 2026-10-02 封存決策前的歷史核對

使用者確認的標準流程是：本機修改 → 本機檢查/預覽 → 使用者確認 OK → 直接推 GitHub `main` → Vercel Production 自動部署。沒有使用者對該次本機版本的確認前，不推送或發布。使用者不接受人工維護的第二套首頁；ChatGPT Site 若保留，必須成為從主 repo 產生的自動發佈產物。

本次只讀核對結果（2026-10-02）：

- GitHub API 回讀 `main` 為 `0cf67f059ba3f7b9238ab7036b4b8b9eb484b7ec`（commit: `feat: strengthen guided tour focus cues`）。本機目前 branch `codex/homepage-map-markers` 的 HEAD 也是此 SHA；本機 `main` branch ref 仍落後，且本機 Git remote 連線讀取遇到 Schannel credentials error。GitHub API 回讀成功，遠端狀態以該回讀值為準。
- Vercel 最近的 Production deployment 為 READY，Git ref `main`、commit SHA 同上。這表示 Vercel Production 與目前 GitHub `main` commit 相符；每次正式發布仍須再次核對正式網址。
- ChatGPT Site 現行 live Site version 為 v6，狀態 succeeded，對應 Site 綁定 repo commit `9fb92574c67c4a2c110949e2e5c372b30ccda329`，並非 GitHub `main` 的 commit。**截至本次檢查，兩邊不同步。** Sites 發布流程要求綁定來源 repo 中已有已推送的 commit，因此要達到本機單一原始碼，須先在主 repo 製作可重現的 Site publisher，從使用者已核准的主 repo 版本產生並發布 Site 封裝；不可直接在 Sites repo 編輯產品內容。
- `http://127.0.0.1:5173/` 本次無法連線，沒有在執行中的本機 dev server。開始本機 review 時須由主 repo 啟動並確認正確路由。
- 本次未推送 GitHub、未部署 Vercel、未發布 ChatGPT Site。發布前須保留使用者確認閘門。
