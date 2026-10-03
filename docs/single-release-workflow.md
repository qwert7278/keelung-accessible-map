# 唯一正式發布與維護流程

決策日期：2026-10-02（Asia/Taipei）。使用者要求只保留 GitHub version，封存 ChatGPT Sites，不合併兩站，也不改動其他產品與資料庫部分。

## 保留的系統

| 用途 | 唯一位置 |
| --- | --- |
| 本地編輯來源 | `C:\Users\qwert\Desktop\Road Recall system` |
| 版本控制 | https://github.com/qwert7278/keelung-accessible-map ，正式分支 `main` |
| 網站正式發布 | 既有 Vercel 專案 `keelung-accessible-map` |
| 正式網站 | https://roadtag.org/ |
| 資料庫服務 | 既有 Supabase，保留 Database／Auth／Storage |
| 資料庫變更版本 | 同 repo 的 `supabase/migrations/`；授權檢查在 `supabase/tests/` |

ChatGPT／Codex／Copilot 可協助修改主 repo，但不另建網站或發布來源。Vercel Preview 是同專案的測試部署，不是第二套維護系統。

## 日常修改與發布

1. 檢查目前 branch、HEAD、遠端 main 及未提交內容；保留現有工作，不 reset 或整批 stage。
2. 只在主 repo 修改該次批准的功能。不要編輯 `dist/`、封存目錄或雲端另一份首頁。
3. 執行適當驗證；應用程式變更跑 `npm run lint`、`npm test`、`npm run build`，UI 另做本地桌面／手機操作驗收。
4. 讓使用者確認此次本地版本，精確提交本次相關檔案；不要順手帶入其他未完成內容。
5. 明確更新 GitHub `main`。一般功能分支 push 是 Preview，不是正式發布。發布前確認不覆蓋遠端更新。
6. 回讀 GitHub main SHA，等待 Vercel Production READY，核對 Production SHA 與正式網址；失敗就報告受阻，不能把 push 成功當已上線。
7. 記錄 commit、部署 URL、驗證結果；涉及資料庫的發布另記錄 migration 名稱及套用狀態。

## Supabase 如何跟版本一起管理

- GitHub 保存應用程式、migration SQL、測試與不含密鑰的設定範例。migration 目前已在主 repo 中；不需要另建第二個版本庫。
- 一般網站 push 只更新網站，不自動執行 SQL 或改變 Supabase 資料。
- 若功能需要 schema／RLS 變更，新增向前相容的 migration，先在隔離測試環境驗證與做負向授權檢查，再按當次明確批准的部署順序套用。不可重新執行初始化、reset Production 或刪改已套用 migration。
- 線上通報資料、Auth 帳號與照片留在 Supabase；備份／資料復原與 Git 程式回復是不同工作，不把個資或 Production dump 放進 GitHub。
- `.env.local` 保存本機必要設定；Vercel 保存部署環境設定。只用公開 Supabase URL／publishable key；service-role、資料庫密碼與 access token 不可放 Git 或 `VITE_*`。
- 發布紀錄同時列明 app commit 和資料庫 migration，讓工程師能判斷版本相容性。前端回復不等於資料庫回復。

## ChatGPT Sites 封存方式

此處的「封存」是可復原的管理狀態：關閉公開存取，只保留擁有者，標題加上已封存；保留版本歷史，不永久刪除。平台 Site 物件仍可能顯示 `active`，不代表仍公開。

- Site ID：`appgprj_6abca6ec70ec8191a60df8421aa7237c`。
- 原標題：`基隆好行｜無障礙通行地圖`。
- 封存標題：`【已封存】基隆好行｜無障礙通行地圖`。
- 歷史版本：v6，來源 commit `9fb92574c67c4a2c110949e2e5c372b30ccda329`。
- 歷史網址：`https://keelung-accessible-guide.mason7278.chatgpt.site/`。
- 停止編輯／發布／同步；沒有 Site automation 排程。除非使用者另有明確指示，不恢復公開。
- `sites-public-hub/`、`sites-public-hub-source/` 保留原位作歷史復原，已加入主 repo `.gitignore`，避免誤提交巢狀 repo。`site-homepage/` 已追蹤的歷史資料不刪除，README 標示封存。

## 本次操作與邊界

本次只調整 Site 標題與既有 owner-only 存取的核對，以及 README／維護文件／封存目錄 ignore 規則。沒有合併、修改應用程式或資料庫，沒有套用 migration、推送 GitHub 或觸發 Vercel 部署。現有未提交首頁／地圖變更保留原狀，不代表此次已批准發布。

GitHub main 與 Vercel 的已核對基線為 `0cf67f059ba3f7b9238ab7036b4b8b9eb484b7ec`；本地目前在 `codex/homepage-map-markers`，本地 main ref 落後。此為歷史觀察，不可直接切換或 reset；下次實際發布先重新核對。

封存完成後驗證：

- Sites API 回讀標題為 `【已封存】基隆好行｜無障礙通行地圖`，access=`custom`，允許使用者只有 owner，群組與外部訪客均為 0，排程為空。版本仍為 v6，未新增部署。
- 舊 Site 未登入 HTTP 回應 401；Vercel 正式根網址 HTTP 回應 200。
- GitHub main API SHA 與最近 Vercel Production SHA 同為上述 `0cf67f0`，Production READY，沒有觸發新部署。
- 封存前後 65 個網站來源／public 資產／build 設定／CI／Supabase 檔案 SHA-256 完全一致。
- `git check-ignore` 確認兩個歷史 Sites 目錄不再進入主 repo 提交清單；文件 diff whitespace 檢查通過。
- 本次僅文件與封存存取／標題調整，不重跑應用程式測試；這些結果不宣稱目前未提交的產品變更已通過 build 或發布驗收。
