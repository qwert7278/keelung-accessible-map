import boundaries from '../../src/data/district-boundaries.json' with {type:'json'};
import {RoadError} from './contracts.js';
// Bundled JSON imports work in emitted Node and Vercel, without Vite glob/window.
export const regions=boundaries.regions;
export function contains(region:typeof regions[number],lat:number,lng:number){
 const epsilon=0.0002,[west,south,east,north]=region.bounds;
 if(lng<west-epsilon||lng>east+epsilon||lat<south-epsilon||lat>north+epsilon)return false;
 for(const polygon of region.polygons){let insidePolygon=false;
  for(const ring of polygon){let inside=false;
   for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [ax,ay]=ring[j],[bx,by]=ring[i],dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((lng-ax)*dx+(lat-ay)*dy)/(dx*dx+dy*dy||1)));
    if((lng-ax-t*dx)**2+(lat-ay-t*dy)**2<=epsilon**2)return true;
    if((ay>lat)!==(by>lat)&&lng<(bx-ax)*(lat-ay)/(by-ay)+ax)inside=!inside;
   }if(inside)insidePolygon=!insidePolygon;
  }if(insidePolygon)return true;
 }return false;
}
export function candidates(lat:number,lng:number){return regions.filter(r=>contains(r,lat,lng)).map(r=>({city_id:r.cityId,city_name:cityName(r.cityId),district:r.district}));}
const cityNames:Record<string,string>={'TW-TPE':'臺北市','TW-NWT':'新北市','TW-KEE':'基隆市','TW-TAO':'桃園市','TW-TXG':'臺中市','TW-TNN':'臺南市','TW-KHH':'高雄市','TW-HSZ':'新竹市','TW-HSQ':'新竹縣','TW-MIA':'苗栗縣','TW-CHA':'彰化縣','TW-NAN':'南投縣','TW-YUN':'雲林縣','TW-CYI':'嘉義市','TW-CYQ':'嘉義縣','TW-PIF':'屏東縣','TW-ILA':'宜蘭縣','TW-HUA':'花蓮縣','TW-TTT':'臺東縣','TW-KIN':'金門縣','TW-PEN':'澎湖縣','TW-LIE':'連江縣'};
function cityName(id:string){return cityNames[id]||id;}
export function validateLocation(city:string,district:string,lat:number,lng:number){if(!candidates(lat,lng).some(c=>c.city_id===city&&c.district===district))throw new RoadError('LOCATION_MISMATCH');}
export function distance(lat:number,lng:number,a:number,b:number){const rad=Math.PI/180,s=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lng)*rad/2)**2;return 6371000*2*Math.atan2(Math.sqrt(s),Math.sqrt(Math.max(0,1-s)));}
export function reportUrl(origin:string,id:string,city?:string,district?:string){
 const url=new URL('/map',origin);if(city&&district){url.searchParams.set('city',city);url.searchParams.set('district',district);}url.searchParams.set('report',id);return url.href;
}
