// Local-only fixture: no build entry and no remote Auth, Storage, or report writes.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {CITIES} from '../src/config';
import {demoRepository} from '../src/services/demo';
import ReportForm from '../src/components/ReportForm';
import '../src/styles.css';
import 'leaflet/dist/leaflet.css';
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
  const url=new URL(String(input),location.origin);
  if(!url.pathname.startsWith('/api/location/'))return originalFetch(input,init);
  if(url.pathname.endsWith('/capabilities'))return Response.json({searchReady:true,reverseReady:false});
  const q=url.searchParams.get('q')||'';
  await new Promise(resolve=>setTimeout(resolve,q.includes('慢')?1800:100));
  if(q.includes('失敗'))return Response.json({error:'LOCATION_TEMPORARILY_UNAVAILABLE'},{status:503});
  return Response.json({results:q.includes('空')?[]:Array.from({length:6},(_,i)=>({
    label:`${q} 候選 ${i+1}`,city:'基隆市',district:'仁愛區',address:`基隆市仁愛區精一路${19+i}號附近 · 請確認騎樓入口`,
    location:{lat:25.1262937+i*.00001,lng:121.741373},kind:'address',
  }))});
};
function QA(){const [open,setOpen]=useState(true);return <><h1>Phase 3 本地 UX QA</h1><p>固定候選資料；「空」測試無結果、「失敗」測試錯誤、「慢」測試競態。</p><button onClick={()=>setOpen(true)}>開啟表單</button>{open&&<ReportForm repository={demoRepository} city={CITIES[0]} initialDistrict="仁愛區" reports={[]} onClose={()=>setOpen(false)} onCreated={()=>setOpen(false)} onExisting={()=>{}}/>}</>;}
createRoot(document.getElementById('root')!).render(<QA/>);
