# 基隆好行 · Keelung Accessible Map

看見障礙，留下紀錄，讓城市一步一步更好走。

可迭代的無障礙通行回報地圖，從基隆開始，資料模型保留多城市擴充。

**Beta 準備中**：Demo 模式的初始案件為虛構測試資料，操作只保存在本瀏覽器；連接 Supabase 的正式模式會公開顯示民眾回報、位置與照片。平台不是政府通報系統，也不保證路線安全。

## Demo 與原始碼

正式網址：[keelung-accessible-map.vercel.app](https://keelung-accessible-map.vercel.app/)。目前變更先部署至受保護的 Vercel Preview；Production 發佈需另行人工確認。

## 功能

- 真實可操作底圖（無 key 時 Leaflet／OpenStreetMap），8 筆清楚標示的基隆示範案件。
- 地圖標記、案件列表、狀態／行政區／通行程度篩選與既有回報搜尋。
- 三步回報：選位置、照片與問題、確認送出。
- GPS 失敗可手動選點或填座標；相近 30m 的同類未改善案件提醒。
- 10 MB 圖片限制、1920px 壓縮、預覽、上傳／儲存進度與錯誤處理。
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

開啟終端顯示的 localhost 網址；預設 Demo 可直接使用。

```sh
npm run lint
npm test
npm run build
npm run preview
```

## 文件

- [開源評估與授權決策](docs/repo-assessment.md)
- [架構、資料模型與全台擴充](docs/architecture.md)
- [Supabase／Google Maps／Vercel 設定](docs/deployment.md)
- [環境變數範例](.env.example)
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

v0.3：城市切換、PostGIS 附近案件與 viewport 查詢、分頁、moderation、資料匯出。

v1：多城市營運與權責分工。無障礙路線導航需獨立資料品質與安全評估，不由回報點自動推論。

## 貢獻

先開 issue 說明問題、預期結果、手機／桌面重現步驟。PR 附驗證結果；不要提交真實通報照片、個人資料、`.env` 或秘密金鑰。資料庫變更使用新的 migration，保持向後相容。

## License

MIT，見 [LICENSE](LICENSE)。第三方套件各自保留授權；地圖資料 © OpenStreetMap contributors（ODbL）。本專案未複製 AGPL 來源程式。
