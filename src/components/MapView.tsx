import { reportMarkerLabel } from '../utils/reportMapList';
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";
import { CITY, type City } from "../config";
import { STATUSES, type Location, type Report } from "../types";

import { districtRegions } from '../utils/districtBoundary';
import { cameraKey, cityOverviewBounds } from "../utils/mapCamera";
import { watchMapTileHealth } from "../utils/mapTileHealth";
type Props = {
  city?: City;
  cityOverview?: boolean;
  cityRegions?: Awaited<ReturnType<typeof districtRegions>>;
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
type Controller = { render: (props: Props) => void; destroy: () => void; retryTiles?: () => void };
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
  el.setAttribute("aria-label", `${reportMarkerLabel(report)}，${STATUSES[report.status]}`);
  el.title = `${reportMarkerLabel(report)} · ${STATUSES[report.status]}`;
  return el;
}
export default function MapView(props: Props) {
  const node = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    controller = useRef<Controller | null>(null);
  const [notice, setNotice] = useState("");
  const [tileFailure, setTileFailure] = useState(false);
  const [regions, setRegions] = useState<Awaited<ReturnType<typeof districtRegions>>>([]);
  const viewProps = {...props, cityRegions: regions};
  latest.current = viewProps;
  const cityId = (props.city || CITY).id;
  useEffect(() => {
    let active = true;
    setRegions([]);
    if (props.cityOverview) void districtRegions(cityId).then(rows => {
      if (active) setRegions(rows);
    }).catch(() => { /* Bounds remain usable if the optional outline cannot load. */ });
    return () => { active = false; };
  }, [cityId, props.cityOverview]);
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
      );
      const stopWatchingTiles = watchMapTileHealth(map, tiles, setTileFailure);
      tiles.addTo(map);
      const layer = L.layerGroup().addTo(map);
      const boundaryLayer = L.layerGroup().addTo(map);
      let lastRegions: Props['cityRegions'], lastOverview = false;
      let lastCamera = '', lastMarkers = '';
      const reportMarkers = new Map<string, {button:HTMLButtonElement; marker:L.Marker}>();
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (latest.current.picking)
          latest.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      controller.current = {
        render(p) {
          if (lastRegions !== p.cityRegions || lastOverview !== !!p.cityOverview) {
            boundaryLayer.clearLayers();
            lastRegions = p.cityRegions; lastOverview = !!p.cityOverview;
            if (p.cityOverview) for (const region of p.cityRegions || []) {
              L.polygon(region.polygons.map(polygon => polygon.map(ring => ring.map(([lng,lat]) => [lat,lng] as L.LatLngTuple))),
                {color:'#08787c', weight:2, fillOpacity:0.025, interactive:false}).addTo(boundaryLayer);
            }
          }
          const markerKey = JSON.stringify([p.reports,p.position]);
          if (markerKey !== lastMarkers) {
          lastMarkers = markerKey;
          layer.clearLayers(); reportMarkers.clear();
          p.reports.forEach((report) => {
            const button = markerElement(report);
            button.addEventListener("click", (e) => {
              e.stopPropagation();
              latest.current.onSelect(report.id);
            });
            const marker = L.marker([report.location.lat, report.location.lng], {
              icon: L.divIcon({
                html: button,
                className: "marker-shell",
                iconSize: [44, 44],
                iconAnchor: [22, 22],
              }),
              keyboard: false,
            }).addTo(layer);
            button.dataset.reportId = report.id;
            reportMarkers.set(report.id,{button,marker});
          });
          if (p.position)
            L.circleMarker([p.position.lat, p.position.lng], {
              color: "#155e52",
              fillColor: "#fff",
              fillOpacity: 1,
              radius: 11,
              weight: 5,
            }).addTo(layer);
          }
          reportMarkers.forEach(({button,marker},id)=>{
            const active=id===p.activeReportId;
            button.classList.toggle('is-highlighted',active);
            button.setAttribute('aria-pressed',String(active));
            marker.setZIndexOffset(active?10000:0);
          });
          const overviewBounds = cityOverviewBounds(p.city || CITY, p.cityRegions || [], p.reports);
          const nextCamera = p.cityOverview ? `city:${(p.city || CITY).id}:${JSON.stringify(overviewBounds)}:${p.focusRevision || 0}` : cameraKey(p.focus, p.focusZoom, p.focusRevision);
          if (p.cityOverview && nextCamera !== lastCamera) {
            const b = overviewBounds;
            map.fitBounds([[b.south,b.west],[b.north,b.east]], {padding:[24,24], animate:false});
            lastCamera = nextCamera;
          } else if (!p.cityOverview && p.focus && nextCamera !== lastCamera) {
            const center: L.LatLngExpression = [p.focus.lat, p.focus.lng];
            map.setView(center, p.focusZoom ?? (lastCamera ? map.getZoom() : 16), { animate: false });
            lastCamera = cameraKey(p.focus, p.focusZoom, p.focusRevision);
          }
          node.current?.classList.toggle("picking", !!p.picking);
        },
        destroy() {
          stopWatchingTiles();
          map.remove();
        },
        retryTiles() {
          tiles.redraw();
        },
      };
      controller.current.render(latest.current);
      const observer = new ResizeObserver(() => {
        map.invalidateSize();
        if (latest.current.cityOverview) {
          const b = cityOverviewBounds(latest.current.city || CITY, latest.current.cityRegions || [], latest.current.reports);
          map.fitBounds([[b.south,b.west],[b.north,b.east]], {padding:[24,24], animate:false});
        }
      });
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
    controller.current?.render(viewProps);
  }, [props, regions]);
  return (
    <div className="map-frame">
      <div
        ref={node}
        className="map-canvas"
        role="region"
        aria-label={
          props.picking
            ? "選擇回報位置的地圖，可直接點選障礙現場"
            : `${props.city?.name || CITY.name}騎樓與人行道回報地圖，亦可使用旁邊案件列表`
        }
      />
      {(tileFailure || notice) && (
        <p className="map-notice" role="status">
          {tileFailure ? "底圖部分載入失敗，仍可使用案件列表或搜尋地點回報。" : notice}
          {tileFailure && (
            <button className="map-tile-retry" type="button" onClick={() => controller.current?.retryTiles?.()}>
              重新載入底圖
            </button>
          )}
        </p>
      )}
    </div>
  );
}
