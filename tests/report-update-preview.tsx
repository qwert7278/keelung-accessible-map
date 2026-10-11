// Local read-only preview of the existing public update form. No backend writes.
import {createRoot} from 'react-dom/client';
import ReportPanel from '../src/components/ReportPanel';
import type {Report} from '../src/types';
import {demoRepository} from '../src/services/demo';
import '../src/styles.css';
const report:Report={id:'local-ui-only',cityId:'TW-KEE',district:'仁愛區',title:'本地示範：精一路附近 · 人行道被占用',address:'精一路19號附近',description:'僅供查看表單，不是公開案件。',category:'occupied',location:{lat:25.1263,lng:121.7413},status:'open',wheelchairAccess:'difficult',createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z',beforeImageUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#e4ebe7"/><text x="320" y="200" text-anchor="middle" font-size="28" fill="#09595b">LOCAL PHOTO PREVIEW</text></svg>'),afterImageUrl:null,officialSource:false,schemaVersion:1};
const repository:typeof demoRepository={...demoRepository,updates:async()=>[],addUpdate:async()=>{throw new Error('本地預覽，不會儲存補充。');}};
createRoot(document.getElementById('root')!).render(<><p>本地示範案件，僅供查看更新資訊流程。</p><ReportPanel report={report} repository={repository} admin={false} onClose={()=>{}}/></>);
