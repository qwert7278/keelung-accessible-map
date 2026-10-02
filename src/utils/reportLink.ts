export function reportIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("report");
}

export function reportShareUrl(origin: string, reportId: string): string {
  const url = new URL("/map", origin);
  url.searchParams.set("report", reportId);
  return url.toString();
}
