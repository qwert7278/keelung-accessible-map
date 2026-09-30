# 基隆無障礙通行回報地圖 — AI Agent 執行規格

> Project codename: **Keelung Accessible Map**
>
> 目標：先做出一個可公開瀏覽、可回報、可上傳照片、可查看處理狀態的單頁 Web Demo，之後再持續迭代。
>
> 執行原則：**先上線可用版本，再逐步完善，不追求第一版一次做完。**

---

## 1. 專案目標

建立一個以 **基隆市** 為第一個示範區域的「無障礙通行回報地圖」。

主要使用者包括：

- 輪椅使用者
- 行動不便者
- 長者
- 推嬰兒車者
- 一般市民
- 市府／工程／道路管理單位
- 民間無障礙倡議團體

使用者可以直接在地圖上：

1. 查看目前已被回報的障礙點位
2. 點選地圖位置新增回報
3. 上傳現場照片
4. 選擇障礙類型
5. 標示輪椅是否可通行
6. 查看案件狀態
7. 補上最新照片與最新狀況
8. 查看改善前／改善後
9. 查看官方道路施工資料（第二階段或可行時第一階段加入）

---

## 2. MVP 第一版成功條件

第一版不需要做成完整市政系統。

**只要以下流程可以完整跑通，就算 MVP 成功：**

使用者開啟網站  
→ 看到基隆地圖  
→ 看到現有回報點  
→ 點「新增回報」  
→ 選位置  
→ 上傳照片  
→ 選類型  
→ 填簡短說明  
→ 選擇輪椅通行程度  
→ 送出  
→ 地圖立即出現新 Marker  
→ 點 Marker 可以查看照片、資訊、狀態  
→ 管理者可以把狀態從「待改善」改成「處理中」或「已改善」  
→ 完成後可以加入改善後照片

---

## 3. 第一版 UI

整個 MVP 優先做成 **Single Page Web App**。

不要做 Native App。

### Header

顯示：

- 基隆無障礙通行地圖
- 搜尋地點
- 定位到目前位置
- `＋ 回報障礙`

---

## 4. 地圖

優先使用：

**Google Maps JavaScript API**

預設中心：

Keelung City, Taiwan

初始 Zoom：

約 13–14

限制第一版主要視野在基隆市。

### Marker 顏色

- 🔴 紅色：待改善
- 🟡 黃色：處理／施工中
- 🟢 綠色：已改善

若 Google Maps Advanced Marker 實作較複雜，第一版可以使用簡單 SVG / CSS Marker。

---

## 5. 點位資訊卡

點 Marker 後顯示 Bottom Sheet 或 Side Panel。

內容至少包含：

- 地址／位置名稱
- 問題類型
- 問題描述
- 建立日期
- 最新更新日期
- 原始照片
- 最新照片
- 狀態
- 輪椅通行程度
- 「補充最新狀況」
- 「上傳最新照片」

完成案件顯示：

### 改善前
照片

### 改善後
照片

---

## 6. 回報類型

MVP 固定以下分類：

1. 人行道路面不平／破損
2. 高低差／階梯
3. 缺少斜坡／斜坡不良
4. 騎樓障礙
5. 人行道被占用
6. 通道過窄
7. 施工阻礙
8. 其他

---

## 7. 輪椅通行程度

必須包含一個獨立欄位：

- `passable`：✅ 可通過
- `difficult`：⚠️ 通行困難
- `blocked`：❌ 無法通過

這個欄位的資訊優先級高於一般「嚴重度 1–5」。

---

## 8. 案件狀態

第一版只使用三個正式狀態：

```text
open
in_progress
resolved
```

UI 顯示：

```text
open        = 🔴 待改善
in_progress = 🟡 處理中
resolved    = 🟢 已改善
```

一般使用者不可直接將案件正式改為 `resolved`。

一般使用者可以：

- 新增照片
- 補充留言
- 回報「看起來已改善」
- 回報「問題仍存在」

正式狀態修改保留給 Admin。

---

# 9. 建議技術架構

## Frontend

優先：

```text
React
Vite
TypeScript
Google Maps JavaScript API
Firebase Web SDK
```

可選：

```text
Tailwind CSS
```

若現有 fork 專案使用不同 React 架構，優先沿用，不必為了 Tailwind 重寫。

---

# 10. Backend

MVP 不建立傳統 Server。

使用 Firebase：

```text
Firebase Authentication
Firebase Firestore
Firebase Storage
```

後續需要管理／審核功能時，可加入：

```text
Firebase Cloud Functions
Firebase App Check
```

---

# 11. Authentication

第一版：

```text
Firebase Anonymous Authentication
```

目的：

- 使用者不必註冊
- 仍有 Firebase UID
- 可以追蹤提交來源
- 可避免資料完全無來源

第二階段再考慮：

```text
Google Login
LINE Login
Email login
```

---

# 12. Firestore Data Model

Collection：

```text
reports
```

Document example：

```json
{
  "title": "人行道高低差",
  "description": "輪椅從這裡很難通過，需要繞到車道。",
  "category": "level_difference",

  "location": {
    "lat": 25.128,
    "lng": 121.741
  },

  "address": "基隆市仁愛區...",
  "district": "仁愛區",

  "status": "open",
  "wheelchairAccess": "blocked",

  "createdBy": "firebase_uid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",

  "coverImageUrl": "https://...",
  "beforeImageUrl": "https://...",
  "afterImageUrl": null,

  "officialSource": false,
  "officialSourceId": null
}
```

---

# 13. Updates Subcollection

每一筆案件保留歷史更新。

```text
reports/{reportId}/updates/{updateId}
```

Example：

```json
{
  "type": "photo_update",
  "message": "今天經過仍然沒有改善。",
  "imageUrl": "https://...",
  "suggestedStatus": "open",
  "createdBy": "firebase_uid",
  "createdAt": "timestamp"
}
```

這樣不要覆蓋舊資料。

必須留下歷史。

---

# 14. Firebase Storage

建議路徑：

```text
reports/{reportId}/before/{uuid}.jpg
reports/{reportId}/updates/{uuid}.jpg
reports/{reportId}/after/{uuid}.jpg
```

第一版圖片限制：

```text
JPG / JPEG / PNG / WebP
最大 10 MB
```

前端上傳前建議壓縮至：

```text
長邊 <= 1920px
Quality 約 0.8
```

目的是降低 Firebase Storage 費用。

---

# 15. 圖片處理

Agent 必須實作：

- 上傳前 preview
- 圖片壓縮
- Upload progress
- Upload error handling
- 成功後取得 Firebase Storage download URL
- Firestore 保存 URL

---

# 16. Admin 權限

第一版不用做複雜 Admin Dashboard。

可以先：

```text
/admin
```

功能：

- 查看案件
- Filter by status
- 改變 status
- 上傳改善後照片
- 留下管理註記

Admin 權限使用 Firebase Custom Claims 或第一版簡化為：

```text
VITE_ADMIN_UIDS
```

但正式上線前應改成安全的 server-side / Custom Claims 方案。

---

# 17. 開源專案研究

Agent 開始 coding 前，先研究以下 repository。

## A. Taiwan Road Construction Map

Repository：

```text
https://github.com/tbdavid2019/tw_road_fix_map
```

目的：

- 查看是否適合作為主要 fork
- 保留 Google Maps 架構
- 查看現有基隆道路施工資料 parser
- 查看資料更新方式
- 查看 UI 結構

如果可維護性良好：

**優先 fork 此專案。**

如果架構太舊、耦合過高或不適合新增 Firebase：

則新建 React + Vite 專案，只參考其 API / parser / map implementation。

---

## B. SafeStep Accessibility Map

Repository：

```text
https://github.com/ShreyaLbs/safestep-access-map
```

主要參考：

- 地圖回報 UX
- Accessibility-first UI
- Marker interaction
- 手機版 Bottom Sheet
- 表單流程

不要直接照抄所有技術架構。

---

## C. CivicLens

Repository：

```text
https://github.com/OSSWT/CivicLens
```

主要參考：

- civic issue lifecycle
- status update
- before / after photos
- admin workflow

---

## D. Project Sidewalk

Repository：

```text
https://github.com/ProjectSidewalk/SidewalkWebpage
```

第一版只研究，不直接 fork。

主要學習：

- accessibility issue taxonomy
- sidewalk accessibility data
- crowdsourcing model
- future routing possibilities

---

## E. g0v Roadpin

Repository：

```text
https://github.com/g0v/roadpin
```

只做歷史與概念參考。

不要使用其舊技術 stack 建新系統。

---

# 18. Agent Decision Rule

Agent 必須先執行 repository assessment。

產生：

```text
docs/repo-assessment.md
```

內容：

```text
tw_road_fix_map:
- Stack
- Last meaningful architecture
- Google Maps integration
- Keelung support
- Can fork? Yes/No
- Risks

SafeStep:
- UX reusable ideas
- Accessibility ideas

CivicLens:
- Workflow reusable ideas
```

然後選擇：

### Strategy A

```text
fork tw_road_fix_map
```

或：

### Strategy B

```text
new React + Vite + TypeScript application
```

不要卡在評估。

如果 30–60 分鐘內無法明確判斷，直接使用 Strategy B。

---

# 19. DEMO MODE

非常重要。

即使 Firebase API Key 或 Google Maps API Key 還沒有取得，Agent 也必須先產出可看的 Demo。

加入：

```text
VITE_DEMO_MODE=true
```

Demo Mode：

- 使用 mock data
- 地圖仍盡量使用 Google Maps
- 如果 Google Maps key 缺失，允許 fallback 成 static demo / development placeholder
- 使用 6–10 筆基隆測試資料
- 可以點 marker
- 可以開回報表單
- 可以模擬成功提交

測試點位例如：

```text
基隆車站
廟口夜市
仁愛區
中正區
信義區
安樂區
```

Demo Data 必須明確標示：

```text
Demo data / 測試資料
```

不要讓使用者誤以為是真實政府通報。

---

# 20. 官方施工資料 Layer

若 `tw_road_fix_map` 的基隆資料可正常使用：

加入 Layer Toggle：

```text
☑ 無障礙回報
☑ 官方道路施工
```

兩種 Marker 必須視覺不同。

例如：

```text
♿ Accessibility Issue
🚧 Road Construction
```

若官方 API 不穩定：

MVP 不阻塞。

先完成民眾回報功能。

---

# 21. UI / UX 原則

這是一個 Accessibility project。

介面本身必須盡量符合 Accessibility。

至少：

- 大型點擊區
- Button 高度 >= 44px
- 清楚文字
- 不只靠顏色表達狀態
- Marker 有 icon + label
- Keyboard accessible
- Visible focus state
- Form label 完整
- alt text
- ARIA where needed
- prefers-reduced-motion support
- 手機版優先

目標：

```text
WCAG 2.2 AA where practical
```

---

# 22. Mobile First

主要使用情境可能是：

人在路上  
→ 手機看到障礙  
→ 拍照  
→ 定位  
→ 回報

因此：

Mobile UX 優先於 Desktop。

新增回報流程最好控制在：

```text
4 steps 以內
```

例如：

```text
1. 選位置
2. 拍照
3. 選問題
4. 送出
```

說明文字可選填。

---

# 23. Geolocation

實作：

```text
navigator.geolocation
```

提供：

```text
定位到我的位置
```

但不能強迫使用者提供定位。

如果拒絕：

仍可手動在地圖上選位置。

---

# 24. Address Reverse Geocoding

如果有 Google Maps Geocoding：

使用座標取得地址。

如果失敗：

只保存：

```text
lat
lng
```

地址不是提交必要條件。

---

# 25. Duplicate Report

第一版可以做簡單提醒。

新增回報時：

搜尋附近約：

```text
20–30m
```

是否已有 open report。

如果有：

提示：

```text
附近已經有相似回報。

[查看現有回報]
[仍要新增]
```

第一版可以 optional。

不要為了 duplicate detection 延誤 MVP。

---

# 26. Security

必須建立 Firebase Rules。

Firestore：

一般使用者：

```text
read: true
create: authenticated
update: limited
delete: false
```

正式 status change：

Admin only。

Storage：

- authenticated upload
- 限制 content type
- 限制 path
- 不允許任意 delete

不要使用：

```text
allow read, write: if true;
```

部署正式 Demo。

---

# 27. Spam Protection

MVP 可先做：

- Firebase Anonymous Auth
- client-side rate limit
- honeypot field

第二階段：

- Firebase App Check
- Cloud Functions validation
- IP / UID rate limit
- report moderation

---

# 28. Environment Variables

建立：

```text
.env.example
```

包含：

```bash
VITE_GOOGLE_MAPS_API_KEY=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_DEMO_MODE=true
```

絕對不要 commit 真實 secret。

---

# 29. Google Maps Platform

需要：

```text
Maps JavaScript API
Geocoding API
Places API
```

第一版必要：

```text
Maps JavaScript API
```

Geocoding / Places 可後補。

API key 應限制：

```text
HTTP referrers
```

只允許：

```text
localhost
production domain
preview domain
```

---

# 30. Agent 必須使用的工具

Agent 可以調用以下工具。

## Required

### Git / GitHub

用途：

- clone
- fork
- branch
- commit
- push
- issue tracking
- pull request

CLI：

```bash
git
gh
```

---

### Node.js

建議：

```text
Node 20+
npm
```

或：

```text
pnpm
```

---

### Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init
```

---

### Google Maps Platform

Google Cloud Console：

- API key
- Maps JavaScript API
- API restriction

---

### Browser / DevTools

必須檢查：

- mobile layout
- console errors
- network requests
- Firebase uploads
- map markers

---

### Lighthouse

至少測試：

```text
Accessibility
Performance
Best Practices
```

---

# 31. 可使用的 AI / Coding 工具

Agent 執行環境可使用：

- VS Code
- Codex / coding agent
- GitHub Copilot
- Cursor
- Claude Code
- terminal
- browser automation

不要依賴特定 AI IDE。

這份文件本身必須足以讓一般 coding agent 執行。

---

# 32. Repository Structure

建議：

```text
/
├── src/
│   ├── components/
│   │   ├── Map/
│   │   ├── ReportForm/
│   │   ├── ReportPanel/
│   │   ├── StatusBadge/
│   │   └── PhotoUploader/
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── Admin.tsx
│   │
│   ├── services/
│   │   ├── firebase.ts
│   │   ├── reports.ts
│   │   ├── storage.ts
│   │   └── maps.ts
│   │
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── data/
│   │   └── demoReports.ts
│   └── App.tsx
│
├── docs/
│   ├── repo-assessment.md
│   ├── architecture.md
│   └── deployment.md
│
├── firebase/
│   ├── firestore.rules
│   └── storage.rules
│
├── .env.example
├── README.md
└── package.json
```

如果 fork 原專案：

不用強制重構到完全一樣。

---

# 33. Development Phases

## Phase 0 — Repository Research

Agent：

1. Clone / inspect repositories
2. 看 tw_road_fix_map 是否能直接 fork
3. 決定 Strategy A / B
4. 寫 `docs/repo-assessment.md`

---

## Phase 1 — Static Demo

先完成：

- Map
- Demo markers
- Marker detail
- 三種 status
- Mobile UI
- Report form
- Mock submit

此時就部署 Preview。

這是第一個可看的版本。

---

## Phase 2 — Firebase

加入：

- Anonymous Auth
- Firestore
- Storage
- 真實 photo upload
- 建立 report
- report updates

---

## Phase 3 — Admin

加入：

- `/admin`
- status change
- after photo
- note

---

## Phase 4 — Official Road Construction Layer

如 API 可用：

加入基隆官方施工資料。

---

## Phase 5 — Hardening

加入：

- Firebase Rules
- App Check
- image validation
- better moderation
- loading/error handling
- analytics

---

# 34. Deployment

優先選擇：

## Option A — Vercel

適合：

React / Vite 前端快速部署。

流程：

```text
GitHub
↓
Vercel
↓
Automatic Preview Deploy
↓
Production
```

Agent 應：

1. Connect GitHub repository
2. Add env variables
3. Deploy
4. 驗證 mobile
5. 回傳 production URL

---

## Option B — Firebase Hosting

如果希望整個 stack 都在 Firebase：

```bash
firebase init hosting
firebase deploy
```

優點：

- Firebase 整合簡單
- Hosting + Auth + Firestore + Storage 同平台

兩者皆可。

### Agent Decision

如果已有 Vercel：

優先 Vercel。

否則：

Firebase Hosting。

---

# 35. CI

GitHub Actions 至少加入：

```text
npm install
npm run lint
npm run build
```

每次 PR 都跑。

---

# 36. Testing

至少測試以下流程。

### Test 1

使用者打開首頁。

Expected：

看到基隆地圖。

---

### Test 2

點任一 Marker。

Expected：

顯示 issue detail。

---

### Test 3

新增回報。

Expected：

可以：

- 選位置
- upload image
- category
- wheelchair access
- description
- submit

---

### Test 4

提交成功。

Expected：

Marker 出現在 map。

---

### Test 5

Admin 改：

```text
open → in_progress
```

Expected：

Marker：

紅 → 黃。

---

### Test 6

Admin 改：

```text
in_progress → resolved
```

並 upload after photo。

Expected：

Marker：

黃 → 綠。

detail 顯示：

```text
Before
After
```

---

### Test 7

Mobile。

使用至少：

```text
375 × 812
390 × 844
```

測試。

---

# 37. Definition of Done — MVP

只有以下條件全部通過才算完成：

- [ ] Public URL 可以打開
- [ ] 基隆 Map 正常
- [ ] Demo / Firebase data 可以顯示
- [ ] Marker 三色狀態
- [ ] Issue detail 可讀
- [ ] 新增回報可以使用
- [ ] Photo upload 可用
- [ ] Firestore data 可保存
- [ ] Anonymous auth 可使用
- [ ] Admin 可以改 status
- [ ] 可以新增 after photo
- [ ] Mobile 可操作
- [ ] Firebase rules 不允許匿名任意修改案件狀態
- [ ] `.env.example` 存在
- [ ] README 有 setup
- [ ] README 有 deploy
- [ ] GitHub repository 可重新 clone 後正常 build

---

# 38. README 必須包含

```text
Project introduction
Demo URL
Screenshots
Architecture
Local setup
Firebase setup
Google Maps setup
Environment variables
Development
Deployment
Data model
Contribution guide
License
Roadmap
```

---

# 39. Open Source

專案目標是可公開延伸。

若直接 fork AGPL repository：

沿用符合原專案授權義務的 License。

如果重新建立獨立 implementation：

優先考慮：

```text
MIT
```

但不要複製 AGPL 原始碼到 MIT 專案後改授權。

Agent 必須在 `repo-assessment.md` 記錄 license decision。

---

# 40. 第一版不要做

以下功能不要阻塞 MVP：

- Native App
- AI 自動判讀道路
- 完整 1999 integration
- LINE Bot
- 複雜角色權限
- 完整市政府後台
- 多城市
- route navigation
- wheelchair routing
- AI image classification
- 自動派工
- complicated voting
- blockchain
- social network

先讓：

```text
回報 → 看見 → 更新 → 改善
```

跑通。

---

# 41. Future Roadmap

## v0.2

- Google / LINE login
- Issue duplicate detection
- Moderation
- Filter
- Search
- District selector
- official data overlay

## v0.3

- accessibility score
- route accessibility
- sidewalk data
- slope
- curb ramps
- width

## v0.4

- 市府後台
- case assignment
- department ownership
- SLA
- API
- Open Data export

## v1.0

建立：

**基隆無障礙公共通行資料平台**

並保留擴展到：

```text
Taipei
New Taipei
Taoyuan
Taiwan-wide
```

的可能性。

---

# 42. Agent Autonomous Execution Instruction

從這裡開始，AI Agent 請直接執行，不要只輸出建議。

執行順序：

```text
1. Inspect repositories
2. Decide fork or new build
3. Create repository
4. Build static demo
5. Run locally
6. Fix errors
7. Deploy first preview
8. Add Firebase
9. Test report submission
10. Add Admin
11. Test Before / After
12. Add official Keelung road layer if practical
13. Accessibility check
14. Production deployment
15. Update README
16. Commit and push
```

---

# 43. Agent 遇到缺少 API Key 時

**不要停止整個專案。**

如果缺：

```text
Google Maps API Key
Firebase credentials
Vercel authorization
```

先：

1. 使用 Demo Mode
2. 完成所有不依賴 secret 的工作
3. 建立 `.env.example`
4. 清楚列出缺少的 credential
5. 保證只需要補 credential 就可繼續部署

Agent 不應因為 API Key 尚未提供而停止 coding。

---

# 44. 最後交付物

Agent 最後必須交付：

```text
1. GitHub repository
2. Production / Demo URL
3. README
4. docs/repo-assessment.md
5. docs/architecture.md
6. docs/deployment.md
7. Firebase rules
8. .env.example
9. Demo screenshots
10. 下一階段 TODO
```

最後回覆格式：

```text
PROJECT STATUS

Demo:
<URL>

GitHub:
<URL>

Implemented:
- ...
- ...
- ...

Pending:
- ...
- ...

Credentials still required:
- ...

Recommended next iteration:
- ...
```

---

# 45. Product Name

暫定：

## 基隆好行
### 基隆無障礙通行回報地圖

英文：

**Keelung Accessible Map**

Tagline：

> 看見障礙，留下紀錄，讓城市一步一步更好走。

名稱未來可以再更換，不應寫死在資料 schema。

---

# 46. 最重要原則

這個專案不是第一版就要取代 1999。

它第一階段真正的目的：

```text
讓障礙被看見
讓位置被記錄
讓照片被保存
讓改善歷程留下來
讓使用者知道哪裡比較難走
讓管理單位更容易掌握問題
```

**先有一個真的能用、真的能打開、真的能回報的版本。**

之後再迭代。
