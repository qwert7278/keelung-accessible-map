# Road Tag 雲端開發

本 repo 可透過 GitHub Codespaces 在瀏覽器編輯；Node.js 24、npm 與開發設定由 `.devcontainer/devcontainer.json` 管理。此開發環境使用同一份 GitHub 原始碼。

## 開啟與預覽

1. 在含有此設定的 GitHub 分支選擇 **Code → Codespaces → Create codespace on 此分支**。首次建立會執行 `npm ci`，等安裝完成後再啟動。
2. 在 Codespaces 終端執行：

   ```sh
   npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
   ```

3. 在 **Ports** 面板開啟 5173 的瀏覽器連結，維持 Private 可見性。首頁為 `/`，地圖為 `/map`，管理展示為 `/admin`。儲存原始碼後，Vite 會更新預覽。
4. 下次從 https://github.com/codespaces 找到既有環境，選擇重新開啟；停止後需重新執行啟動指令。

Codespaces 的建立及運算由你的 GitHub 帳號管理，可能使用帳號額度或產生費用；這份設定本身不會建立或啟動 Codespace。未提交的修改只保存在該 Codespace；刪除前請將要保留的修改提交並推送至工作分支。

## 開發模式與檢查

雲端終端預設 `VITE_DEMO_MODE=true`、`VITE_MAP_PROVIDER=osm`，可在不填正式後端憑證的情況下測試 Demo。這兩項由 devcontainer 的 `remoteEnv` 設定，會優先於 Vite 的 `.env`；若要切換隔離測試後端，須明確修改設定並重建環境。正式資料庫設定仍依既有部署文件處理。

```sh
npm run lint
npm test
npm run build
```

開發設定沒有自動啟動 MCP 或 Vercel Functions；後端整合依既有專案文件另行驗證。瀏覽器功能仍需要可存取外部地圖服務。

## 保存與發布

在工作分支修改、檢查並提交，推送該分支後以 PR 審查。雲端開發可取代本機編輯步驟；GitHub `main` 仍是正式版本。維持 [既有發布流程](single-release-workflow.md)：使用者確認此次版本後才更新 `main`，由 Vercel 部署，再核對正式網址。

不要提交 `.env` 或密鑰；需要的測試憑證使用 Codespaces secrets。線上資料與照片仍留在既有服務。
