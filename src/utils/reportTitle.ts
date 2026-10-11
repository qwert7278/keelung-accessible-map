import { displayLocationAddress } from './locationDisplay';
import { CITIES } from '../config';
import { CATEGORIES, type Report, type ReportDraft } from '../types';

export function defaultReportTitle(draft:ReportDraft):string {
  const city=CITIES.find(c=>c.id===draft.cityId)?.name ?? '';
  const place=(draft.address.trim() ? displayLocationAddress(draft.address,city,draft.district,false) : '') || `${city}${draft.district}已標記位置`;
  const suffix=` · ${CATEGORIES[draft.category]}`;
  return `${place.slice(0,80-suffix.length)}${suffix}`;
}

/** Normalize generated address titles without discarding a user's custom title. */
export function displayReportTitle(report:Report):string {
  const category=CATEGORIES[report.category];
  const prefix=report.title.endsWith(category) ? report.title.slice(0,-category.length).replace(/\s*[·・]\s*$/,'') : report.title;
  const city=CITIES.find(city=>city.id===report.cityId)?.name || '';
  if (report.address.trim() && prefix.trim()===report.address.trim() || report.title.endsWith(category) && prefix===`${city}${report.district}已標記位置`) {
    return defaultReportTitle({...report,title:''});
  }
  return report.title;
}
