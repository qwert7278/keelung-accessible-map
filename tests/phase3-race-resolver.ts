import {CITIES,type City} from '../src/config';
import type {Location} from '../src/types';
export const selections:{point:Location;finish:()=>void;done:boolean}[]=[];
export function geographyAt(point:Location){
  return new Promise<{city:City;district:string}>(resolve=>{
    const city=CITIES.find(c=>c.id===(point.lng<121.6?'TW-TPE':'TW-KEE'))!;
    const entry={point,done:false,finish:()=>{entry.done=true;resolve({city,district:city.id==='TW-TPE'?'信義區':'仁愛區'});window.dispatchEvent(new Event('race-change'));}};
    selections.push(entry);window.dispatchEvent(new Event('race-change'));
  });
}
