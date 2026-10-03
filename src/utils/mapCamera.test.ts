import { describe, expect, it } from 'vitest';
import { CITIES } from '../config';
import { cameraKey, districtCamera } from './mapCamera';
import { revisionGate } from './revisionGate';
import { geographyUrl } from './geography';

describe('district camera and asynchronous revisions', () => {
  it('has a valid center for all 368 administrative districts, even without reports', () => {
    expect(CITIES.reduce((n, city) => n + city.districts.length, 0)).toBe(368);
    for (const city of CITIES) for (const district of city.districts) {
      const camera = districtCamera(city, district);
      expect(Number.isFinite(camera.focus.lat) && Number.isFinite(camera.focus.lng)).toBe(true);
      if (district !== city.defaultDistrict) expect(camera.focus).not.toBe(city.center);
    }
  });
  it('moves to the selected district rather than using a report or the previous district', () => {
    const city = CITIES[0];
    expect(districtCamera(city, '七堵區').focus).not.toEqual(districtCamera(city, '仁愛區').focus);
    expect(districtCamera(city, '七堵區').focus.lng).toBeLessThan(city.center.lng);
  });
  it('a refreshed coordinate object does not move the camera, while a deliberate repeat does', () => {
    const point = { lat:25.15, lng:121.76 };
    expect(cameraKey(point, 14)).toBe(cameraKey({ ...point }, 14));
    expect(cameraKey(point, 14, 1)).not.toBe(cameraKey(point, 14, 2));
  });
  it('invalidates older photo or request results and results after unmount', () => {
    const gate = revisionGate(); const first = gate.next(); const second = gate.next();
    expect(gate.current(first)).toBe(false); expect(gate.current(second)).toBe(true);
    gate.invalidate(); expect(gate.current(second)).toBe(false);
  });
  it('cleared district URLs survive reload and remove an old report selection', () => {
    const url = geographyUrl('https://roadtag.org/map?city=TW-KEE&district=仁愛區&report=old', 'TW-KEE', 'all');
    expect(url.searchParams.get('district')).toBe('all'); expect(url.searchParams.has('report')).toBe(false);
  });
});
