import { CITIES, type City } from '../config';
export default function GeographyPicker({ city, district, onCity, onDistrict }: {
  city: City; district: string; onCity: (id: string) => void; onDistrict: (district: string) => void;
}) {
  return <div className="geography-picker">
    <label>縣市<select aria-label="縣市" value={city.id} onChange={e => onCity(e.target.value)}>
      {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    <label>行政區<select aria-label="行政區" value={district} onChange={e => onDistrict(e.target.value)}>
      {city.districts.map(d => <option key={d}>{d}</option>)}
      <option value="all">所有行政區</option>
    </select></label>
  </div>;
}
