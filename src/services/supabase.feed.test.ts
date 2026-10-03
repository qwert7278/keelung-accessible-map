import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient:vi.fn(), from:vi.fn(), select:vi.fn(), eq:vi.fn(), order:vi.fn(), limit:vi.fn(), maybeSingle:vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient:mocks.createClient }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval:vi.fn(()=>1), clearInterval:vi.fn() }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden:false }));
  const query = { select:mocks.select, eq:mocks.eq, order:mocks.order, limit:mocks.limit, maybeSingle:mocks.maybeSingle };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.order.mockReturnValue(query);
  mocks.createClient.mockReturnValue({ from:mocks.from });
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
});
