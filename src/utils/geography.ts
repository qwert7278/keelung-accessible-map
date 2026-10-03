import { CITIES, CITY } from '../config';
import { readConsent } from './consent';

export function initialGeography(search = window.location.search) {
  const query = new URLSearchParams(search);
  let saved: { city?: string; district?: string } = {};
  try { if (readConsent()?.preferences) saved = JSON.parse(localStorage.getItem('roadtag-geography') || sessionStorage.getItem('roadtag-geography') || '{}'); } catch { /* Optional preference. */ }
  const city = CITIES.find(c => c.id === (query.get('city') || (query.has('report') ? CITY.id : saved.city))) || CITY;
  const requested = query.get('district') || (!query.has('city') ? saved.district : undefined);
  const district = requested === 'all' || city.districts.includes(requested || '') ? requested! : city.defaultDistrict;
  return { city, district };
}
export function rememberGeography(city: string, district: string) {
  if (!readConsent()?.preferences) return;
  try { localStorage.setItem('roadtag-geography', JSON.stringify({ city, district })); } catch { /* Optional preference. */ }
}
export function mapLink(city: string, district: string, report?: string) {
  const query = new URLSearchParams({ city, district });
  if (report) query.set('report', report);
  return `/map?${query}`;
}

export function shouldSuggestCity(search = window.location.search) {
  const query = new URLSearchParams(search);
  if (['city', 'district', 'report'].some(key => query.has(key))) return false;
  try {
    const saved = JSON.parse(localStorage.getItem('roadtag-geography') || sessionStorage.getItem('roadtag-geography') || '{}');
    if (readConsent()?.preferences && CITIES.some(city => city.id === saved.city)) return false;
  } catch { /* No stored preference. */ }
  return true;
}
