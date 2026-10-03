import centers from '../data/district-centers.json';
import type { City } from '../config';
import type { Location } from '../types';
const points: Record<string, number[]> = centers.centers;
export function districtCamera(city: City, district: string) {
  if (district === 'all' || district === city.defaultDistrict) return { focus: city.center, zoom: city.zoom };
  const point = points[city.name + district];
  return { focus: point ? { lat: point[0], lng: point[1] } : city.center, zoom: point ? 14 : city.zoom };
}
export function cameraKey(focus?: Location, zoom?: number, revision = 0) {
  return focus ? `${focus.lat}:${focus.lng}:${zoom ?? ''}:${revision}` : '';
}
