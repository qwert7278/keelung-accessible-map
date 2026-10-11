import { reportMarkerLabel } from '../utils/reportMapList';
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { CITY, type City } from "../config";
import { STATUSES, type Location, type Report } from "../types";
import { cameraKey } from "../utils/mapCamera";
type Props = {
  city?: City;
  reports: Report[];
  onSelect: (id: string) => void;
  activeReportId?: string | null;
  picking?: boolean;
  onPick?: (location: Location) => void;
  position?: Location;
  focus?: Location;
  focusZoom?: number;
  focusRevision?: number;
};
export async function createGoogleMap(node: HTMLElement, latest: () => Props) {
  setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    v: "weekly",
    language: "zh-TW",
    region: "TW",
  });
  const loaded = Promise.all([importLibrary("maps"), importLibrary("marker")]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      loaded,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Maps timeout")), 12000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  const map = new google.maps.Map(node, {
    center: (latest().city || CITY).center,
    zoom: (latest().city || CITY).zoom,
    mapId: "DEMO_MAP_ID",
    streetViewControl: false,
    mapTypeControl: false,
  });
  let markers: google.maps.marker.AdvancedMarkerElement[] = [],
    lastCamera = '', lastMarkers = '';
  const reportMarkers = new Map<string,{content:HTMLButtonElement; marker:google.maps.marker.AdvancedMarkerElement}>();
  const click = map.addListener("click", (e: google.maps.MapMouseEvent) => {
    if (latest().picking && e.latLng) latest().onPick?.(e.latLng.toJSON());
  });
  return {
    render(p: Props) {
      const markerKey=JSON.stringify([p.reports,p.position]);
      if (markerKey!==lastMarkers) {
      lastMarkers=markerKey; reportMarkers.clear();
      markers.forEach((m) => {
        m.map = null;
      });
      markers = [];
      for (const report of p.reports) {
        const content = document.createElement("button");
        content.className = `map-pin pin-${report.status}`;
        content.textContent =
          report.status === "resolved"
            ? "✓"
            : report.status === "in_progress"
              ? "…"
              : "!";
        content.setAttribute(
          "aria-label",
          `${reportMarkerLabel(report)}，${STATUSES[report.status]}`,
        );
        content.addEventListener("click", () => latest().onSelect(report.id));
        const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: report.location,
            content,
            title: reportMarkerLabel(report),
          });
        content.dataset.reportId=report.id;
        markers.push(marker); reportMarkers.set(report.id,{content,marker});
      }
      if (p.position)
        markers.push(
          new google.maps.marker.AdvancedMarkerElement({
            map,
            position: p.position,
            title: "選定位置",
          }),
        );
      }
      reportMarkers.forEach(({content,marker},id)=>{
        const active=id===p.activeReportId;
        content.classList.toggle('is-highlighted',active);
        content.setAttribute('aria-pressed',String(active));
        marker.zIndex=active?10000:undefined;
      });
      if (p.focus && cameraKey(p.focus, p.focusZoom, p.focusRevision) !== lastCamera) {
        map.setCenter(p.focus);
        if (p.focusZoom !== undefined || !lastCamera) map.setZoom(p.focusZoom ?? 16);
        lastCamera = cameraKey(p.focus, p.focusZoom, p.focusRevision);
      }
    },
    destroy() {
      click.remove();
      markers.forEach((m) => {
        m.map = null;
      });
      node.replaceChildren();
    },
  };
}
