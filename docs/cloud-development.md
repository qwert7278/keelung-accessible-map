# Road Tag 雲端開發

本 repo 支援 AI 助理管理的雲端工作區與電腦接續開發，兩端共用 GitHub 原始碼與 Node.js 24（`.nvmrc`）。平板使用者可直接在對話要求助理啟動、修改與檢查，不需要自己的終端。GitHub Codespaces 是可選的另一種編輯入口。

## AI 助理管理的雲端工作區

由助理在可用的雲端執行環境完成以下操作：

```sh
git clone https://github.com/qwert7278/keelung-accessible-map.git
cd keelung-accessible-map
npm ci --cache /tmp/roadtag-npm-cache
npm run dev:cloud
```

已有工作區時先檢查 `git status --short`、目前分支與 commit，保留未提交修改，不重複 clone。需要抓取此雲端設定時使用 `codex/roadtag-cloud-development` 分支，合併後才改用 `main`。

託管環境中，下載程式碼、安裝套件、啟動監聽服務及 HTTP 驗證都需要執行工具的網路權限。若出現 `Operation not permitted` 或代理在 0 ms 內連線失敗，先檢查沙箱權限，不能僅憑此錯誤判定代理壞掉；使用工具提供的額外網路權限，不移除既有代理或 TLS 驗證。npm 快取指向可寫入的 `/tmp`，避免寫入受限的使用者家目錄。

雲端 Chromium 若出現 `ERR_CERT_AUTHORITY_INVALID`，確認它可使用環境既有的代理 CA 與 NSS 信任資料庫。此次環境的資料庫位於 `/home/agent/.pki/nssdb`，瀏覽器驗證需要對該目錄的寫入權限；僅有唯讀權限時無法正常載入既有信任設定。不使用忽略憑證錯誤的旗標。

`dev:cloud` 固定啟用 Demo／OSM，監聽 `0.0.0.0:5173`，連接埠被占用時直接報錯。助理需保留服務程序，檢查 `/`、`/map` 和 Demo 資料顯示。雲端工作區可能暫停或回收，下次需檢查並重新啟動；不能承諾程序永久在線。`localhost` 只屬於執行環境，不是平板可用的網址；只有平台提供並驗證的預覽連結才能交給使用者。

## 開啟與預覽

1. 在含有此設定的 GitHub 分支選擇 **Code → Codespaces → Create codespace on 此分支**。首次建立會執行 `npm ci`，等安裝完成後再啟動。
2. 在 Codespaces 終端執行：

   ```sh
   npm run dev:cloud
   ```

3. 在 **Ports** 面板開啟 5173 的瀏覽器連結，維持 Private 可見性。首頁為 `/`，地圖為 `/map`，管理展示為 `/admin`。儲存原始碼後，Vite 會更新預覽。
4. 下次從 https://github.com/codespaces 找到既有環境，選擇重新開啟；停止後需重新執行啟動指令。

Codespaces 的建立及運算由你的 GitHub 帳號管理，可能使用帳號額度或產生費用；這份設定本身不會建立或啟動 Codespace。未提交的修改只保存在該 Codespace；刪除前請將要保留的修改提交並推送至工作分支。

## 開發模式與檢查

`npm run dev:cloud` 固定使用 `VITE_DEMO_MODE=true`、`VITE_MAP_PROVIDER=osm`，可在不填正式後端憑證的情況下測試 Demo，且不受既有 `.env` 的正式模式設定影響。若要切換隔離測試後端，使用原有 `npm run dev` 入口並依既有部署文件處理。此命令不改變 `build` 或正式發布流程。

```sh
npm run lint
npm test
npm run build
```

開發設定沒有自動啟動 MCP 或 Vercel Functions；後端整合依既有專案文件另行驗證。瀏覽器功能仍需要可存取外部地圖服務。

## 保存與發布

平板上的瀏覽器預覽使用既有 Vercel 專案的 Preview 部署。`codex/roadtag-cloud-development` 分支在 `VERCEL_ENV=preview` 時由 Vite 固定編譯成 Demo，正式發布仍固定為非 Demo；不要把雲端 dev server 的 localhost 網址當平板連結。分支推送後，等待 Vercel READY，再由助理檢查實際頁面的 Demo 標示與地圖。若預覽有登入保護，可使用有期限的分享連結；連結到期後由助理重新取得，勿提交分享 token。

兩端接續工作透過 GitHub 工作分支同步，不會自動同步未提交的檔案：

1. 離開目前環境前，檢查 diff，只提交本次要保留的檔案並推送工作分支。
2. 換到雲端或電腦時，先檢查工作區是否乾淨；有未提交修改時先保存，不覆寫。
3. 乾淨工作區執行 `git fetch origin`，切換相同工作分支，再以 `git pull --ff-only` 更新。若分歧，先檢查差異並處理衝突，不強制推送或 reset。
4. 執行 `npm ci`（雲端使用上述可寫快取），再啟動開發入口。平板上的這些操作均可交給 AI 助理。

在工作分支修改、檢查並提交，推送該分支後以 PR 審查。雲端開發可取代本機編輯步驟；GitHub `main` 仍是正式版本。維持 [既有發布流程](single-release-workflow.md)：使用者確認此次版本後才更新 `main`，由 Vercel 部署，再核對正式網址。

不要提交 `.env` 或密鑰；需要的測試憑證使用 Codespaces secrets。線上資料與照片仍留在既有服務。

## 2026-10-25 雲端驗證紀錄

- Node.js 24.19.0，成功安裝鎖定版本依賴；`npm run dev:cloud` 已實際啟動。
- `npm run lint`、`npm test`（31 個測試檔、294 項測試及端點執行檢查）、`npm run build` 通過。建置仍有既有的大型 chunk 提醒。
- Chromium 檢查首頁、`/map` 與 OSM 底圖正常；沒有 JavaScript 未處理錯誤。
- 在隔離的瀏覽器 Demo 中，選取位置 → 上傳合成 QA 照片 → 送出回報 → 重新整理，仍顯示 1 個標記。未操作正式後端。
- 768 × 1024 平板視窗未出現水平溢出。此紀錄是當次驗證，不代表雲端程序永久運行或正式網站已更新。
