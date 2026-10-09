import {describe,expect,it} from 'vitest';
import {CITIES} from '../config';
import taipei from '../data/district-boundaries/TW-TPE.json';
import {geographyAt} from './locationSelection';

describe('cross-city location selection',()=>{
  it('resolves an actual Taipei polygon while the form starts in Keelung',async()=>{
    const region=taipei.find(row=>row.district==='信義區')!;
    const point={lat:region.point[0],lng:region.point[1]};
    const found=await geographyAt(point,CITIES.find(city=>city.id==='TW-KEE'));
    expect(found?.city.id).toBe('TW-TPE');
    expect(found?.district).toBe('信義區');
  });
  it('does not treat outside-Taiwan coordinates as a supported city',async()=>{
    expect(await geographyAt({lat:35.68,lng:139.76},CITIES[0])).toBeNull();
  });
});
