import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {districtRegions} from '../utils/districtBoundary';
const mocks=vi.hoisted(()=>({createClient:vi.fn(),rpc:vi.fn(),insert:vi.fn(),invoke:vi.fn(),getSession:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.createClient}));
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');
 vi.stubGlobal('window',new EventTarget());
 mocks.getSession.mockResolvedValue({data:{session:{user:{id:'verified-user',is_anonymous:true},access_token:'verified-token'}},error:null});
 mocks.createClient.mockReturnValue({auth:{getSession:mocks.getSession},rpc:mocks.rpc,functions:{invoke:mocks.invoke},from:()=>({insert:mocks.insert})});
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('uncertain report submission recovery',()=>{
 it('returns the same case after lost insert acknowledgment and skips reupload on retry',async()=>{
  const id='10000000-0000-4000-8000-000000000001';let committed=false;
  mocks.rpc.mockImplementation(async(name)=>({data:name==='owned_report' ? committed ? id : null : false,error:null}));
  mocks.invoke.mockResolvedValue({data:{path:`${id}/before/${id}.webp`,uploaded:true},error:null});
  mocks.insert.mockImplementation(async()=>{committed=true;return {error:{message:'network response lost'}};});
  const region=(await districtRegions()).find(r=>r.cityId==='TW-TPE'&&r.district==='中山區')!;
  const draft={cityId:region.cityId,district:region.district,title:'可重試的回報',address:'',description:'',category:'ramp' as const,wheelchairAccess:'blocked' as const,location:{lat:region.point[0],lng:region.point[1]}};
  const {createSupabaseRepository}=await import('./supabase');const repo=createSupabaseRepository();const photo=new Blob(['encoded'],{type:'image/webp'});
  expect(await repo.create(draft,photo,vi.fn(),id)).toBe(id);
  expect(await repo.create(draft,photo,vi.fn(),id)).toBe(id);
  expect(mocks.insert).toHaveBeenCalledTimes(1);expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expect(mocks.insert.mock.calls[0][0].id).toBe(id);
 });
});
