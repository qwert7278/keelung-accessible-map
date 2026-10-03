# 路見不平 · Road Tag

路見不平，一起標註。

台灣騎樓與人行道通行回報地圖，支援 22 縣市、368 個行政區。

正式模式使用既有 Supabase，公開顯示民眾回報、位置與照片，正式回報開放台灣 22 個縣市與 368 個行政區。Demo 僅供隔離測試，資料不會送入正式系統。平台不是政府通報系統，也不保證路線安全。

## Demo 與原始碼

唯一正式網址：[roadtag.org](https://roadtag.org/)。唯一發布流程：本機修改與驗收 → 你確認 OK → 推送 GitHub `main` → Vercel 自動部署 Production → 核對正式網址。ChatGPT Sites 已退出正式發布流程，保留為僅擁有者可存取的歷史封存；不合併、不同步、不再發布。程式與 Supabase migration 由同一 repo 版本管理，線上資料與照片留在 Supabase。細節見[單一發布與維護流程](docs/single-release-workflow.md)。

## 功能

- `/` 是路見不平首頁；`/map` 是通行地圖與回報程式。兩者由同一個 Vite build 從本 repo 產生。
- 真實可操作底圖（無 key 時 Leaflet／OpenStreetMap）；正式站只顯示真實回報。
- 地圖標記、案件列表、狀態／行政區／通行程度篩選與既有回報搜尋。
- 三步回報：選位置、照片與問題、確認送出。
- GPS 失敗可手動選點或填座標；相近 30m 的同類未改善案件提醒。
- 原檔 10 MiB、1920px 壓縮；新上傳 WebP／1 MiB，上傳預約、配額與逾期清理。
- 獨立輪椅通行程度、民眾補充與照片歷史。
- `/admin` 展示管理狀態與改善前後；正式管理由資料庫 RLS 控制。
- Supabase adapter、城市 schema、server-side 驗證與原子管理紀錄。
- 手機版、鍵盤焦點、原生 dialog、文字＋圖示狀態、reduced motion。
- 長期可重開的「如何使用」與常見問題、案件分享連結、Beta 回饋與資料申請聯絡方式。

## 本機啟動

需要 Node.js 24 與 npm。

```sh
npm ci
npm run dev
```

開啟終端顯示的 localhost 網址預覽首頁；通行地圖在 `/map`，預設 Demo 可直接使用。

```sh
npm run lint
npm test
npm run build
npm run preview
```

## Agent 工作規則

- [專案記憶：已知坑與標準流程](docs/agent-memory.md)
- [專案短備忘：固定決策與文件入口](docs/PROJECT_MEMO.md)
- 專用 skill：`.agents/skills/road-recall-site/SKILL.md`

## 文件

- [開源評估與授權決策](docs/repo-assessment.md)
- [架構、資料模型與全台擴充](docs/architecture.md)
- [Supabase／Google Maps／Vercel 設定](docs/deployment.md)
- [環境變數範例](.env.example)
- [Technical SEO 架構與路由政策](docs/seo-architecture.md)
- [SEO 基線、驗收與網域遷移](docs/seo-baseline.md) · [SEO QA](docs/seo-qa.md) · [網域遷移清單](docs/domain-migration-seo.md) · [SEO 變更紀錄](docs/seo-changelog.md)
- [資料庫 migration 與安全規則](supabase/migrations/)
- [安全與 PostGIS 下一版準備](docs/security-and-next-iteration.md)
- [實際驗證結果與尚未完成項目](docs/verification.md)
- [Code Review：Beta 準備度](docs/code-review-beta.md)
- [UX Review：Beta 使用流程](docs/ux-review-beta.md)
- [Accessibility Review：鍵盤、觸控與語意](docs/accessibility-review-beta.md)
- [Beta 驗收狀態](docs/beta-verification.md)
- [封閉 Beta 使用者測試清單](docs/user-test-checklist.md)
- [參考專案模式與取捨](docs/reference-patterns.md)

## Roadmap

v0.2：封閉 Beta 回饋、CAPTCHA／跨帳號濫用防護與營運政策細化、Places／反向地理編碼、官方施工 layer 授權查核。

v0.3：PostGIS 附近案件與 viewport 查詢、縮圖、moderation、資料匯出。城市切換及案件游標分頁已實作。

v1：多城市營運與權責分工。無障礙路線導航需獨立資料品質與安全評估，不由回報點自動推論。

## 貢獻

先開 issue 說明問題、預期結果、手機／桌面重現步驟。PR 附驗證結果；不要提交真實通報照片、個人資料、`.env` 或秘密金鑰。資料庫變更使用新的 migration，保持向後相容。

## License

MIT，見 [LICENSE](LICENSE)。第三方套件各自保留授權；地圖資料 © OpenStreetMap contributors（ODbL）。本專案未複製 AGPL 來源程式。
