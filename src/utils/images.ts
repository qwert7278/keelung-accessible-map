export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
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
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("瀏覽器不支援圖片處理。");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("圖片壓縮失敗。"))),
        "image/jpeg",
        0.8,
      ),
    );
  } finally {
    bitmap.close();
  }
}
export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("圖片讀取失敗。"));
    reader.readAsDataURL(blob);
  });
}
