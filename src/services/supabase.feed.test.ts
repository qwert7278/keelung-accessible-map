import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient:vi.fn(), from:vi.fn(), select:vi.fn(), eq:vi.fn(), order:vi.fn(), limit:vi.fn(), maybeSingle:vi.fn(),ilike:vi.fn(),or:vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient:mocks.createClient }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval:vi.fn(()=>1), clearInterval:vi.fn() }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden:false }));
  const query = { select:mocks.select, eq:mocks.eq, order:mocks.order, limit:mocks.limit, maybeSingle:mocks.maybeSingle,ilike:mocks.ilike,or:mocks.or };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.order.mockReturnValue(query);
  mocks.ilike.mockReturnValue(query);mocks.or.mockReturnValue(query);
  mocks.createClient.mockReturnValue({ from:mocks.from,storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'https://example.test/photo.webp'}})})} });
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('public case lookup and feed race recovery', () => {
  it('looks up an old share by ID in the public view without the 200-row feed limit', async () => {
    mocks.maybeSingle.mockResolvedValue({ data:null, error:null });
    const { createSupabaseRepository } = await import('./supabase');
    expect(await createSupabaseRepository().get('old-case')).toBeNull();
    expect(mocks.from).toHaveBeenCalledWith('report_feed'); expect(mocks.eq).toHaveBeenCalledWith('id','old-case'); expect(mocks.limit).not.toHaveBeenCalled();
  });
  it('does not let an old failure replace a newer successful feed', async () => {
    let finishOld!: (value: {data:unknown[];error:{message:string}}) => void;
    mocks.limit.mockReturnValueOnce(new Promise(resolve=>{finishOld=resolve;})).mockResolvedValueOnce({data:[],error:null});
    const { createSupabaseRepository } = await import('./supabase');
    const next=vi.fn(), error=vi.fn(); const stop=createSupabaseRepository().subscribe('TW-KEE',next,error);
    window.dispatchEvent(new Event('supabase-reports-changed'));
    await Promise.resolve(); await Promise.resolve();
    finishOld({data:[],error:{message:'older failure'}}); await Promise.resolve(); await Promise.resolve();
    // If the event name changes, this assertion must fail instead of silently testing only one request.
    expect(mocks.limit).toHaveBeenCalledTimes(2); expect(next).toHaveBeenCalledTimes(1); expect(error).not.toHaveBeenCalled(); stop();
  });
  it('filters in the database before applying the page limit, with literal wildcard search',async()=>{
    mocks.limit.mockResolvedValue({data:[],error:null});
    const {createSupabaseRepository}=await import('./supabase');
    const next=vi.fn(); const stop=createSupabaseRepository().subscribe('TW-TPE',next,vi.fn(),{district:'中山區',status:'open',access:'blocked',search:'50%_路'});
    await Promise.resolve();await Promise.resolve();
    expect(mocks.eq.mock.calls).toEqual([['city_id','TW-TPE'],['district','中山區'],['wheelchair_access','blocked'],['status','open']]);
    expect(mocks.ilike).toHaveBeenCalledWith('search_text','%50\\%\\_路%');
    expect(mocks.eq.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.limit.mock.invocationCallOrder[0]);
    expect(next).toHaveBeenCalledWith([],false);stop();
  });
  it('loads reports older than row 200 by stable created_at/id cursor',async()=>{
    const row=(n:number)=>({id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,city_id:'TW-KEE',district:'七堵區',title:'舊案件',address:'',description:'',category:'ramp',lat:25.097,lng:121.714,status:'open',wheelchair_access:'blocked',created_at:'2026-10-03T01:00:00+00:00',updated_at:'2026-10-03T01:00:00+00:00',before_image_path:'old.webp',after_image_path:null});
    mocks.limit.mockResolvedValueOnce({data:Array.from({length:201},(_,i)=>row(500-i)),error:null}).mockResolvedValueOnce({data:[row(300),row(299)],error:null});
    const {createSupabaseRepository}=await import('./supabase');const next=vi.fn();
    const stop=createSupabaseRepository().subscribe('TW-KEE',next,vi.fn(),{district:'七堵區',pages:2});
    for(let i=0;i<5;i++) await Promise.resolve();
    expect(next.mock.calls[0][0]).toHaveLength(202);
    expect(new Set(next.mock.calls[0][0].map((r:{id:string})=>r.id)).size).toBe(202);
    expect(mocks.or).toHaveBeenCalledWith('created_at.lt.2026-10-03T01:00:00+00:00,and(created_at.eq.2026-10-03T01:00:00+00:00,id.lt.10000000-0000-4000-8000-000000000301)');
    expect(next.mock.calls[0][1]).toBe(false);stop();
  });
});
