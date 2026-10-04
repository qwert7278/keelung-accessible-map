import { CITIES, type City } from '../config';
import type { Location } from '../types';
import { districtAt } from './districtBoundary';

export async function geographyAt(point:Location, preferred?:City) {
  const candidates=CITIES.filter(city => point.lat>=city.bounds.south && point.lat<=city.bounds.north && point.lng>=city.bounds.west && point.lng<=city.bounds.east);
  candidates.sort((a,b)=>Number(b.id===preferred?.id)-Number(a.id===preferred?.id));
  for (const city of candidates) {
    const district=await districtAt(city.id,city.defaultDistrict,point);
    if (district) return {city,district};
  }
  return null;
}
