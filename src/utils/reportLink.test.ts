import { describe, expect, it } from "vitest";
import { reportIdFromSearch, reportShareUrl } from "./reportLink";

describe("案件分享連結", () => {
  it('includes the case city and district rather than receiver preferences', () => {
    const url = new URL(reportShareUrl('https://roadtag.org', 'taipei-case', { cityId:'TW-TPE', district:'中正區' }));
    expect(url.searchParams.get('city')).toBe('TW-TPE'); expect(url.searchParams.get('district')).toBe('中正區'); expect(url.searchParams.get('report')).toBe('taipei-case');
  });
  it("從網址讀取案件 ID，讓分享連結可直接開啟案件", () => {
    expect(reportIdFromSearch("?report=report-123")).toBe("report-123");
    expect(reportIdFromSearch("?filter=open")).toBeNull();
    expect(reportShareUrl("https://example.test", "report-123")).toBe(
      "https://example.test/map?report=report-123",
    );
  });
});
