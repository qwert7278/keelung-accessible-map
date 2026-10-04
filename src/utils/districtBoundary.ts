import type { Location } from '../types';
import { retryableLoader } from './retryableLoader';
type Region = {cityId:string;district:string;bounds:number[];point:number[];polygons:number[][][][]};
const loaders=import.meta.glob<Region[]>('../data/district-boundaries/*.json',{import:'default'});
const loadRegions=retryableLoader((path:string)=>loaders[path]());
export function districtRegions(cityId?:string):Promise<Region[]> {
  if (!cityId) return Promise.all(Object.keys(loaders).map(path=>districtRegions(path.split('/').at(-1)!.replace('.json','')))).then(rows=>rows.flat());
  const path=`../data/district-boundaries/${cityId}.json`;
  if (!loaders[path]) return Promise.resolve([]);
  return loadRegions(path);
}
// ~22m tolerance accommodates published boundary simplification and near-edge GPS error.
export function containsRegion(region: Region, point: Location) {
  const x=point.lng,y=point.lat,epsilon=0.0002;
  const [west,south,east,north]=region.bounds;
  if (x<west-epsilon||x>east+epsilon||y<south-epsilon||y>north+epsilon) return false;
  for (const polygon of region.polygons) {
    let inPolygon=false;
    for (const ring of polygon) {
      let inside=false;
      for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const [ax,ay]=ring[j],[bx,by]=ring[i],dx=bx-ax,dy=by-ay;
        const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
        if ((x-ax-t*dx)**2+(y-ay-t*dy)**2<=epsilon**2) return true;
        if ((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
      }
      if (inside) inPolygon=!inPolygon;
    }
    if (inPolygon) return true;
  }
  return false;
}
export async function districtAt(cityId:string, district:string, point:Location) {
  const regions=await districtRegions(cityId);
  const preferred=regions.find(region=>region.district===district);
  return preferred && containsRegion(preferred,point) ? preferred.district : regions.find(region=>containsRegion(region,point))?.district ?? null;
}
