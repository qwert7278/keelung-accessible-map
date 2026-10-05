# Safari Storage 修復：staging / release 現況

2026-10-05。依根目錄 `ROAD_TAG_SUPABASE_STAGING_REAL_UPLOAD_RELEASE_AGENT_2026-10-05.md` 接續工作。

## 已確認

- Production `storage_upload_lifecycle_rls` 已於前次「直接上線」授權後套用，history version `20261004133155`；本地檔案對齊同版本。新任務文件的「尚未套用」為舊狀態，不重跑此 migration。
- Production INSERT metadata dependency removed=true、final metadata claim enabled=true、bucket limit=1048576；前次回讀 MIME allowlist 為 WebP/JPEG，沒有一般 UPDATE/DELETE policies。
- Production prepare-photo v4 ACTIVE；來源與本地 handler/gate/cleanup 一致，此修復未改 Edge Function。
- 最新回查 roadtag.org 的 Vercel Production 仍為 `dpl_G8yLHoKxKeodaoJzcQkojezwmGLJ` / READY / SHA `970a437463ab6c9b03c060b7db83c5b32cb3e60d`，尚不包含此次前端提示文字更新。
- Git staged files 為空；其他 Cookie、首頁、CSS、MCP 文件與素材工作保留。

## 本次測試腳本補強

`scripts/storage-upload-integration.mjs` 增加：

- JPEG/WebP 都用真正 authenticated PostgREST report create，並回讀 public report_feed 的 exact before_image_path。
- 每種格式都驗證同 operation 改變 reservation format 被拒絕。
- 共享 signed prepare helper，negative after reservation 指向實際存在的 staging report。
- staging-only fixture cleanup identity 在 operation/report 請求之前記錄，減少 lost acknowledgement 時漏清理的可能性。

本次 Node syntax、targeted ESLint、git diff --check 通過。完整精確發布版本的既有驗證為 19 files/170 tests、75 DB checks、lint/build/SEO/runtime checks 通過；本次未將它們冒稱為 2026-10-05 已重新實跑。

## 不新增費用的執行決策

Supabase project list 沒有 Road Tag 專用 staging；branch list 為空。另一個 inactive 專案屬於別的產品，不使用它測試。

官方文件列 branching 為付費用量，Micro compute 起價 US$0.01344/小時，另有可能的 Storage、egress 等成本，且不受 Spend Cap 保護。此次尚未建立 branch、沒有產生新的 branch 費用。

新 MD 明確要求：若 branch 會產生成本，先回報，不自行產生成本。已向使用者詢問是否同意在既有 organization `pdbordexbuaoxbivijkz` 取得正式報價，確認金額後建立短期測試 branch；或使用使用者提供的隔離環境。

使用者於 2026-10-05 明確拒絕付費資源並要求直接做，沿用先前直接 Production 上線授權。改採本地 regression + 現有 Production 安全回讀 + 精確前端發布；不建立 branch、不升級方案、不使用 Production QA 案件替代 staging，不宣稱 real JPEG/WebP upload PASS。

免費真實驗證路徑為本機 Supabase，但目前沒有 Docker/Podman runtime，無法即時執行。本次不安裝需改動系統/重啟的容器環境；保留 integration harness 與 PENDING 狀態。沿用既有服務仍受原帳戶方案/配額影響，不新增付費資源不等於保證帳戶所有既有用量零費用。

## 待完成

1. 回讀現有 Production migration，不重跑已套用的 lifecycle migration。
2. 以不含其他未提交工作的精確版本完成 regression、Git commit/main push、Vercel READY/SHA/domain 驗證。
3. Real JPEG/WebP HTTP staging tests: PENDING，之後可用已配置的免費本機環境補測。
4. Physical iPhone Safari retest: PENDING，由使用者本人實測後才可關閉 blocker。

來源：[Supabase branching usage/pricing](https://supabase.com/docs/guides/platform/manage-your-usage/branching)。
