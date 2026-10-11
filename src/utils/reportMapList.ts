import { CATEGORIES, type Report } from '../types';
import { CITIES } from '../config';
import type { ReverseLocationResult } from '../services/locationContract';
import { displayLocationAddress } from './locationDisplay';
export const REPORT_PAGE_SIZE = 10;
export const REPORT_FOCUS_ZOOM = 17;
export function nearbyReportAddress(result:ReverseLocationResult|null,cityId:string,district:string) {
  const city=CITIES.find(city=>city.id===cityId);
  if (!city || !result?.address.trim() || result.city.replace(/^台/,'臺')!==city.name.replace(/^台/,'臺') || result.district!==district) return '';
  const address=displayLocationAddress(result.address,city.name,district,false);
  return address===city.name+district ? '' : address+'附近';
}
export function reportMarkerLabel(report:Report) {
  const city=CITIES.find(city=>city.id===report.cityId)?.name || '';
  return displayLocationAddress(report.address,city,report.district,false)+' · '+CATEGORIES[report.category];
}

export function findReportById(id:string|null,reports:Report[],linked:Report|null):Report|undefined {
  return reports.find(report=>report.id===id) || (linked?.id===id ? linked : undefined);
}
