import { describe, it, expect } from "vitest";
import { validateDraft, distanceMeters } from "./validation";
import type { ReportDraft } from "../types";
const draft: ReportDraft = {
  cityId: "TW-KEE",
  district: "仁愛區",
  title: "測試入口",
  description: "",
  address: "",
  category: "ramp",
  wheelchairAccess: "blocked",
  location: { lat: 25.13, lng: 121.74 },
};
describe("回報資料驗證", () => {
  it("地址與說明可選填", () => expect(validateDraft(draft)).toBeNull());
  it("拒絕空白標題", () =>
    expect(validateDraft({ ...draft, title: "  " })).not.toBeNull());
  it("拒絕非有限座標", () =>
    expect(
      validateDraft({ ...draft, location: { lat: NaN, lng: 121.74 } }),
    ).not.toBeNull());
  it("拒絕示範範圍外座標", () =>
    expect(
      validateDraft({ ...draft, location: { lat: 23.5, lng: 120.5 } }),
    ).not.toBeNull());
  it("拒絕未開放的城市", () =>
    expect(validateDraft({ ...draft, cityId: "TW-TPE" })).not.toBeNull());
  it("拒絕不符城市的行政區", () =>
    expect(validateDraft({ ...draft, district: "大安區" })).not.toBeNull());
  it("限制過長描述", () =>
    expect(
      validateDraft({ ...draft, description: "字".repeat(1001) }),
    ).not.toBeNull());
  it("同一點距離為零", () =>
    expect(distanceMeters(draft.location, draft.location)).toBe(0));
  it("可分辨 30 公尺內與外的回報", () => {
    expect(
      distanceMeters(draft.location, { lat: 25.1301, lng: 121.74 }),
    ).toBeLessThan(30);
    expect(
      distanceMeters(draft.location, { lat: 25.131, lng: 121.74 }),
    ).toBeGreaterThan(30);
  });
});
