import type { Location } from '../types';

export const GPS_TIMEOUT_MS = 20000;
export function gpsErrorMessage(code?: number, userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  const windows = /Windows/.test(userAgent);
  const chrome = /Chrome|CriOS/.test(userAgent) && !/Edg|OPR/.test(userAgent);
  const browser = ios
    ? '請在 iOS「設定 → 隱私權與安全性 → 定位服務」確認定位已開啟，並允許'+(chrome ? ' Chrome' : '目前使用的瀏覽器')+'使用位置；也請檢查此網站的位置權限。'
    : chrome
      ? '請點網址列左側的網站資訊／權限圖示，將「位置」改為允許，再重新嘗試。'
      : '請在瀏覽器的網站權限設定中，允許此網站使用位置，再重新嘗試。';
  const system = windows ? '若仍無法定位，請在 Windows 設定搜尋「位置」，確認定位服務與應用程式的位置存取已開啟。' : '';
  const alternative = '也可直接搜尋地址或點選地圖，不必啟用定位。';
  if (code === 1) return '定位權限被拒絕。'+browser+system+alternative;
  if (code === 2) return '目前無法取得位置。請確認裝置定位服務已開啟，移到訊號較佳處再試。'+system+alternative;
  if (code === 3) return '定位逾時。請移到訊號較佳處再試，或使用搜尋地點／地圖選點；尚未選取你的目前位置。';
  return '無法取得定位。'+browser+system+alternative;
}

// A watchdog also bounds browsers that never invoke either callback (e.g. a pending permission prompt).
export function currentPosition(geolocation: Geolocation, signal: AbortSignal): Promise<{location: Location; accuracy: number}> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      action();
    };
    const abort = () => finish(() => reject(new DOMException('Canceled', 'AbortError')));
    const timer = setTimeout(() => finish(() => reject(new Error(gpsErrorMessage(3)))), GPS_TIMEOUT_MS);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, {once: true});
    try {
      geolocation.getCurrentPosition(position => finish(() => {
        const location = {lat: position.coords.latitude, lng: position.coords.longitude};
        if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || Math.abs(location.lat)>90 || Math.abs(location.lng)>180) {
          reject(new Error(gpsErrorMessage(2))); return;
        }
        resolve({location, accuracy: position.coords.accuracy});
      }), error => finish(() => reject(new Error(gpsErrorMessage(error.code)))),
      {timeout: GPS_TIMEOUT_MS, enableHighAccuracy: true, maximumAge: 0});
    } catch { finish(() => reject(new Error(gpsErrorMessage()))); }
  });
}
