import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { CITY } from "../config";
import { STATUSES, type Location, type Report } from "../types";
type Props = {
  reports: Report[];
  onSelect: (id: string) => void;
  picking?: boolean;
  onPick?: (location: Location) => void;
  position?: Location;
  focus?: Location;
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
    center: CITY.center,
    zoom: CITY.zoom,
    mapId: "DEMO_MAP_ID",
    streetViewControl: false,
    mapTypeControl: false,
  });
  let markers: google.maps.marker.AdvancedMarkerElement[] = [],
    lastFocus: Location | undefined;
  const click = map.addListener("click", (e: google.maps.MapMouseEvent) => {
    if (latest().picking && e.latLng) latest().onPick?.(e.latLng.toJSON());
  });
  return {
    render(p: Props) {
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
          `${report.title}，${STATUSES[report.status]}`,
        );
        content.addEventListener("click", () => p.onSelect(report.id));
        markers.push(
          new google.maps.marker.AdvancedMarkerElement({
            map,
            position: report.location,
            content,
            title: report.title,
          }),
        );
      }
      if (p.position)
        markers.push(
          new google.maps.marker.AdvancedMarkerElement({
            map,
            position: p.position,
            title: "選定位置",
          }),
        );
      if (p.focus && p.focus !== lastFocus) {
        map.setCenter(p.focus);
        if (!lastFocus) map.setZoom(16);
        lastFocus = p.focus;
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
