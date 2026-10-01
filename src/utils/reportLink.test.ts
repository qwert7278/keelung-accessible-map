import { describe, expect, it } from "vitest";
import { reportIdFromSearch, reportShareUrl } from "./reportLink";

describe("案件分享連結", () => {
  it("從網址讀取案件 ID，讓分享連結可直接開啟案件", () => {
    expect(reportIdFromSearch("?report=report-123")).toBe("report-123");
    expect(reportIdFromSearch("?filter=open")).toBeNull();
    expect(reportShareUrl("https://example.test", "report-123")).toBe(
      "https://example.test/?report=report-123",
    );
  });
});
