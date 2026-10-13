import type {Location} from '../types';
// Only user-initiated movement can change browsing scope; camera updates cannot.
export function userMapMovement(onSettled:(point:Location,zoom:number)=>void,onStart?:()=>void) {
 let moving=false,timer:ReturnType<typeof setTimeout>|undefined;
 function cancel(){moving=false;clearTimeout(timer);}
 return {
  start(){cancel();moving=true;onStart?.();},
  end(point:Location,zoom:number){
   if(!moving)return;
   moving=false;clearTimeout(timer);
   timer=setTimeout(()=>onSettled(point,zoom),300);
  },
  cancel,
 };
}