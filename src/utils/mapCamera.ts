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

// Fit every district's main land area, rather than letting unreported offshore
// islets dominate the view. Reports outside those areas are still included.
export function cityOverviewBounds(city: City, regions: Awaited<ReturnType<typeof import('./districtBoundary').districtRegions>>, reports: {location:Location}[] = []) {
  if (!regions.length) return city.bounds;
  const area = (ring:number[][]) => Math.abs(ring.reduce((sum,[x,y],i) => {
    const [nx,ny] = ring[(i+1)%ring.length]; return sum+x*ny-nx*y;
  },0));
  const points = regions.flatMap(region => {
    const polygon = region.polygons.reduce((largest,current) => area(current[0]) > area(largest[0]) ? current : largest);
    return polygon[0];
  });
  reports.forEach(report => points.push([report.location.lng,report.location.lat]));
  return {west:Math.min(...points.map(p=>p[0])),east:Math.max(...points.map(p=>p[0])),south:Math.min(...points.map(p=>p[1])),north:Math.max(...points.map(p=>p[1]))};
}
