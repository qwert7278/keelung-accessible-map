import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { CITIES, DEMO_MODE, canReportInCity } from './config';
import { ACCESS, STATUSES, type Report } from './types';
import { loadRepository } from './services/repository';
import { initialGeography, mapLink, rememberGeography } from './utils/geography';
import MapView from './components/MapView';
import GeographyPicker from './components/GeographyPicker';
import './home-map.css';

function HomeMap() {
  const [initial] = useState(initialGeography);
  const [city, setCity] = useState(initial.city);
  const [district, setDistrict] = useState(initial.district);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadRepository().then(repo => {
      if (!active) return;
      unsubscribe = repo.subscribe(city.id, rows => {
        if (active) { setReports(rows); setLoading(false); }
      }, () => { if (active) { setLoading(false); setError('案件暫時無法載入，請稍後再試。'); } });
    }).catch(() => { if (active) { setLoading(false); setError('案件暫時無法載入，請稍後再試。'); } });
    return () => { active = false; unsubscribe?.(); };
  }, [city.id]);
  useEffect(() => {
    rememberGeography(city.id, district);
    document.querySelectorAll<HTMLAnchorElement>('a[data-map-link]').forEach(link => { link.href = mapLink(city.id, district); });
  }, [city.id, district]);
  const visible = reports.filter(r => district === 'all' || r.district === district);
  const first = visible[0]?.location;
  const card = document.getElementById('home-report-summary')!;
  return <>
    <GeographyPicker city={city} district={district} onCity={id => {
      const next = CITIES.find(c => c.id === id)!;
      setReports([]); setLoading(true); setError(''); setCity(next); setDistrict(next.defaultDistrict);
    }} onDistrict={setDistrict} />
    <div className="home-live-map">
      <MapView key={city.id} city={city} reports={visible} focus={district === city.defaultDistrict || !first ? city.center : first}
        onSelect={id => window.location.assign(mapLink(city.id, district, id))} />
    </div>
    <div className="home-map-summary" aria-live="polite">
      <p>{loading ? '正在同步案件…' : error || `${city.name} · ${district === 'all' ? '所有行政區' : district} · ${visible.length} 個回報點`}</p>
      <p>{DEMO_MODE ? 'Demo：與完整地圖共用此瀏覽器的測試資料。' : canReportInCity(city.id) ? '與完整地圖共用社群回報資料。' : '此縣市目前提供地圖預覽，正式回報尚未開放。'}</p>
      <div className="home-map-legend">{Object.entries(STATUSES).map(([status, label]) => <span key={status}><i className={`map-status-dot ${status}`}>{status === 'open' ? '!' : status === 'resolved' ? '✓' : '…'}</i>{label}</span>)}</div>
      <a className="button secondary" href={mapLink(city.id, district)}>開啟完整地圖 ↗</a>
    </div>
    {createPortal(<>
      <div className="location-head"><div><h2>最新通行回報</h2><p>{city.name} · {district === 'all' ? '所有行政區' : district}</p></div><span className="live-pill">{DEMO_MODE ? 'Demo' : '公開地圖'}</span></div>
      <div className="report-mini-list">{visible.slice(0, 3).map(r => <a className="report-mini" key={r.id} href={mapLink(city.id, district, r.id)}><div><strong>{r.title}</strong><small>{r.district} · {ACCESS[r.wheelchairAccess]}</small></div><span className={`status ${r.status}`}>{STATUSES[r.status]}</span></a>)}</div>
      <p className="small-note">{loading ? '正在同步案件…' : error || (visible.length ? '與下方地圖及完整地圖同步，點選回報可查看現況。' : '目前沒有回報；沒有標記不代表沒有障礙。')}</p>
    </>, card)}
  </>;
}
createRoot(document.getElementById('home-map-root')!).render(<HomeMap />);
