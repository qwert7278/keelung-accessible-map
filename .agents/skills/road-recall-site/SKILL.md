---
name: road-recall-site
description: Maintain only the Road Recall project in this repository, including local preview, scoped code review, Supabase migrations, and GitHub main to Vercel releases. Use its project memo; ChatGPT Sites is archived.
---

# Road Recall 維護

僅適用 `C:\Users\qwert\Desktop\Road Recall system`。先讀 [專案備忘](../../../docs/PROJECT_MEMO.md)；按任務需要讀其中連結的流程／網域文件，不把其他專案套入此流程。

## 來源與範圍

- 唯一可編輯來源是本 repo；GitHub `main` 是唯一正式版本，Vercel 是唯一網站發布端。ChatGPT Sites 已封存為 owner-only，不編輯、不合併、不建立 publisher、不再發布。
- 開工核對 Git branch／status／HEAD／遠端 main、相關 diff、build entry 和實際路由。保留其他未提交工作；不整批 stage、reset 或擅自切換落後 main。
- 不手改 `dist/` 或 Sites 歷史目錄。不要以 localhost port 推斷來源；啟動／複用預覽前確認目錄與頁面。
- 保持小幅修改、現有架構與清楚文件；避免新增不必要框架、服務及第二套維護規則。

## 本地驗證與正式發布

- 本地修改 → 適當檢查與預覽 → 使用者確認此次版本 → 精確提交並更新 GitHub `main` → 驗證 Vercel Production。除非本次已有明確發布授權，預覽後不要直接推送。
- app 變更跑 lint／test／build；UI 另核對指定頁面桌面與手機，資料庫變更加負向授權檢查。文件-only 不需重跑 app tests。
- push 後回讀遠端 main SHA，確認 Production READY、SHA 及正式網域頁面；Preview 或 push 成功不等於上線完成。發布紀錄列 commit、URL、測試及 migration 狀態。

## Supabase 與產品約束

- Database／Auth／Storage 留在既有 Supabase；migration 和授權測試在本 repo。網站 push 不自動修改資料庫；schema 變更新增向前相容 migration，先隔離驗證再按批准計畫套用，勿重跑初始化／reset Production。
- 公開端僅用 URL／publishable key；service-role／secret 不入 Git、前端或 `VITE_*`。維持最小 column grants、RLS、管理者權限，公共資料不暴露 `created_by`／`admin_note`，一般使用者不能升權、正式 status mutation 或刪除資料。
- 用 Demo／隔離 QA 驗證寫入，勿操作共享 Production 真實通報／照片／Auth 郵件。維持圖片壓縮與 EXIF 移除、已確認的圖片使用權。
- OSM 為預設；Google Maps 僅明確配置時啟用。維持可及性，不暗示政府已受理或保證導航安全。

## 未來網域

- Cloudflare DNS／可能的 proxy 是未執行計畫；網站仍留 Vercel，不另建站點。網域未選定或未授權切換前不修改 DNS／TLS。
- 確認 DNS-only 和 proxy 差別；以當時官方文件核對相容性，proxy 時檢查來源憑證與 Full (strict)。同步處理 SEO、轉址及 Supabase Auth allowlist，依 [網域清單](../../../docs/domain-migration-seo.md) 驗收。

回報本地／GitHub main／Vercel Production 的獨立狀態、驗證與限制；Sites 只回報封存狀態，不加入發布清單。
