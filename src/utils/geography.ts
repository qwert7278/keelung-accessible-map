import { CITIES, CITY } from '../config';

export function initialGeography(search = window.location.search) {
  const query = new URLSearchParams(search);
  let saved: { city?: string; district?: string } = {};
  try { saved = JSON.parse(sessionStorage.getItem('roadtag-geography') || '{}'); } catch { /* Optional preference. */ }
  const city = CITIES.find(c => c.id === (query.get('city') || (query.has('report') ? CITY.id : saved.city))) || CITY;
  const requested = query.get('district') || (!query.has('city') ? saved.district : undefined);
  const district = requested === 'all' || city.districts.includes(requested || '') ? requested! : city.defaultDistrict;
  return { city, district };
}
export function rememberGeography(city: string, district: string) {
  try { sessionStorage.setItem('roadtag-geography', JSON.stringify({ city, district })); } catch { /* Optional preference. */ }
}
export function mapLink(city: string, district: string, report?: string) {
  const query = new URLSearchParams({ city, district });
  if (report) query.set('report', report);
  return `/map?${query}`;
}
