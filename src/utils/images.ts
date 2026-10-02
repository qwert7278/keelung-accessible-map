export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const TARGET_UPLOAD_SIZE = 300 * 1024;
export const MAX_UPLOAD_SIZE = 1024 * 1024;
export async function compressImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("請選擇 JPG、PNG 或 WebP 圖片。");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("圖片不可超過 10 MB。");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("圖片無法讀取，請改用其他照片。");
  });
  try {
    const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("瀏覽器不支援圖片處理。");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let smallest: Blob | null = null;
    for (const quality of [0.8, 0.7, 0.6]) {
      const webp = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (!webp || !webp.size) throw new Error("圖片壓縮失敗。");
      // Unsupported encoders can silently return PNG. Never upload that as WebP.
      if (webp.type !== "image/webp")
        throw new Error("此瀏覽器無法轉換 WebP，請更新瀏覽器後重試。");
      if (!smallest || webp.size < smallest.size) smallest = webp;
      if (smallest.size <= TARGET_UPLOAD_SIZE) return smallest;
    }
    // Keep road details readable rather than reducing quality without a floor.
    if (smallest && smallest.size <= MAX_UPLOAD_SIZE) return smallest;
    throw new Error("照片壓縮後仍超過 1 MB，請裁切需要記錄的範圍後重試。");
  } finally {
    bitmap.close();
  }
}
export function imageUploadFormat(blob: Blob) {
  if (blob.type !== "image/webp") throw new Error("請先將照片轉成 WebP 再上傳。");
  if (!blob.size || blob.size > MAX_UPLOAD_SIZE) throw new Error("WebP 照片須介於 1 byte 至 1 MB。");
  return { extension: "webp", contentType: "image/webp" };
}
export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("圖片讀取失敗。"));
    reader.readAsDataURL(blob);
  });
}
