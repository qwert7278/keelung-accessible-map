/** A per-photo worker keeps Safari WebP encoding off the UI thread. */
export function createWebpEncoder(canvas: HTMLCanvasElement) {
  const worker = new Worker(new URL('../workers/webp-encoder.ts', import.meta.url), { type: 'module' });
  return {
    encode(quality: number): Promise<Blob> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { worker.terminate(); reject(new Error('照片處理逾時，請重試或裁切後重新選擇。')); }, 45000);
        worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; error?: string }>) => {
          clearTimeout(timer);
          if (event.data.error || !event.data.buffer?.byteLength) reject(new Error('照片處理失敗，請重新選擇照片後重試。'));
          else resolve(new Blob([event.data.buffer], { type: 'image/webp' }));
        };
        worker.onerror = () => { clearTimeout(timer); reject(new Error('照片處理元件無法載入，請確認網路連線後重試。')); };
        try {
          const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
          worker.postMessage({ pixels, width: canvas.width, height: canvas.height, quality }, [pixels.buffer]);
        } catch (error) { clearTimeout(timer); reject(error); }
      });
    },
    dispose() { worker.terminate(); },
  };
}
