export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const TARGET_UPLOAD_SIZE = 300 * 1024;
export const MAX_UPLOAD_SIZE = 1024 * 1024;
// ponytail: 26 MP / 10k-side ceiling accepts common 24 MP photos; 48 MP stays blocked.
export const MAX_IMAGE_PIXELS = 26_000_000;
export function checkImageDimensions(width: number, height: number) {
  if (!width || !height || width > 10000 || height > 10000 || width * height > MAX_IMAGE_PIXELS)
    throw new Error('照片像素過大，請使用一般拍照解析度或裁切後重試。');
}
// Read dimensions before allocating decoded pixels. HEIF containers carry ispe properties.
export async function imageDimensions(file: Blob): Promise<[number, number]> {
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer);
  const text = (at: number, count = 4) => String.fromCharCode(...bytes.slice(at, at + count));
  if (text(1, 3) === 'PNG' && bytes.length >= 24) return [view.getUint32(16), view.getUint32(20)];
  if (bytes[0] === 255 && bytes[1] === 216) {
    for (let p = 2; p + 9 < bytes.length;) {
      if (bytes[p++] !== 255) break;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = view.getUint16(p);
      if (length < 2 || p + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) return [view.getUint16(p + 5), view.getUint16(p + 3)];
      p += length;
    }
  }
  if (text(0) === 'RIFF' && text(8) === 'WEBP' && bytes.length >= 30) {
    for (let p = 12; p + 18 <= bytes.length;) {
      const type = text(p), size = view.getUint32(p + 4, true), d = p + 8;
      if (type === 'VP8X') return [1 + bytes[d+4] + (bytes[d+5]<<8) + (bytes[d+6]<<16), 1 + bytes[d+7] + (bytes[d+8]<<8) + (bytes[d+9]<<16)];
      if (type === 'VP8 ') return [view.getUint16(d+6,true)&16383,view.getUint16(d+8,true)&16383];
      if (type === 'VP8L') { const bits=view.getUint32(d+1,true); return [1+(bits&16383),1+((bits>>>14)&16383)]; }
      p += 8 + size + (size % 2);
    }
  }
  if (text(4) === 'ftyp') {
    let largest: [number,number] = [0,0];
    const boxes = (start: number, end: number, depth = 0) => {
      if (depth > 8) throw new Error('照片容器無法讀取。');
      for (let p = start; p + 8 <= end;) {
        const size=view.getUint32(p),type=text(p+4);
        if (size < 8 || p+size>end) throw new Error('照片容器無法讀取。');
        if (type==='ispe' && size>=20) {
          const w=view.getUint32(p+12),h=view.getUint32(p+16);checkImageDimensions(w,h);
          if (w*h>largest[0]*largest[1]) largest=[w,h];
        } else if (['meta','iprp','ipco'].includes(type)) boxes(p+8+(type==='meta'?4:0),p+size,depth+1);
        p+=size;
      }
    };
    boxes(0,bytes.length);
    if (largest[0]) return largest;
  }
  throw new Error('照片檔案無法讀取，請選擇其他照片。');
}
export async function compressImage(file: File): Promise<Blob> {
  const heic = ['image/heic','image/heif'].includes(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!heic && !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('請選擇手機照片、JPG、PNG 或 WebP 圖片。');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('圖片不可超過 10 MB。');
  checkImageDimensions(...await imageDimensions(file));
  let bitmap: ImageBitmap;
  try { bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}); }
  catch {
    if (!heic) throw new Error('圖片無法讀取，請改用其他照片。');
    try { bitmap=await (await import('heic-to/csp')).heicTo({blob:file,type:'bitmap'}); }
    catch { throw new Error('手機照片無法讀取，請重新拍照或選擇其他照片。'); }
  }
  try {
    checkImageDimensions(bitmap.width,bitmap.height);
    const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('瀏覽器不支援圖片處理。');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let smallest: Blob | null = null;
    for (const quality of [0.8, 0.7, 0.6]) {
      const webp = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!webp || !webp.size) throw new Error('圖片壓縮失敗。');
      if (webp.type !== 'image/webp') throw new Error('此瀏覽器無法轉換 WebP，請更新瀏覽器後重試。');
      if (!smallest || webp.size < smallest.size) smallest = webp;
      if (smallest.size <= TARGET_UPLOAD_SIZE) return smallest;
    }
    if (smallest && smallest.size <= MAX_UPLOAD_SIZE) return smallest;
    throw new Error('照片壓縮後仍超過 1 MB，請裁切需要記錄的範圍後重試。');
  } finally { bitmap.close(); }
}
export function imageUploadFormat(blob: Blob) {
  if (blob.type !== 'image/webp') throw new Error('照片處理尚未完成，請重新選擇照片。');
  if (!blob.size || blob.size > MAX_UPLOAD_SIZE) throw new Error('WebP 照片須介於 1 byte 至 1 MB。');
  return { extension: 'webp', contentType: 'image/webp' };
}
export function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('圖片讀取失敗。'));reader.readAsDataURL(blob);
  });
}
