import {describe,it,expect} from 'vitest';
import {CITIES,canReportInCity} from '../config';
import {containsRegion,districtAt,districtRegions} from './districtBoundary';
import {validateDraft} from './validation';
describe('nationwide location integrity',()=>{
 it('opens all 22 cities and validates a point in every one of 368 districts',async()=>{
  const regions=await districtRegions();expect(regions).toHaveLength(368);
  for(const city of CITIES) expect(canReportInCity(city.id)).toBe(true);
  for(const region of regions) {
   const location={lat:region.point[0],lng:region.point[1]};
   expect(containsRegion(region,location),region.cityId+region.district).toBe(true);
   expect(await districtAt(region.cityId,region.district,location)).toBe(region.district);
   expect(validateDraft({cityId:region.cityId,district:region.district,title:'界線測試',address:'',description:'',category:'ramp',wheelchairAccess:'blocked',location})).toBeNull();
  }
  expect(canReportInCity('TW-UNKNOWN')).toBe(false);
 });
 it('corrects the district selected for a point and rejects points in another city',async()=>{
  const regions=await districtRegions();const renai=regions.find(r=>r.cityId==='TW-KEE'&&r.district==='仁愛區')!;
  const point={lat:renai.point[0],lng:renai.point[1]};
  expect(await districtAt('TW-KEE','七堵區',point)).toBe('仁愛區');
  expect(await districtAt('TW-TPE','中山區',point)).toBeNull();
 });
});
