import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CITY, type City } from "../config";
import { STATUSES, type Location, type Report } from "../types";

import { cameraKey } from "../utils/mapCamera";
type Props = {
  city?: City;
  reports: Report[];
  onSelect: (id: string) => void;
  picking?: boolean;
  onPick?: (location: Location) => void;
  position?: Location;
  focus?: Location;
  focusZoom?: number;
  focusRevision?: number;
};
type Controller = { render: (props: Props) => void; destroy: () => void };
function markerElement(report: Report) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `map-pin pin-${report.status}`;
  el.textContent =
    report.status === "resolved"
      ? "✓"
      : report.status === "in_progress"
        ? "…"
        : "!";
  el.setAttribute("aria-label", `${report.title}，${STATUSES[report.status]}`);
  el.title = `${report.title} · ${STATUSES[report.status]}`;
  return el;
}
export default function MapView(props: Props) {
  const node = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    controller = useRef<Controller | null>(null);
  const [notice, setNotice] = useState("");
  latest.current = props;
  useEffect(() => {
    let disposed = false;
    async function start() {
      if (
        import.meta.env.VITE_MAP_PROVIDER === "google" &&
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      ) {
        try {
          const { createGoogleMap } = await import("../services/maps");
          const control = await createGoogleMap(
            node.current!,
            () => latest.current,
          );
          if (disposed) {
            control.destroy();
            return;
          }
          controller.current = control;
          control.render(latest.current);
          return;
        } catch {
          if (disposed) return;
          setNotice("Google 地圖暫時無法載入，已切換 OpenStreetMap。");
        }
      }
      if (disposed || !node.current) return;
      const map = L.map(node.current, {
        center: [(latest.current.city || CITY).center.lat, (latest.current.city || CITY).center.lng],
        zoom: (latest.current.city || CITY).zoom,
        scrollWheelZoom: false,
      });
      const tiles = L.tileLayer(
        import.meta.env.VITE_OSM_TILE_URL ||
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      ).addTo(map);
      tiles.on("tileerror", () =>
        setNotice("底圖部分載入失敗，仍可使用案件列表或輸入座標回報。"),
      );
      const layer = L.layerGroup().addTo(map);
      let lastCamera = '';
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (latest.current.picking)
          latest.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      controller.current = {
        render(p) {
          layer.clearLayers();
          p.reports.forEach((report) => {
            const button = markerElement(report);
            button.addEventListener("click", (e) => {
              e.stopPropagation();
              p.onSelect(report.id);
            });
            L.marker([report.location.lat, report.location.lng], {
              icon: L.divIcon({
                html: button,
                className: "marker-shell",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              }),
              keyboard: false,
            }).addTo(layer);
          });
          if (p.position)
            L.circleMarker([p.position.lat, p.position.lng], {
              color: "#155e52",
              fillColor: "#fff",
              fillOpacity: 1,
              radius: 11,
              weight: 5,
            }).addTo(layer);
          if (p.focus && cameraKey(p.focus, p.focusZoom, p.focusRevision) !== lastCamera) {
            const center: L.LatLngExpression = [p.focus.lat, p.focus.lng];
            map.setView(center, p.focusZoom ?? (lastCamera ? map.getZoom() : 16), { animate: false });
            lastCamera = cameraKey(p.focus, p.focusZoom, p.focusRevision);
          }
          node.current?.classList.toggle("picking", !!p.picking);
        },
        destroy() {
          map.remove();
        },
      };
      controller.current.render(latest.current);
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(node.current);
      const destroy = controller.current.destroy;
      controller.current.destroy = () => {
        observer.disconnect();
        destroy();
      };
    }
    void start();
    return () => {
      disposed = true;
      controller.current?.destroy();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    controller.current?.render(props);
  }, [props]);
  return (
    <div className="map-frame">
      <div
        ref={node}
        className="map-canvas"
        role="region"
        aria-label={
          props.picking
            ? "選擇回報位置的地圖，也可在下方輸入座標"
            : `${props.city?.name || CITY.name}騎樓與人行道回報地圖，亦可使用旁邊案件列表`
        }
      />
      {notice && (
        <p className="map-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
