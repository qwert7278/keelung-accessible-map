# ROADTAG-GEOCODING-STAGING-ACCEPTANCE-01

2026-10-16（Asia/Taipei）。基準main `0435c47c4e0289fbe9390cc3e8a39f4d96934042`；分支 `codex/geocoding-staging-acceptance`。Production文字搜尋保持關閉，本輪不重審#35。

Owner已明確接受軟額度風險並核准限定Staging窗口：建立既有隔離Geoapify專案臨時key；只啟用Supabase wpravdqviylkcpsioybu與本分支Preview，獨立gate／DB hash；必要15分鐘alias存取；最多8次Provider、24次MCP HTTP，不重試、不付費升級；測後停用、撤銷臨時key／存取並清gate／counter／lease。不是Production啟用授權。

## 帳務與基線（唯讀）

- Geoapify既有專案Road Tag MCP Staging，與Road Tag分開；Current plan Free／每日3,000 credits，No API keys。
- 帳號Subscriptions & Billing：No active paid subscriptions、No invoices found；不推定從未保存付款方式。
- Usage & statistics選定Sep16–Oct16,2026：Total requests0、Credits used0、Daily credits limit3,000。這是讀取當時狀態，非供應商帳單硬停保證。
- [Pricing](https://www.geoapify.com/pricing/)明列soft quota；[Terms](https://www.geoapify.com/terms-and-conditions/)保留超額收費／停權權利。Owner接受本有限窗口的已知風險；Production Public project隔離、硬停／最高費用仍須另確認。
- Staging DB：enabled=false、gate未配置、counter=0、lease=0。原policy：request risk60/min、600/day，global600/min、5000/day；geocode risk5/min、20/day，global40/min、200/day；concurrent risk4、global16。不得誤稱程式預設已是帳單硬上限。

## 執行狀態

PENDING：Preview、臨時憑證尚未配置，Provider呼叫0。完成後逐筆記錄查詢、候選、行政區、來源、needs_confirmation及真實精度；不假造成功、不自選第一筆。

測試矩陣最多8筆：公共門牌（基隆市中正區義一路1號）、公共巷弄門牌（臺北市中正區汀州路三段230巷14弄2號）、基隆車站、衛生福利部基隆醫院、商家、跨縣市地標、模糊地標、預期無結果。門牌與巷弄地址依[基隆市政府](https://www.klcg.gov.tw/tw/klcg1/3331.html)、[寶藏巖官方](https://www.artistvillage.org/contact.php)核對；其餘精確查詢於執行前固定，不使用私人住址。上游異常／計費不明立即停止，失敗／取消也計數，不補打。

Cleanup與最終Production GO／NO-GO待實際執行後填入。未完成不能宣稱實測PASS。
