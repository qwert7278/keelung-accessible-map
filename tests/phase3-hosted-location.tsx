// Preview-only UI harness. Real public location API, zero Auth/Storage/report writes.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {CITIES} from '../src/config';
import {demoRepository} from '../src/services/demo';
import ReportForm from '../src/components/ReportForm';
import '../src/styles.css';
import 'leaflet/dist/leaflet.css';
const deny=async()=>{throw new Error('Preview 地點驗收頁禁止送出或修改任何案件。');};
const readonlyRepository={...demoRepository,create:deny,addUpdate:deny,moderate:deny};
function QA(){const [open,setOpen]=useState(true);return <><h1>Preview 地點驗收：禁止送出案件</h1><p>使用真實 Geoapify 搜尋。無登入、Storage 或 MCP 權限；不會建立案件。</p><button className="button secondary" onClick={()=>setOpen(true)}>開啟地點驗收</button>{open&&<ReportForm repository={readonlyRepository} city={CITIES[0]} initialDistrict="仁愛區" reports={[]} onClose={()=>setOpen(false)} onCreated={()=>{}} onExisting={()=>{}}/>}</>;}
createRoot(document.getElementById('root')!).render(<QA/>);
