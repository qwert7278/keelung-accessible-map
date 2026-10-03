import { describe, expect, it } from 'vitest';
import { readConsent } from './consent';
import { cityFromHeaders } from './geo-city';
import { GET } from '../../api/location';

const cookie = (preferences: boolean, expires = Date.now() + 10000) => 'roadtag-consent=' + encodeURIComponent(JSON.stringify({ version:1, preferences, expires }));
describe('Cookie 與 IP 城市建議', () => {
  it('沒有有效選擇時不視為同意', () => {
    expect(readConsent('')).toBeNull();
    expect(readConsent('roadtag-consent=broken')).toBeNull();
    expect(readConsent(cookie(true, 1))).toBeNull();
    expect(readConsent(cookie(false))?.preferences).toBe(false);
  });
  it('未同意或已到期時端點拒絕城市推估', async () => {
    for (const value of ['', cookie(false), cookie(true, 1)]) {
      const response = GET(new Request('https://roadtag.org/api/location', { headers: { cookie:value, 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'TPE' } }));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ cityId:null });
    }
  });
  it('同意後只回傳縣市、不回傳原始 IP 或座標，且禁止共用快取', async () => {
    const response = GET(new Request('https://roadtag.org/api/location', { headers: { cookie:cookie(true), 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'KHH', 'x-real-ip':'192.0.2.1' } }));
    expect(await response.json()).toEqual({ cityId:'TW-KHH', source:'ip-city' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
  });
  it('縣市代碼優先，避免把新竹縣或嘉義縣誤認為市', () => {
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'HSQ', 'x-vercel-ip-city':'Hsinchu' }))).toBe('TW-HSQ');
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-city':'Chiayi' }))).toBeNull();
  });
  it('未知地區、海外、損壞字串不猜城市', () => {
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'US', 'x-vercel-ip-city':'Taipei' }))).toBeNull();
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-city':'%broken' }))).toBeNull();
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-city':'unknown' }))).toBeNull();
  });
  it('支援編碼城市名稱與標準 ISO 區域代碼', () => {
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-city':'New%20Taipei%20City' }))).toBe('TW-NWT');
    expect(cityFromHeaders(new Headers({ 'x-vercel-ip-country':'TW', 'x-vercel-ip-country-region':'TW-TPE' }))).toBe('TW-TPE');
  });
});
