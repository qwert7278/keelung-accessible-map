# 驗證紀錄（2026-09-30）

## 已通過

- `npm run lint`、`npm test`（11 tests）、`npm run build`。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- Vite 建置防線實測拒絕合成 sb_secret_ 環境變數；也檢查 legacy JWT service_role，不輸出憑證值。前端來源與 dist 掃描未發現 server-only key。
- 雲端 SQL `rls-smoke.sql`：匿名建案、管理者 open → in_progress → resolved、改善照片必填、原子歷史、社群建議不改正式狀態、越權上傳/修改/自我升權阻擋。測試 transaction 最後 rollback。
- 雲端 SQL `privileges.sql`：anon/authenticated 內部欄位讀取拒絕、delete/truncate 拒絕、偽造作者/時間/官方來源拒絕、user_metadata 不授權、公開 view、資料庫冷卻時間。最後 rollback。
- 真實 Supabase API `scripts/cloud-smoke.mjs`：27 checks，真實匿名 JWT、Storage 上傳/公開下載、建案、補充；未登入上傳/建案、覆寫照片、一般使用者狀態更新/刪除、管理歷史偽造、hidden columns、自我升權、頻率超限均被阻擋。
- 瀏覽器載入真實 report_feed，375/390px 手機回報步驟切換、座標輸入與無水平溢出；無照片下一步被阻擋，Escape 關閉 dialog；1920px 寬螢幕版面無水平溢出。
- `tests/image-privacy.html` 實際執行 `compressImage`：合成 JPEG 含 EXIF APP1 與測試 GPS marker。2400×1200 → 1920×960、72,407 → 24,173 bytes，輸出 JPEG 不含 APP1/原始 marker。
- Supabase Security Advisor 沒有 WARN/ERROR；只有 private.admin_users/admin_audit/rate_limits 的「RLS 無 policy」INFO，三者刻意預設拒絕前端。參見 [Supabase 說明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。

## 尚未通過的發布門檻

- 正式管理者已透過 Email 確認帳號，並由私有 `admin_users` 清單授權；管理頁顯示「管理權限已驗證」。真實管理者將 QA 案件 open → in_progress → resolved；沒有改善照時拒絕結案，提供合成照片後通過。
- 瀏覽器真實檔案選擇、客戶端縮圖／EXIF 清除、Storage 上傳、改善前後公開照片、社群照片與更新均通過。
- 真實 GPS 授權/精度分支需裝置驗收；手動座標可用。Google Maps 真實 key 未測，OSM 預設保留。
- GitHub repository 已推送至 `https://github.com/qwert7278/keelung-accessible-map`；Vercel 專案已連接，Git 分支 Preview 已部署並通過桌面只讀 smoke test。Preview 受 Vercel 登入保護。手機 375/390px 與 1920px 版面在本機驗收；仍需用真實手機檢查受保護的 Preview，以及真實 GPS 授權/精度分支。
- Vercel 前端環境變數目前只設在 Preview：Supabase URL、publishable key、OSM provider、Demo Mode 關閉；未設定 service-role secret，也未設定 Production 環境變數。`keelung-accessible-map.vercel.app` 網域已解除指派，Production 尚未核准升版。
- API fixture 是明確標示 QA 的合成案件與公開照片；精確 fixture 清單在被 Git 忽略的 `output/cloud-fixture.json`。正式開放前仍須從 Supabase 管理介面刪除案件與測試照片，正式管理者帳號保留。
- Vercel 曾由手動「Create Preview Deployment」流程建立一筆實際標示為 Production 的 deployment（`dpl_65htXXD2vqqzdbkXffEoabTAWUsA`），雖已解除正式網域指派，該 deployment 記錄仍存在。永久刪除需另行確認；在此之前不會升版 Production。

一次性高權限 QA Edge Function 提案被自動審核拒絕，沒有部署。未以替代途徑建立高權限入口，改走正常管理者帳號驗證。

## 重現圖片檢查

執行 `npm run dev`，開啟 `/tests/image-privacy.html` 並點選「執行本機合成圖片測試」。合成 fixture 不含真實人像、個資或真實 GPS。此頁不包含在 production dist。
