import { CITIES } from "../config";
import { ACCESS, CATEGORIES, type ReportDraft } from "../types";
export function validateDraft(draft: ReportDraft): string | null {
  const city = CITIES.find((c) => c.id === draft.cityId);
  if (!city) return "尚未開放這個城市的回報。";
  if (!draft.title.trim() || draft.title.length > 80)
    return "請填寫 1–80 字的地點／標題。";
  if (draft.address.length > 200 || draft.description.length > 1000)
    return "地址限 200 字，說明限 1,000 字。";
  if (!city.districts.includes(draft.district)) return "請選擇行政區。";
  if (!(draft.category in CATEGORIES) || !(draft.wheelchairAccess in ACCESS))
    return "請選擇問題類型與通行程度。";
  const { lat, lng } = draft.location;
  const b = city.bounds;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < b.south ||
    lat > b.north ||
    lng < b.west ||
    lng > b.east
  )
    return `位置超出${city.name}範圍，請重新選點或切換縣市。`;
  return null;
}
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function readableError(error: unknown): string {
  if (error instanceof Error) {
    if (/quota/i.test(error.message))
      return "瀏覽器儲存空間不足，請清理本站測試資料或縮小照片後再試。";
    if (/permission|unauthorized|row-level/i.test(error.message))
      return "權限不足，請確認登入狀態或稍後再試。";
    if (/network|offline/i.test(error.message))
      return "網路連線失敗，請保留表單，稍後再試。";
    return error.message;
  }
  return "操作未完成，請稍後再試。";
}
