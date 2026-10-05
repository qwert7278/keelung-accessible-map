# Storage 真實上傳 RLS 修復與驗證

日期：2026-10-04。輸入任務：根目錄 `ROAD_TAG_STORAGE_RLS_REAL_UPLOAD_FIX_AGENT_2026-10-04.md`。

## 根因與修正

使用者提供的 iPhone Safari/log 證據顯示 JPEG encode 與 reservation 已成功，而 Storage INSERT RLS 在 final metadata 尚未存在時要求 mimetype/size，產生 42501。本次正式環境唯讀回查確認該函式仍有此條件；本次沒有重跑 iPhone，也沒有把 synthetic SQL 當成真實上傳成功。

向前 migration：`supabase/migrations/20261004133155_storage_upload_lifecycle_rls.sql`，由官方 CLI migration new 建立；正式套用後將 timestamp 對齊 Supabase migration history，不修改 migration 內容或歷史 migration。

- INSERT：auth.uid 存在、owner 匹配、`.webp/.jpg`、exact active reservation、reservation owner 與有效期。函式保留舊 signature，metadata 參數不再用於 INSERT 授權。
- Bucket：1,048,576 bytes，只允許 image/webp、image/jpeg；讓 Storage API 在 request 層執行限制。
- Claim：鎖定 active reservation，驗證最終 storage.objects 的 bucket/path/owner、extension ↔ MIME 及 size 1–1,048,576，再標 committed。報告、community update、admin after photo 的原有 claim trigger 都會套用，不修改正式 status 權限。
- UPDATE/DELETE 政策不新增；overwrite/upsert 不開放。既有已 committed／被案件引用的照片不重驗、不改寫、不刪除。
- 現有 WebP/JPEG encoder、Safari fallback、signed prepare-photo gate、quota/cooldown 與 orphan cleanup 保留。
- 上傳失敗顯示「照片上傳沒有完成，請稍後重試。」，不展示 HTTP status 或 Storage/RLS 等工程文字。

final metadata 檢查驗證 MIME/大小與 reservation 關係，不等於伺服器 image decode/content sniffing。此修復不擴張到 VLM 或新影像管線。若有人故意用錯 MIME 上傳，該物件無法 claim 成案件，保留 active intent 由既有到期清理處理；不能用 overwrite 更換證據。

## 本地檢查結果

- `npm test`：20 files / 176 tests passed；Node location/upload/cleanup runtime checks 通過。
- `npm run lint`：通過。
- `npm run build`：通過，SEO check 通過；既有 HEIC 大 chunk warning 仍存在。
- `npm run test:db`：75 checks passed，包含新版 migration、INSERT metadata 不完整、final MIME/size 不符、ownership、expiry、immutable object、claim、cleanup、quota 與既有 admin flow。
- `git diff --check`：通過。

SQL regression 刻意區分「INSERT 可接受不完整 metadata」與「claim 必須有正確最終 metadata」。新增 NULL metadata → report insert 拒絕且回滾 → 模擬 final metadata 持久化 → 同 reservation 建案成功的檢查。PGlite 沒有 Storage HTTP service，無法證明 bucket 的 HTTP MIME/size enforcement。

## 真實 Storage HTTP integration

新增 `scripts/storage-upload-integration.mjs` 與 `npm run test:storage`。

只接受明確指定的隔離 hosted Supabase project，拒絕 Road Tag Production `ifcicahnrpkwjcxmnmug` 和無關專案 `nroteeeqyylgwfjkvnsy`，不讀 `.env.local` 或自動使用 Production key。先將 repository migrations 與 prepare-photo Edge Function 部署到隔離專案，開啟 anonymous sign-in；Edge 的 UPLOAD_GATE_SECRET 與測試 secret 相同。

在本機 process environment 配置下列名稱，不把值放入 Git 或聊天：

```text
STORAGE_TEST_PROJECT_REF
STORAGE_TEST_URL
STORAGE_TEST_PUBLISHABLE_KEY
STORAGE_TEST_SERVICE_KEY
STORAGE_TEST_MANAGEMENT_TOKEN
STORAGE_TEST_UPLOAD_GATE_SECRET
```

Service key 僅供測試結束後清理自建物件/Auth accounts；Management token 僅在該測試專案驗證 final metadata、調整自建 intent expiry、交易 rollback 與清理自建 SQL rows。測試 query helper 使用 Supabase 當下公開的 experimental management database/query endpoint，正式產品不依賴它；若官方 contract 改變需更新 harness。

執行：

```powershell
npm run test:storage
```

實際驗證流程：anonymous Auth → 帶有效 gate signature 的 prepare-photo Edge HTTP request → 與 browser XHR 相同 raw bytes/headers 的 Storage POST → final metadata/owner/size 查詢 → 真正 report insert/claim → public photo bytes read-back。JPEG 使用已存在的合成、無真實個資 fixture，WebP 使用已編碼 repo asset，不修改 encoder。

Negative cases：no reservation、wrong owner、expired、wrong path、arbitrary extension、PNG、>1 MiB、overwrite/upsert、delete、non-admin after、兩種 extension/MIME mismatch 的 claim 拒絕。DELETE 可能因 RLS 回傳空陣列，測試以物件仍存在為準，不把 HTTP 200 誤判成可刪除。

測試只在隔離專案建立一筆自產 JPEG report，供 non-admin after authorization；其餘 claim 使用 transaction rollback。finally 先移除自建 report rows，再以 Storage API 清理自建物件，清理 intents/risk hashes 與 Auth users；絕不 SQL DELETE storage.objects，清理失敗以非零 exit 回報。

目前 `npm run test:storage` **PENDING**：沒有已配置的隔離環境。2026-10-05 使用者拒絕建立付費 branch 並要求直接上線，因此本次使用已通過的本地 regression 與正式安全回讀發布；不以 mock Storage HTTP 或直接 SQL INSERT 假裝 real upload 通過。

## 正式發布與裝置驗收狀態

- Local patch：已完成；精確發布版本 19 files / 170 tests、75 DB checks、lint、build、SEO check 通過（排除其他未提交 Cookie 測試）。
- GitHub main：唯讀回查仍為 `970a437463ab6c9b03c060b7db83c5b32cb3e60d`；未推送本次版本。
- Production bucket：唯讀確認 1 MiB + image/webp/image/jpeg，photos_insert + owner SELECT，沒有一般 UPDATE/DELETE policy。
- Production migration：**已套用並回讀確認**，Supabase history version `20261004133155`；使用者於 2026-10-04 明確指示「直接上線」，授權先發布已完成本地驗證的修復，不等待 staging。這不代表真實 Storage API 測試已通過。
- Vercel deployment／正式網域新版本：**未執行**，沒有本次 release commit SHA/deployment ID。
- Physical iPhone Safari retest：**PENDING**。

按照使用者 2026-10-04 與 2026-10-05「直接上線、不新增費用」指示，已套用該 migration；回讀 policy/function/bucket後精確提交此次檔案並沿既有 main → Vercel 發布，不包含其他 working-tree 改動。保留舊函式定義於 ignored output，避免以資料庫 reset 或刪資料回復。signature/path/gate 均向前相容。正式結果另記於 `docs/storage-upload-production-release-2026-10-05.md`，real HTTP 與實機驗證仍獨立標示。

只有同一台 iPhone Safari 完成「選照片 → 確認送出 → report 建立 → 照片可讀」，才可將 Safari blocker 標 PASS/closed。

參考：[Storage standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)、[Bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets)、[Management SQL test API](https://supabase.com/docs/reference/api/v1-run-a-query)。
