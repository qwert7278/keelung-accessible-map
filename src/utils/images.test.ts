import { describe, expect, it } from "vitest";
import { compressImage, MAX_IMAGE_SIZE } from "./images";

describe("照片上傳邊界", () => {
  it("拒絕 SVG，不交給解碼器", async () => {
    await expect(
      compressImage(
        new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPG");
  });
  it("拒絕超過 10 MB 的檔案", async () => {
    await expect(
      compressImage(
        new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).rejects.toThrow("10 MB");
  });
});
