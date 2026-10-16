import {describe,it,expect,vi,afterEach} from 'vitest';
import {initPublicMcp} from './public-mcp-onboarding';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(){
 const listeners=new Map<string,()=>Promise<void>>();
 const button=(id:string)=>({disabled:false,addEventListener:vi.fn((_type:string,fn:()=>Promise<void>)=>listeners.set(id,fn)),removeEventListener:vi.fn()});
 const url=button('copy-mcp-url'),prompt=button('copy-mcp-prompt'),status={textContent:''},text={textContent:'請查詢這個座標附近的公開回報。'};
 const nodes:Record<string,unknown>={'copy-mcp-url':url,'copy-mcp-prompt':prompt,'public-mcp-status':status,'public-mcp-prompt':text};
 return {root:{getElementById:(id:string)=>nodes[id]} as unknown as Document,url,prompt,status,click:(id:string)=>listeners.get(id)!()};
}
describe('public MCP copy actions',()=>{
 it.each([true,false])('copies the fixed URL independent of the release flag (%s)',async released=>{
  const f=fixture(),fetch=vi.fn(),writeText=vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{clipboard:{writeText}});
  initPublicMcp(f.root,released);expect(f.url.disabled).toBe(false);expect(f.prompt.disabled).toBe(!released);
  await f.click('copy-mcp-url');expect(writeText).toHaveBeenCalledWith('https://roadtag.org/api/mcp-public');expect(fetch).not.toHaveBeenCalled();
  expect(f.status.textContent).toContain('不代表服務目前可連接');
 });
 it.each([429,503,'offline','timeout'])('copies without checking upstream %s',async failure=>{
  const f=fixture(),fetch=vi.fn(async()=>{if(typeof failure==='number')return new Response('',{status:failure});throw new DOMException('offline',failure==='timeout'?'TimeoutError':'NetworkError');}),writeText=vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{clipboard:{writeText}});
  initPublicMcp(f.root,true);await f.click('copy-mcp-url');
  expect(writeText).toHaveBeenCalledWith('https://roadtag.org/api/mcp-public');expect(fetch).not.toHaveBeenCalled();
 });
 it('provides manual copy feedback when clipboard permission is denied',async()=>{
  const f=fixture(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn().mockRejectedValue(Error('denied'))}});
  initPublicMcp(f.root,true);await f.click('copy-mcp-url');expect(f.status.textContent).toContain('手動複製');expect(fetch).not.toHaveBeenCalled();
 });
 it('keeps unpublished query examples disabled and removes both listeners',async()=>{
  const f=fixture(),writeText=vi.fn();vi.stubGlobal('navigator',{clipboard:{writeText}});const cleanup=initPublicMcp(f.root,false);
  await f.click('copy-mcp-prompt');expect(writeText).not.toHaveBeenCalled();cleanup();
  expect(f.url.removeEventListener).toHaveBeenCalledOnce();expect(f.prompt.removeEventListener).toHaveBeenCalledOnce();
 });
 it('copies the visible homepage example without a technical URL button',async()=>{
  const f=fixture(),get=f.root.getElementById.bind(f.root),writeText=vi.fn().mockResolvedValue(undefined),fetch=vi.fn();
  vi.spyOn(f.root,'getElementById').mockImplementation(id=>id==='copy-mcp-url'?null:get(id));
  vi.stubGlobal('navigator',{clipboard:{writeText}});vi.stubGlobal('fetch',fetch);
  initPublicMcp(f.root,true);await f.click('copy-mcp-prompt');expect(writeText).toHaveBeenCalledWith('請查詢這個座標附近的公開回報。');expect(fetch).not.toHaveBeenCalled();
 });
});
