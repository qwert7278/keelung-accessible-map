import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {districtRegions} from '../utils/districtBoundary';
import type {Report} from '../types';
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
 it('shows a retryable error for non-JSON upstream failure without inserting a timeline',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:null});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('upstream unavailable',{status:502})));
  const repo=(await import('./supabase')).createSupabaseRepository();
  await expect(repo.addUpdate(crypto.randomUUID(),{message:'補充',suggestedStatus:null},new Blob(['encoded'],{type:'image/webp'}),vi.fn(),crypto.randomUUID())).rejects.toThrow('稍後重試');
  expect(mocks.insert).not.toHaveBeenCalled();
 });
 it.each(['community','admin'])('recovers %s update acknowledgement without duplicate timeline or photo',async(kind)=>{
  const id='10000000-0000-4000-8000-000000000001',operation=crypto.randomUUID();let committed=false;
  if(kind==='admin') mocks.getSession.mockResolvedValue({data:{session:{user:{id:'verified-user',is_anonymous:false},access_token:'verified-token'}},error:null});
  mocks.rpc.mockImplementation(async(name)=>{
   if(name==='is_admin') return {data:kind==='admin',error:null};
   if(name==='owned_update') return {data:committed?'timeline-id':null,error:null};
   if(name==='moderate_report') {committed=true;return {data:null,error:{message:'lost acknowledgement'}};}
   return {data:null,error:null};
  });
  mocks.insert.mockImplementation(async()=>{committed=true;return {error:{message:'lost acknowledgement'}};});
  const fetch=vi.fn().mockResolvedValue(Response.json({path:`${id}/${kind==='admin'?'after':'updates'}/${operation}.webp`,uploaded:true}));vi.stubGlobal('fetch',fetch);
  const repo=(await import('./supabase')).createSupabaseRepository();const photo=new Blob(['encoded'],{type:'image/webp'});
  const submit=()=>kind==='community'?repo.addUpdate(id,{message:'現場補充',suggestedStatus:null},photo,vi.fn(),operation):repo.moderate({id,updatedAt:'2026-10-03T00:00:00Z',afterImageUrl:null} as Report,'resolved','已改善','passable',photo,vi.fn(),operation);
  await submit();await submit();expect(fetch).toHaveBeenCalledTimes(1);
  if(kind==='community') {expect(mocks.insert).toHaveBeenCalledTimes(1);expect(mocks.insert.mock.calls[0][0].operation_id).toBe(operation);}
  else expect(mocks.rpc.mock.calls.filter(([name])=>name==='moderate_report')).toHaveLength(1);
 });
 it('preserves optimistic-lock failure when no committed operation exists',async()=>{
  mocks.getSession.mockResolvedValue({data:{session:{user:{id:'verified-user',is_anonymous:false},access_token:'verified-token'}},error:null});
  mocks.rpc.mockImplementation(async(name)=>({data:name==='is_admin'?true:null,error:name==='moderate_report'?{message:'案件已被其他管理者更新'}:null}));
  const repo=(await import('./supabase')).createSupabaseRepository();
  await expect(repo.moderate({id:crypto.randomUUID(),updatedAt:'stale',afterImageUrl:null} as Report,'in_progress','處理中','difficult',null,vi.fn(),crypto.randomUUID())).rejects.toThrow('其他管理者');
  expect(mocks.rpc.mock.calls.find(([name])=>name==='moderate_report')?.[1].expected_updated_at).toBe('stale');
 });
 it('returns the same case after lost insert acknowledgment and skips reupload on retry',async()=>{
  const id='10000000-0000-4000-8000-000000000001';let committed=false;
  mocks.rpc.mockImplementation(async(name)=>({data:name==='owned_report' ? committed ? id : null : false,error:null}));
  mocks.invoke.mockResolvedValue({data:{path:`${id}/before/${id}.webp`,uploaded:true},error:null});
  const fetch=vi.fn().mockResolvedValue(Response.json({path:`${id}/before/${id}.webp`,uploaded:true}));
  vi.stubGlobal('fetch',fetch);
  mocks.insert.mockImplementation(async()=>{committed=true;return {error:{message:'network response lost'}};});
  const region=(await districtRegions()).find(r=>r.cityId==='TW-TPE'&&r.district==='中山區')!;
  const draft={cityId:region.cityId,district:region.district,title:'可重試的回報',address:'',description:'',category:'ramp' as const,wheelchairAccess:'blocked' as const,location:{lat:region.point[0],lng:region.point[1]}};
  const {createSupabaseRepository}=await import('./supabase');const repo=createSupabaseRepository();const photo=new Blob(['encoded'],{type:'image/webp'});
  expect(await repo.create(draft,photo,vi.fn(),id)).toBe(id);
  expect(await repo.create(draft,photo,vi.fn(),id)).toBe(id);
  expect(mocks.insert).toHaveBeenCalledTimes(1);expect(fetch).toHaveBeenCalledTimes(1);
  expect(mocks.insert.mock.calls[0][0].id).toBe(id);
 });
});
