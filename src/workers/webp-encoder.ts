import encode, { init } from '@jsquash/webp/encode';
import scalarUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

// Both codecs are served by our own site; no photo is sent to a service.
const ready = init({ locateFile: (path: string) => path.includes('simd') ? simdUrl : scalarUrl });
self.onmessage = async (event: MessageEvent<{ pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number; quality: number }>) => {
  try {
    await ready;
    const { pixels, width, height, quality } = event.data;
    const data = new ImageData(pixels, width, height);
    const buffer = await encode(data, { quality: quality * 100 });
    self.postMessage({ buffer }, { transfer: [buffer] });
  } catch {
    self.postMessage({ error: '照片處理失敗，請重新選擇照片後重試。' });
  }
};
