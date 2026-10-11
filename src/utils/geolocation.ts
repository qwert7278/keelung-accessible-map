import type { Location } from '../types';

export const GPS_TIMEOUT_MS = 20000;
export function gpsErrorMessage(code?: number) {
  if (code === 1) return '定位權限被拒絕。請允許此網站使用位置，並在手機設定確認定位服務與 Chrome 的位置權限；也可搜尋地點或點選地圖。';
  if (code === 2) return '目前無法取得位置。請確認手機定位服務已開啟，移到訊號較佳處再試；也可搜尋地點或點選地圖。';
  if (code === 3) return '定位逾時。請移到訊號較佳處再試，或使用搜尋地點／地圖選點；尚未選取你的目前位置。';
  return '無法取得定位。請確認瀏覽器與手機的位置權限，或使用搜尋地點／地圖選點。';
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
