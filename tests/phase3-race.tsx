// Local-only deterministic races: real ReportForm + Leaflet, no backend writes.
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {useEffect,useState} from 'react';
import ReportForm from '../src/components/ReportForm';
import {CITIES} from '../src/config';
import {demoRepository} from '../src/services/demo';
import {selections} from './phase3-race-resolver';
import '../src/styles.css';
const searches:{query:string;finish:()=>void;done:boolean}[]=[];
const original=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.origin);
  if(!url.pathname.startsWith('/api/location/'))return original(input,init);
  if(url.pathname.endsWith('/capabilities'))return Response.json({searchReady:true,reverseReady:false});
  const query=url.searchParams.get('q')||'';
  return new Promise<Response>(resolve=>{
    const taipei=query.includes('臺北');
    const entry={query,done:false,finish:()=>{entry.done=true;resolve(Response.json({results:[{label:query,city:taipei?'臺北市':'基隆市',district:taipei?'信義區':'仁愛區',address:query,location:taipei?{lat:25.03177,lng:121.5593}:{lat:25.12632,lng:121.74139},kind:'address'}]}));window.dispatchEvent(new Event('race-change'));}};
    searches.push(entry);window.dispatchEvent(new Event('race-change'));
  });
};
const deny=async()=>{throw new Error('Local race harness forbids writes');};
function QA(){
  const [,tick]=useState(0),[located,setLocated]=useState('none');
  useEffect(()=>{const update=()=>tick(n=>n+1);window.addEventListener('race-change',update);return()=>window.removeEventListener('race-change',update);},[]);
  const dialog=document.querySelector('dialog');
  return <><h1>Local race QA — no Auth / Storage writes</h1><ReportForm city={CITIES[0]} initialDistrict="仁愛區" reports={[]} repository={{...demoRepository,create:deny,addUpdate:deny,moderate:deny}} onClose={()=>{}} onCreated={()=>{}} onExisting={()=>{}} onLocated={(g,p)=>setLocated(`${g.city.id}/${g.district}/${p.lat},${p.lng}`)}/>{dialog&&createPortal(<section aria-label="Race controls"><p>Located callback: <output>{located}</output></p>{searches.map((s,i)=><button type="button" key={`s${i}`} disabled={s.done} onClick={s.finish}>完成搜尋 {i+1}: {s.query}</button>)}{selections.map((s,i)=><button type="button" key={`p${i}`} disabled={s.done} onClick={s.finish}>完成位置 {i+1}</button>)}</section>,dialog)}</>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
