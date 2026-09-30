# 開源專案評估

評估日期：2026-09-29。決策：**Strategy B，新建 React + Vite + TypeScript**。本專案獨立實作，以 MIT 釋出；未複製以下專案的程式、圖片或資料集。

| 專案 | 實際查核與決策 |
| --- | --- |
| [tw_road_fix_map](https://github.com/tbdavid2019/tw_road_fix_map) | GitHub API 查得 AGPL-3.0，最近 push 2026-09-29；仍有維護。package.json 是 React 17、react-scripts 4、CRA，build 需要 openssl-legacy-provider。Google Maps 組件、SCSS、cityConfig、parser、每日資料同步；README 與 tree 可見 public/keelung.json。可以 fork，但新版群眾回報／身分與照片流程需要另建；我們希望獨立 MIT 與新的工具鏈，因此不 fork。未驗證基隆官方 API 即時可用性與資料再利用授權，第一版不搬用 JSON 或 parser。 |
| [SafeStep](https://github.com/ShreyaLbs/safestep-access-map) | README 為 Vanilla JS、Leaflet + OSM、localStorage，聲明 MIT。參考地圖與清單並行、圖示搭配文字狀態、手機直向布局、減少動態效果。未採用人人可直接 resolved 的權限模式。 |
| [CivicLens](https://github.com/OSSWT/CivicLens) | GitHub API MIT；FastAPI、MongoDB、Google Maps、Bootstrap／jQuery、OpenCV。參考明確的案件生命週期、改善前後與照片證據、儲存 adapter。未引入 Python 後端或 AI 判讀。 |
| [Project Sidewalk](https://github.com/ProjectSidewalk/SidewalkWebpage) | README 為 Scala／Play、Postgres／PostGIS、vanilla JS／Grunt、Docker；MIT。參考路緣斜坡、路面、障礙分類与多城市資料模型。不 fork 大型稽核平台。 |
| [g0v Roadpin](https://github.com/g0v/roadpin) | README 可見 Python 2.7、MongoDB 與歷史道路回報概念。僅作歷史參考，不依賴舊站或舊 stack；未核對完整授權條文，不取用程式。 |

## 對原規格的調整

1. 使用者同意以 Supabase 取代 Firebase：Postgres／RLS／Auth／Storage。
2. city_id 採 TW-KEE，城市設定獨立，資料結構不依賴「基隆好行」品牌名稱。
3. 無 Google Key 時採 Leaflet + OSM 可操作底圖。Google Maps adapter 可由環境變數啟用。
4. 不以 VITE_ADMIN_UIDS 授權。管理員名單位於 private schema，僅由可信任管理管道設定。
5. Demo IndexedDB 与正式 Supabase 完全分離。Demo 預設開啟，不把虛構案件寫進正式資料庫。
6. 正式收件先完成營運聯絡、刪除申訴、保留政策與防濫用機制；本版公開站仍是展示模式。

以上是架構與授權範圍查核，並非上游全量安全審計。
