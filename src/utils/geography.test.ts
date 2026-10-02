import { describe, expect, it } from 'vitest';
import { CITIES } from '../config';
import { initialGeography, mapLink } from './geography';
import { validateDraft } from './validation';

describe('全台地圖範圍', () => {
  it('提供 22 縣市與 368 個行政區，沒有重複城市代碼', () => {
    expect(CITIES).toHaveLength(22);
    expect(CITIES.reduce((n, c) => n + c.districts.length, 0)).toBe(368);
    expect(new Set(CITIES.map(c => c.id)).size).toBe(22);
  });
  it('各縣市預設中心行政區及座標都能用於本地回報', () => {
    for (const city of CITIES) {
      expect(city.districts[0]).toBe(city.defaultDistrict);
      expect(validateDraft({ cityId: city.id, district: city.defaultDistrict, location: city.center,
        title: '騎樓入口', description: '', address: '', category: 'level_difference', wheelchairAccess: 'difficult' })).toBeNull();
    }
  });
  it('切換城市時不沿用其他城市的行政區', () => {
    expect(initialGeography('?city=TW-TPE&district=仁愛區').district).toBe('中山區');
    expect(initialGeography('?city=TW-KEE').district).toBe('仁愛區');
  });
  it('首頁案件連結保留城市、行政區與案件', () => {
    const link = mapLink('TW-TPE', '中山區', 'test-report');
    const query = link.slice(link.indexOf('?'));
    expect(initialGeography(query).city.id).toBe('TW-TPE');
    expect(initialGeography(query).district).toBe('中山區');
    expect(new URLSearchParams(query).get('report')).toBe('test-report');
  });
});
