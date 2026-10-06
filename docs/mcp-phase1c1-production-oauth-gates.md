# MCP Phase 1C.1 — Production OAuth gates unblock

2026-10-06，僅 local + roadtag-mcp-staging。B1–B4 implementation/local/staging regression PASS；Production activation 未執行。等待 code review，不啟動 Phase1D、不 merge main。

## Branch / source / deployment

- 新 clean worktree：`C:\Users\qwert\.codex\worktrees\roadtag-phase1c1-oauth-gates\Road Recall system`。
- branch：`fix/mcp-phase1c-production-oauth-gates`；基準 origin/main：`f4c58e5b09ab998f3a60ddec78e665f3c2f6f03d`。
- tested runtime commit：`433e1cc8926ea5078e60e77b998843f7110eb21e`。
- staging READY deployment：`dpl_oss2E7kpsEAP8Ruqvj4BRR3NUMdw`，target=null/Preview，exact tested SHA。
- 修正 source 在新 fix branch；為保持原 approved OAuth client/resource/consent、現有 secrets scope 與 protection exception，deployment 使用既有 `feature/mcp-phase1b-chatgpt-attachment` Preview config scope，指定新 source SHA，沒有更新舊 feature branch Git HEAD、沒有複製/揭露 secrets。
- stable staging origin：`https://keelung-accessible-map-git-feat-6bfac3-masons-projects-2c78a251.vercel.app`。
- 新分支自動 Preview 沒有 branch-scoped env，保持503。第一次 source override 同樣沒有取得 branch env；短暫 alias smoke 503 後已恢復原 deployment，再以既有 staging scope + exact修正SHA 部署成功。新 fix-branch Preview 503不算 hosted E2E PASS；上述 READY staging deployment才是驗證對象。
- 後續 handoff/docs/test-harness commit 沒有改動 tested runtime；head SHA 以 `git rev-parse HEAD` 與最終回報為準。不要誤把 main 或無 env 的新 branch Preview 當作 active staging。

## Changed files

- `supabase/migrations/20261006114815_mcp_phase1c_oauth_resource_constraint.sql`
- `src/utils/mcp-oauth-environment.ts`
- `server/mcp/oauth.ts`
- `server/mcp/config.ts`
- `src/oauth-consent.tsx`
- `.env.example`
- `package.json`（新增 test:mcp:gates，無依賴改動）
- `tests/mcp-oauth-gates.ts`
- `tests/mcp-oauth-gates-hosted.ts`
- `tests/mcp-oauth.ts`
- `tests/mcp-hosted-auth.ts`
- `docs/mcp-phase1a.md`
- 本文件。

沒有改動五個 business tools/schema、attachment downloader/normalization、photo-token pipeline、session locks、idempotency、public homepage/nav/UI、Production env/Auth/credentials。原 dirty checkout 工作檔保留。

## B1 — forward constraint migration PASS

只 DROP/ADD `private.mcp_oauth_clients.mcp_oauth_clients_resource_check`，不改歷史 migration。合法集合：exact `https://roadtag.org/api/mcp-chatgpt` 或 canonical HTTPS 單個 DNS label 的 `<host>.vercel.app/api/mcp-chatgpt`，host length<=63；不允許 userinfo、ports（包括443）、query/hash、wrong path、www/subdomain roadtag、arbitrary domains。這比舊 `[^/]+` authority regex 更嚴格。

本地 fresh baseline → Phase1A → Phase1B OAuth/budget/retry → forward migration 全部成功。合法 Preview/正式 resource accept；HTTP、近似域名、userinfo、ports、query/hash/path 全部 reject。新增正式 resource 的本地測試 rows disabled，無真實正式 client。

staging apply_migration 成功，原有 client count=1、enabled=1，Production resource rows=0；constraint已回讀。沒有重套任何歷史 migration；沒有對 Production apply。DDL會短暫鎖小型 client table，不改 grants/RLS/functions；既有資料先核對全部符合新 constraint。使用 migration 工具 transaction，保留 current client row。

歷史 OAuth SQL SHA256 保持 `2AD188DFEBB099F04FB65EFD07B15D9241765C4B836F0D47EC8D281C307524A2`。

## B2 / B3 — strict tuples PASS

server 與 consent 共用不含 secrets 的 pure `oauthTuple`：

| VERCEL_ENV / browser origin | Supabase | explicit flags | Result |
|---|---|---|---|
| preview / HTTPS canonical *.vercel.app | exact wpravdqviylkcpsioybu URL | server MCP_ENABLED+MCP_OAUTH_ENABLED true；client VITE_MCP_OAUTH_ENABLED true/public key | staging config |
| production / exact https://roadtag.org | exact ifcicahnrpkwjcxmnmug URL | 同上全部明確 true | Production code config，僅 synthetic unit test |
| 正式 origin + staging URL | mismatch | 即使true | disabled |
| Preview origin +正式 URL | mismatch | 即使true | disabled |
| VERCEL_ENV與tuple environment不一致 / development | 任意 | 即使true | disabled |
| HTTP/userinfo/port/path/query/hash/alternate host | 任意 | 即使true | disabled |
| flags absent/false | 合法配對 | disabled | disabled |

OAuthConfig carries validated supabaseUrl；issuer、JWKS、RPC/backend、Storage 都取同一 validated tuple，沒有 STAGING global backend fallback。JWT issuer/audience/algorithms/exp/iat/nbf/sub/client_id/resource/is_anonymous/role、env allowlists、live mcp_oauth_actor non-admin recheck 維持。

本地以 synthetic signing keys/JWT 測兩側 issuer/resource swap、wrong actor/client、anonymous/aud/role/time failures；Production HTTP 完全 mock，沒有產生正式 token或正式 request。Backend RPC/Storage URL routing 在 mocked fetch驗證。live staging既有 client mapping對 roadtag.org resource 回FORBIDDEN，允許DB字串不等於授權跨環境。

Consent只在approved browser-origin/build-URL/flag/publishable tuple才 createClient。Previewcopy顯示 staging；正式 code path顯示 Road Tag Closed Alpha，OAuth只授權ChatGPT連線，每筆通報另確認。無register/公共CTA。Redirect保持exact chatgpt.com HTTPS connector OAuth paths，額外拒絕顯式:443，無放寬callback目的地。

staging browser實際呈現 staging label與新consent文案；沒authorization_id時login disabled。**本輪复用已批准OAuth登入連線，未重新輸入密碼或新建consent/client**。JWT-backed工具成功且Auth session refresh時間從11:06:17 UTC更新到12:01:49及12:03:45，證明client-owned refresh後連線可用；沒有讀access/refresh token。新密碼登入表單提交沒有獨立重測，登入實作/API本身未改，tuple validator/build/UI已驗。

## B4 — legacy isolated PASS

Legacy `environment()` 同時要求 MCP_ENABLED=true + MCP_LEGACY_ALPHA_ENABLED=true，且仍hard-block正式 Supabase。Production OAuth配置不依賴legacyflag；即使legacyflag誤設true，正式project仍被拒絕。

local原Phase1A authorized legacy測試明確新增legacyflag；default absent/false endpoints503。staging修正版`/api/mcp`和`/api/mcp-photo`實際POST empty JSON皆503，ChatGPT OAuth五工具仍可用。沒有把legacyflag加到任何cloud env；既有Phase1A舊Preview若將來部署新版，operator須在其獨立Preview明確授權legacyflag，不使用Production。

## Validation evidence

| Check | Result / boundary |
|---|---|
| npm run test:mcp:gates | PASS：environment/consent/redirect/JWT/backend routing/legacy/DB constraints；fresh PGlite、synthetic JWT、mock HTTP |
| npm run test:mcp | PASS：Phase1A 73 checks、adapter/session27 checks、emittedruntime；不當HostedConcurrency證據 |
| npm run test:mcp:oauth | PASS：OAuth six checks、probe/SSRF/normalization/photo/retry/budget regressions；HEIC PENDING |
| npm run test:db | PASS：75 DB checks |
| npm run lint / npm run build / tsc -b | PASS；既有大型HEICchunk warning，無編譯錯誤；新hosted test加入後lint/typecheck亦PASS |
| git diff --check | PASS；範例env結尾多空行已修正 |
| secret scan | scoped changes無真實secret/JWT/signedattachment URL patterns；synthetic test credentials標示固定fake且不連正式 |
| official client staging initialize/list | PASS：resolve_location、search_nearby_reports、create_report、add_observation、get_report；OAuth descriptors |
| anonymous tool call | 401 + generic OAuth challenge；不匿名執行domain tool |
| authenticated staging reads | ChatGPT resolve/search/既有get_report PASS |
| actual attachment create/read | ChatGPT真實photo_file建立report並get_report PASS；status open、image present |
| real attachment replay | PASS replayed=true、原report ID；DB report/operation/photo/Storage object各1、download attempts=1 |
| hosted privileges/RLS negatives | staging transaction SET LOCAL authenticated claims；service-only mcp_oauth_actor EXECUTE與未預約Storage INSERT皆insufficient_privilege，全部rollback。另未認證HTTP privateRPC401、Storage非2xx；不將無效payload HTTP400獨立當RLS證據 |
| live cross-resource mapping | staging mcp_oauth_actor Productionresource FORBIDDEN，沒有呼叫Production |
| error/fatal logs | staged deployment recent15m aggregate沒有回傳groups；不是整段activation monitoring PASS |

Synthetic report/operation：`670378ac-02b1-411d-8f1d-6ec84f265d43`；title `Phase1C1 OAuth gates attachment QA`；description `Staging-only synthetic verification. Not a real accessibility report.`；category other、wheelchair_access passable。原真正QA附件使用，不捏造/記錄file_id或URL；原tool返回opaque字段不寫report。add_observation runtime未改，本輪local regression PASS、existing observation讀取PASS，未新增另一張observationalQA。

Screenshot：原repo ignored `output/mcp-phase1c1-evidence/chatgpt-staging-replay-pass.png`，不進Git；包含安全的replayed/report_id/status。

## Production read-only safety

Production main維持f4c58e5；部署dpl_7cUANJmfuTKB57ydnXLC2dibcNgL仍dormant。GET首頁/map200；MCP/chatgpt/OAuthmetadata503。Production DB MCP tables/functions/migrationnames/client/sessions均0。沒有任何ProductionPOST、migration、env/secrets、OAuthServer/hook/client/principal/session或report/photo寫入；沒有merge/deployProduction。

Production MCP **DISABLED**；Production OAuth **DISABLED**；Production MCP migrations **NOT APPLIED**；Production MCP writes **NONE**。

## Review / next gate

B1–B4 code readiness已解除，仍需code review後再完整重跑Phase1C啟停/kill-latency/rollback rehearsal；本輪不偷偷開始Phase1D。B6（免費backup/restore evidence）與B7（具名rollback owner/批准一人cohort/正式fresh secrets provisioning）依要求保持PENDING，沒有付費資源或正式credentialprovision。HEIC PENDING，非阻擋。

下一輪應在reviewed source SHA與同一authorized staging範圍重跑Phase1C，明確量測disable/re-enable、livegate/舊deployment closure；Production activation仍NO-GO直到operational gates關閉。
