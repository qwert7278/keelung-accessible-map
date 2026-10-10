import { CITIES } from '../config';
import { CATEGORIES, type ReportDraft } from '../types';

export function defaultReportTitle(draft:ReportDraft):string {
  const city=CITIES.find(c=>c.id===draft.cityId)?.name ?? '';
  const place=draft.address.trim() || `${city}${draft.district}已標記位置`;
  const suffix=` · ${CATEGORIES[draft.category]}`;
  return `${place.slice(0,80-suffix.length)}${suffix}`;
}
