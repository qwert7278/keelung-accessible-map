export type LocationPoint = { lat:number; lng:number };
export type LocationResult = {
  label:string; address:string; location:LocationPoint; city:string; district:string;
  kind:'address'|'poi'|'road'|'district'|'other';
};
export type ReverseLocationResult = { address:string; city:string; district:string };
export function validLocation(point:LocationPoint) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}
