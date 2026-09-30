# 部署與設定

## Vercel Demo

Node 24。匯入 GitHub repository，Framework 選 Vite，Build `npm run build`，Output `dist`。
設定 `VITE_DEMO_MODE=true`（省略也預設 Demo）。不需要 Google Maps 或 Supabase key。
`vercel.json` 讓 `/admin` 重新整理仍能載入 SPA。

## Supabase

已建立獨立專案 `keelung-accessible-map`，東京區域 `ap-northeast-1`，建立時工具報價 US$0/月。

1. 套用 `supabase/migrations/` 的 schema（本次雲端執行狀態見 README）。Migration 只能對新專案套用一次；後續変更必須新建 migration。
2. Dashboard → Authentication → Sign In / Providers 啟用 Anonymous Sign-Ins。
3. 管理者在 `/admin` 輸入正式 Email，使用 magic link 建立／登入一般 Auth 身分；任何人都可以建立一般帳號，但建立本身不授予管理權限。不要把匿名 UID 當管理員。
4. 在可信任 SQL Editor 執行：`insert into private.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');`。前端沒有權限讀寫此表。
5. Dashboard 設定 Site URL 與 Redirect URLs，包含 `https://YOUR_DOMAIN/admin` 和需要的 localhost 測試網址。管理者以 Email magic link 登入。正式 Email 傳送需核對 SMTP 寄送限制並設定自己的 SMTP。
6. Vercel 設定 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`。只放 publishable key；**不可使用 service_role／secret key**。
7. 在非公開測試環境設定 `VITE_DEMO_MODE=false`，驗證匿名建案、照片、補充、管理變更與 RLS。
8. Beta 聯絡信箱、資料更正／移除申請管道及保留政策已公開說明：公開案件與照片在仍有服務需要時保留；收到並確認移除申請後處理，並至少每年檢視是否仍有保留必要。正式開放收件前，仍須完成 CAPTCHA／防濫用方案及容量、MAU、帳務提醒，並驗證申訴處理流程有人負責。

## Google Maps（可選）

只有明確設定 `VITE_MAP_PROVIDER=google` 與 `VITE_GOOGLE_MAPS_API_KEY` 才載入 Google；預設 `VITE_MAP_PROVIDER=osm`，即使保留 Google key 也不呼叫 Google。啟用 Maps JavaScript API，限制網站 referrer 與 API 範圍。沒有 key 時仍用 OSM 地圖；Google 驗證／計費與真實 Key 的實測另做。Places／Geocoding 不屬本版必要條件。

## 驗證與回復

部署前：`npm ci` → `npm run lint` → `npm test` → `npm run build`。
每次 PR / main push 由 GitHub Actions 執行。部署後確認首頁、`/admin`、手機版與照片／回報流程。
前端可用 Vercel 前一版部署回復。資料庫 schema 使用前進式 migration；涉及資料移除前先備份，勿以刪除 migration 當作 rollback。

參考：[Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)、[Storage access control](https://supabase.com/docs/guides/storage/security/access-control)、[OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)。
