import { mapLink } from './geography';
export function reportIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("report");
}

export function reportShareUrl(origin: string, reportId: string, geography?: { cityId: string; district: string }): string {
  const url = new URL(geography ? mapLink(geography.cityId, geography.district) : "/map", origin);
  url.searchParams.set("report", reportId);
  return url.toString();
}
