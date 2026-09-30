# 安全與下一版準備

## 已落地的界線

匿名 Supabase Auth 屬 authenticated；anon 代表未登入。兩者的公開 SELECT 都受欄位權限與 security_invoker view 保護。RLS 是最終列授權；前端管理按鈕不是安全機制。一般使用者不能改狀態、管理欄位、作者、時間、歷史，不能 delete/truncate，也不能寫 private.admin_users。匿名 JWT 即使被誤加入管理表，仍不會得到管理權限。

管理註記只在 private.admin_audit 保存歷史，不寫入公共時間軸。所有照片路徑使用案件 UUID 而非作者 UUID。瀏覽器只收到 publishable key；service-role/secret key 不應存在於 Vite、Vercel 前端環境或 Git。

## 防濫用準備

- 原子伺服器每 UID 新案 30 秒、補充 10 秒冷卻，資料庫時間作準；前端 localStorage 只是 UX 提示。
- 表單 honeypot、文字長度、照片 MIME/容量、服務範圍、上傳所有權、不可覆寫證據已實作。
- 換匿名帳號可以繞過每 UID 限制；尚未宣稱可抵抗分散式濫用。下一版需 Auth CAPTCHA 與每 IP/裝置限制，以及上傳 reservation、每帳號每日配額。瀏覽頁應延後到有寫入意圖才建立匿名帳號。
- Storage 上傳目前沒有獨立頻率限制。需受信任後端核發短效 upload ticket，在同一案件草稿限制張數；不能只靠前端計數。
- 上傳成功、建案失敗可留下孤立照片。後續 server-only 排程採先盤點、保留 24 小時、核對 reports/report_updates 引用，再清除；不得由瀏覽器取得刪除他人證據能力。
- 對外收件前補齊營運聯絡、申訴刪除與資料保留政策；配置容量/MAU/帳務提醒。不要因缺 SMTP 或 CAPTCHA 金鑰把既有權限放寬。

## PostGIS 附近／重複案件

目前僅對已載入的最近 200 筆、同類型、未改善案件做 30 公尺 Haversine 提醒，不是完整重複偵測。提示不阻止不同障礙送出。

下一版建立 geography(Point,4326) 與 GiST index，保留 lat/lng API 相容性；新 migration 回填後再建立索引。查詢用 ST_DWithin(geography,point,radiusMeters)，再依 ST_Distance 排序，city_id/category/status 條件及最多 20 筆。只輸出公開 view 的安全欄位，回傳 distance_meters；不可回傳 created_by、admin_note。

RPC 優先 SECURITY INVOKER，仍由 RLS 授權；輸入檢查有效經緯度、radius 10–500 公尺、有效 city_id。為 viewport 查詢加游標分頁與 max bounding box，跨城市不要下載全表。資料量增大前檢查 EXPLAIN ANALYZE，驗證 GiST 與 city/status 索引、30m 邊界與不同緯度測例。

驗收需包含：同點、30m 內外、已改善排除、不同分類/城市、重複兩次送出、錯誤座標、上限截斷、不洩露內部欄位。30m 是提醒半徑，不是兩筆案件必為同一事件的判定。

## 驗證指令

`npm run lint`、`npm test`、`npm run build`。在 SQL Editor 執行 `supabase/tests/rls-smoke.sql` 與 `privileges.sql`；兩者 rollback，不留下 fixture。

`scripts/cloud-smoke.mjs` 僅限專用驗證環境，使用 repo 內 tests/fixtures/qa-photo.jpg 合成測試照片與 .env.local 的 publishable key，使用真實匿名 Auth。結果與精確 fixture ID 寫到被 Git 忽略的 output；執行者需透過可信任管理工具清理測試照片、資料及帳號，不能修改 RLS 讓前端清理。
