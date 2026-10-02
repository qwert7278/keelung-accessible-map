# 路見不平 / Road Tag：CIS 本地實作紀錄

日期：2026-10-02。依據根目錄 `ROADTAG_KEELUNG_CIS_2026-10-02.md` v1.1 與使用者批准的網站調整。

## 本次結果

- 中文品牌「路見不平」、英文「Road Tag」、標語「路見不平，一起標註」。
- 首頁、地圖／管理頁、使用指南、關於、隱私權、條款及 404 的品牌文案已對齊。
- 共用 `public/brand-tokens.css`；首頁樣式在 `public/roadtag-home.css`，工具樣式在 `src/styles.css`，說明／政策頁在 `public/seo-pages.css`。
- 暖紙背景、深港灣 H1／H2、海藍與山綠插畫，主按鈕用港灣藍綠。保留既有地圖與回報流程。
- 一般主按鈕 `#09595B` → hover `#103637`；次按鈕白底 → 港灣藍綠白字；Logo 區由暖紙 → 霧藍底，不以降低 opacity 表示 hover。
- 保留狀態文字與圖示。地圖／篩選器依既有狀態分類；鍵盤焦點可見，降低動態偏好仍受支援。
- Title、description、OG／Twitter、首頁與地圖 JSON-LD 及分享圖已更新。地圖 WebPage 引用首頁同一個 WebSite。
- Canonical、網址、Threads 帳號、Supabase 與資料結構未遷移。現有 Threads URL 是實際帳號識別，不因品牌更名自行改造 URL。

## 圖片來源與輸出

所有新品牌圖皆來自使用者提供的 `logo-v2/`，原 PNG 保留。`scripts/prepare-roadtag-assets.py` 只縮放、壓縮並保留比例／Logo alpha，不重畫或重新取色。

| 原始檔時間與序號 | 網站輸出（public/images/） | 用途 | 大小 |
| --- | --- | --- | --- |
| 06_58_40 PM-1 | roadtag-logo-horizontal.webp | 各頁橫式 Logo | 56,812 bytes |
| 06_58_43 PM-3 | roadtag-hero.webp | 首頁港灣 Hero | 155,980 bytes |
| 06_58_45 PM-4 | roadtag-footer.webp | 首頁港灣 Footer | 68,914 bytes |
| 07_06_54 PM-2 | roadtag-icon-map.webp | 首頁使用步驟圖示 | 2,692 bytes |
| 07_06_58 PM-5 | roadtag-icon-info.webp | 首頁使用步驟圖示 | 2,258 bytes |
| 07_06_55 PM-3 | roadtag-icon-report.webp | 首頁使用步驟圖示 | 2,690 bytes |

`scripts/generate-og-image.py` 用上述原 Logo 與 Hero 圖構成 `public/og-image.png`，1200×630，額外文字使用「Road Tag」及正式標語。

現有 Logo 圖內仍印「RoadTag」，沿用已批准原圖；文字層使用「Road Tag」。新獨立 favicon 尚未交付，因此暫沿用既有簡化道路 SVG，改為 `#09595B`；PNG 及 Apple icon 由同一 SVG 轉出，取代舊輪椅圖案。這不是宣稱已完成 logo-v2 的獨立品牌符號。

## 驗證

- `npm run lint` 通過；既有 4 個測試檔、23 項測試通過。
- `npm run build`（含 TypeScript、Vite、SEO 生成及檢查）通過。
- SEO 檢查新增現行品牌、標語、單一 H1、共用 WebSite JSON-LD 與舊品牌殘留檢查。
- 本地瀏覽器以 CSS viewport 1440px／390px 驗證：首頁、地圖、關於頁無水平溢出；Logo／圖片正常載入。
- Demo 地圖確認 8 筆測試資料；選待改善後正確剩 4 筆；回報表單可開啟／關閉；管理頁標題與 Logo 正常。未送出回報或操作正式管理資料。
- 鍵盤 Tab 能到導覽並顯示港灣深藍焦點框。

| 色彩配對 | 對比 |
| --- | --- |
| 白字／主按鈕一般 | 8.10:1 |
| 白字／主按鈕 hover | 13.09:1 |
| 次按鈕一般及 hover | 8.10:1 |
| Logo 標語／hover 霧藍底 | 10.60:1 |
| 深色區按鈕 hover：深港灣字／黃色底 | 5.50:1 |
| 內文／暖紙底 | 12.86:1 |
| 輔助文字／暖紙底 | 5.77:1 |

以上為固定 CSS 色票計算，不等同完整網站 WCAG 認證。

截圖：`output/playwright/cis-before-desktop.jpg`、`cis-before-mobile.jpg`、`cis-after-desktop.jpg`、`cis-after-mobile.jpg`、`cis-map-desktop.jpg`、`cis-map-mobile.jpg`、`cis-form-mobile.jpg`、`cis-about-mobile.jpg`。

## 發布狀態

僅本地修改與預覽；尚未 commit／push／發布 Vercel。保留原本其他未提交工作與 `site-homepage/` 封存內容。

預覽：`http://127.0.0.1:5174/`，地圖採 Demo 模式。正式發布仍依專案既有流程，待使用者確認此次畫面。
