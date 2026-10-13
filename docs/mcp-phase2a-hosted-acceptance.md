# Road Tag｜Phase 2A Hosted Acceptance

2026-10-13（Asia/Taipei），Task `P2A-HOSTED`。**Phase 2A GO；可由 owner 確認後開始 P2B-01，不表示正式上線或各平台 client 已驗收。**

## 授權、版本與環境

- 主要規格：`ROAD_TAG_AI_AGENT_NEXT_EXECUTION_PLAN_2026-10-13.md`。沒有重做 Phase 1、五工具、UI、OAuth 或公開寫入。
- [Draft #23](https://github.com/qwert7278/keelung-accessible-map/pull/23)：`codex/roadtag-p2a-01` / `d946dad562470578bff5ba218e91d7ea3fc1b3e8`，未修改／合併。
- [Draft #24](https://github.com/qwert7278/keelung-accessible-map/pull/24)：`codex/roadtag-p2a-02`，仍 stacked on #23。最終報告 head / CI / Preview 以交付時讀回 PR metadata 為準，不在文件寫自我參照 SHA。
- 真實三工具、地址與 quota denial 的功能 SHA：`5f200b9fa00ce961e79992fba7dabd59d9d98815`；`dpl_8JNNixGAsENSKWsgsEWP8dJytE2k` / `https://keelung-accessible-obob2myvf-masons-projects-2c78a251.vercel.app` READY，branch / SHA一致。
- 移除臨時API、缺失Secret：`70830b6b6dd380cfa22fe7dff0e589b53064e89e`；`dpl_FzUBPAz6muAGG1YL6kEendvCimhW` READY。Quality push / PR CI PASS：[run](https://github.com/qwert7278/keelung-accessible-map/actions/runs/38389779785)。最終停用部署在交付時再次核對。
- 唯一DB：Staging `wpravdqviylkcpsioybu`。Migration `20261013050238_mcp_public_controls.sql` 已套用，本輪沒有 DDL / migration。
- owner 核准指定branch Preview env/redeploy、Staging新quota state暫調/復原、15分鐘指定alias access（測後撤銷）、免費隔離Geoapify key及最多10次provider calls（測後撤銷）。沒有Production、cases/photos/OAuth、merge、Registry或P2B授權。

Connector env API 原先403；owner正常登入官方CLI後branch env寫入成功。五個設定只有target=preview / gitBranch=`codex/roadtag-p2a-02`：`MCP_PUBLIC_READ_ENABLED`、`MCP_PUBLIC_READ_ORIGIN`、`MCP_PUBLIC_READ_SUPABASE_URL`、`MCP_PUBLIC_READ_SUPABASE_PUBLISHABLE_KEY`、`MCP_PUBLIC_CONTROL_SECRET`。其他分支／預設Preview／Production未覆寫。沒有借用其他人或Production/Alpha憑證，沒有關閉Deployment Protection。

SDK只向獨立核對的exact origin傳送短效保護cookie：`https://keelung-accessible-map-git-code-e64c38-masons-projects-2c78a251.vercel.app`；禁止redirect/跨origin forwarding，HTTPS各用獨立socket。CLI redeploy明確`--target preview`。API target=preview回400、staging被自動審查拒絕後未執行，改採明確Preview CLI。

## 真實 MCP E2E

官方SDK client2.1.0、Streamable HTTP、protocol2025-11-25；真實Preview+Staging，沒有使用Production案件。

| 驗收 | 結果 |
|---|---|
| initialize / tools/list | PASS：恰好resolve_location、search_nearby_reports、get_report |
| resolve_location座標 | PASS：既有公開Staging report座標，不呼叫provider |
| resolve_location地址 | PASS：基隆車站／基隆市，免費隔離Geoapify key，structuredContent成功；1次有效geocode預留 |
| search_nearby_reports | PASS：500m / include_resolved、公開projection |
| get_report | PASS：既有公開Staging report+observations，未建假案件 |
| create_report / add_observation | PASS：discovery無此工具，呼叫被拒絕 |
| 私密欄位 / invalid ID | PASS：無created_by/admin_note/image_path/photo_token/credentialHash；invalid UUID為isError |
| 有限SSE | PASS：HTTP200/text-event-stream、完整成功event，1,772ms結束；SQL leases=0 |
| 原五工具 | PASS：既有focused read-transport regression與Quality CI；未重跑Closed Alpha寫入驗收或修改其endpoint/OAuth/descriptors |

ChatGPT、Claude、Gemini、Codex、Manus的實際client仍 **PENDING，屬P2B-01，本輪未執行**。SDK結果不代替平台相容性驗收。

## Hosted Safety

| 驗收 | 結果／實際範圍 |
|---|---|
| request minute | PASS：測試cap=1，8獨立HTTPS：1 HTTP200 / 7 HTTP429，Retry-After18–20s |
| request day | PASS：新增QA counter模擬global day已滿5000，真實tools/list429、Retry-After46067s；沒有打5000次流量。先前真實RPC day cap1亦PASS |
| geocode denial | PASS：首個地址成功後，把新增QA global day counter填至200；第二個地址call HTTP200/isError/RATE_LIMITED，成本預留拒絕，不進入provider。這是tool-level denial，非HTTP429 |
| concurrency | PASS：IP/global cap1、24獨立sockets：2成功、22 HTTP429/Retry-After30。成功可先後重用名額，不宣稱同時2 active；測後leases0 |
| PostgreSQL sessions | PASS：僅鎖新增quota control row；24 Hosted請求競態，捕捉10個獨立PostgREST backend PIDs等待Lock（794295–794302、794305、794306）；請求fail closed503，leases0 |
| DB kill switch | PASS：ordinary MCP在enabled=false回503/SERVICE_UNAVAILABLE |
| wrong gate | PASS：Staging hash可逆暫調，ordinary MCP503、counters0/leases0，隨後復原；沒有輸出hash/Secret |
| missing Secret | PASS：移除指定branch Secret後部署70830b6；flag仍true、DB gate有效時503、不增counter/lease，隨後停用flag/DB |
| 權限隔離 | PASS：anon private USAGE=false、private callable0/quota helpers2；匿名管理欄位讀取401/42501，private/quota Accept-Profile406/PGRST106 |
| TTL / release | PASS：先前實際30秒TTL、release idempotency、跨RPCclients共享counter；deadline另有TTL前釋放證據 |

Supabase一次requestState過期使預備操作失敗；核對實際成功狀態後重做，沒有把該失敗當產品PASS。日額度denial使用已核准的新QA counter，不修改業務資料或實際發送大量流量。

### Hosted finding與修復

實测deadline約25.6秒回503，但worker回應後可能暫停，pending finally release未完成、lease留存。`5f200b9`加入官方`@vercel/functions`3.9.11 `waitUntil`，保留同一work promise至既有finally完成；沒有重跑工具／重扣quota／改Alpha。最小回歸先RED（未註冊background job），修復後PASS。Public focused tests、lint、build（含tsc）、Quality CI、production依賴audit0皆PASS。[Vercel waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)。

短暫QA route以exact branch/origin+獨立Secret gate保護，單一feed覆寫為可取消stalled read，走原handler+真實Staging quotas：

- Deadline：25,456ms503；5秒busy429；27,388ms ordinary tools/list恢復200，早於30秒TTL，支持實際release。SQL確認global cap1，窗口內無其他QA call或清counter/lease。
- Client abort2.121秒；1秒busy429；27,421ms恢復200。**只證明bounded cleanup，未證明2秒時Vercel request.signal立即傳播。**
- 此為合成stalled read的Hosted證據，未強制真實Geoapify timeout。slow-body實驗被Vercel緩衝，已排除，不能當handler deadline證據。
- 臨時`api/mcp-hosted-acceptance.ts`已在70830b6刪除，最終Preview404；fixture只留tests，不是部署API。

## Geoapify費用與清理

帳號畫面確認無有效付費訂閱；新`Road Tag MCP Staging`免費專案每日3,000 credits，測前requests0/credits0。沒有升級、付款或使用正式Road Tag project key。本次僅 **1個成功provider地址呼叫**，低於核准10次；第二個地址呼叫被DB quota拒絕，seeded-denial前Staging geocode day counter讀回1。

帳號統計仍0：UI明示獨立聚合，有更新延遲，**不以0冒稱無provider用量，也未聲稱帳單即時核對到1**。3,000是soft quota，不是付費硬限制；本服務另強制global geocode/day200。方案核對與有限呼叫授權符合成本驗收；帳號聚合不是即時oracle。[Geoapify pricing](https://www.geoapify.com/pricing/)。測後key撤銷，UI顯示No API keys yet；Preview兩個provider overrides移除。

真實SQL最終：**enabled=false / gate_configured=false / counters=0 / leases=0**；政策恢復60/600/600/5000、5/20/40/200、4/16。Preview flag=false、control Secret移除；交付前最終head部署READY，認證probe503、臨時API404。短效alias access撤銷、本機臨時credential/hash檔刪除；正常CLI owner登入不轉存／輸出Token。

Production最新唯讀核對`df3d605026133038104c51a1f0488fb7ab5ab7bd` / `dpl_Ar67B93Rf9LTUVRyG2KsAAHxG3Vt` READY。舊snapshot後main的#25–27是其他UI工作，沒有MCP/server/migration差異；未把舊44654f0當成最新正式SHA。本輪未merge、部署Production、建立案件／照片／OAuth或放寬寫入權限，主工作目錄dirty修改未覆蓋。

獨立review見`docs/mcp-p2a-fix-review.md`：無未解決P0/P1/P2。沒有需owner補做的環境操作。**建議下一個Task P2B-01，本輪停止等待確認。** #23/#24仍Draft，未來合併前要按當下main檢查stack/base與CI；不是本輪合併授權。
