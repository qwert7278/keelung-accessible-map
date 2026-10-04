// Local Vite QA page only; not a production build entry. No Supabase writes.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { set } from 'idb-keyval';
import { CITIES } from '../src/config';
import { demoRepository } from '../src/services/demo';
import ReportForm from '../src/components/ReportForm';
import ReportPanel from '../src/components/ReportPanel';
import type { Report } from '../src/types';
import '../src/styles.css';

const city=CITIES[0], point={lat:25.1283,lng:121.7419};
const image='/images/accessible-coastal-city-banner.png';
const reports:Report[]=[1,2].map(index=>({ id:`10000000-0000-4000-8000-00000000000${index}`,cityId:city.id,district:'仁愛區',title:`隔離 QA 案件 ${index}`,address:`基隆市仁愛區測試位置 ${index}`,description:'這是本地隔離資料，未寫入正式環境。',category:'uneven_surface',location:{lat:point.lat+index*0.0002,lng:point.lng},status:'open',wheelchairAccess:'difficult',beforeImageUrl:image,afterImageUrl:null,createdAt:`2026-10-04T01:0${index}:00Z`,updatedAt:'2026-10-04T01:00:00Z',officialSource:false,schemaVersion:1}));
const updates=Array.from({length:5},(_,index)=>({id:`qa-update-${index}`,message:`隔離現場紀錄 ${index+1}`,imageUrl:null,createdAt:`2026-10-04T02:0${index}:00Z`,type:'community' as const,suggestedStatus:null}));
const originalFetch=window.fetch.bind(window);
let mode='success';
window.fetch=async (input,init)=>{
  const url=new URL(String(input),location.origin);
  if (!url.pathname.startsWith('/api/location/')) return originalFetch(input,init);
  const isSearch=url.pathname.endsWith('/search');
  const query=url.searchParams.get('q')||'';
  const slow=query.includes('慢') || url.searchParams.get('lat') === '25.1283';
  // Deliberately ignore abort: the actual UI must also reject stale completions.
  await new Promise(resolve=>setTimeout(resolve,slow ? 1400 : 80));
  window.dispatchEvent(new CustomEvent('qa-location-complete',{detail:isSearch ? `搜尋：${query}` : `反查：${url.searchParams.get('lat')}`}));
  if (mode==='failure') return Response.json({error:'LOCATION_TEMPORARILY_UNAVAILABLE'},{status:503});
  if (mode==='empty') return Response.json(isSearch ? {results:[]} : null);
  if (isSearch) return Response.json({results:[
    {label:`${query} 候選一`,address:'基隆市仁愛區忠一路1號',location:point,city:city.name,district:'中正區',kind:'poi'},
    {label:`${query} 候選二`,address:'基隆市仁愛區愛一路2號',location:{lat:25.129,lng:121.741},city:city.name,district:'仁愛區',kind:'address'},
    {label:'其他縣市候選',address:'臺北市中山區',location:{lat:25.0527,lng:121.5204},city:'臺北市',district:'中山區',kind:'poi'},
  ]});
  return Response.json({address:`鄰近地址 ${url.searchParams.get('lat')}`,city:city.name,district:'中正區'});
};
Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success:(position:GeolocationPosition)=>void)=>setTimeout(()=>success({coords:{latitude:point.lat,longitude:point.lng,accuracy:18}} as GeolocationPosition),80)}});

function QA() {
  const [form,setForm]=useState(false),[report,setReport]=useState<Report|null>(null),[admin,setAdmin]=useState(false),[note,setNote]=useState('');
  const [trace,setTrace]=useState<string[]>([]);
  useEffect(()=>{
    const completed=(event:Event)=>setTrace(values=>[...values,(event as CustomEvent<string>).detail]);
    window.addEventListener('qa-location-complete',completed);
    return ()=>window.removeEventListener('qa-location-complete',completed);
  },[]);
  return <><header className="site-header"><h1>隔離 QA：Drawer / Location</h1></header><main>
    <p>僅供本地驗證。GPS 與 Location 回應為固定測試資料。</p>
    <label>位置服務情境<select onChange={event=>{mode=event.target.value;}} defaultValue="success"><option value="success">成功</option><option value="failure">失敗</option><option value="empty">查無結果</option></select></label>
    <button className="button primary" onClick={()=>setForm(true)}>開啟回報表單</button>
    <button className="button secondary" onClick={async()=>{ await set('accessible-map-demo-v1',{version:1,reports,updates:Object.fromEntries(reports.map(report=>[report.id,updates]))});setNote('已建立本地隔離資料'); }}>建立本地地圖驗證資料</button>
    <a className="button secondary" href="/map?city=TW-KEE&district=仁愛區">開啟真正地圖頁</a>
    <button className="button secondary" onClick={()=>{setAdmin(true);setReport(reports[0]);}}>檢查嵌入管理面板</button>
    <p role="status">{note}</p>
    <output aria-label="隔離服務完成紀錄">{trace.map((message,index)=><p key={index}>{message}</p>)}</output>
    {reports.map(row=><button className="button secondary" key={row.id} onClick={()=>{setAdmin(false);setReport(row);}}>開啟 {row.title}</button>)}
    {report && <ReportPanel key={`${report.id}-${admin}`} report={report} repository={{...demoRepository,updates:async()=>updates}} admin={admin} embedded={admin} onClose={()=>setReport(null)}/>}
    {form && <ReportForm repository={demoRepository} city={city} initialDistrict="仁愛區" reports={[]} onClose={()=>setForm(false)} onCreated={()=>setForm(false)} onExisting={()=>{}}/>}
  </main></>;
}
createRoot(document.getElementById('root')!).render(<QA/>);
