import {describe,it,expect,vi,afterEach} from 'vitest';
import {initPublicMcp} from './public-mcp-onboarding';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 const listeners=new Map<string,()=>Promise<void>>();
 const button=(id:string)=>({disabled:false,addEventListener:vi.fn((_type:string,fn:()=>Promise<void>)=>listeners.set(id,fn)),removeEventListener:vi.fn()});
 const url=button('copy-mcp-url'),prompt=button('copy-mcp-prompt'),status={textContent:''},text={textContent:'請查詢這個座標附近的公開回報。'};
 const capabilities={textContent:'地址／地標搜尋暫停'},notice={hidden:true};
 const nodes:Record<string,unknown>={'copy-mcp-url':url,'copy-mcp-prompt':prompt,'public-mcp-status':status,'public-mcp-prompt':text,'public-mcp-capabilities':capabilities,'public-mcp-location-note':notice};
 return {capabilities,notice,text,root:{getElementById:(id:string)=>nodes[id]} as unknown as Document,url,prompt,status,click:(id:string)=>listeners.get(id)!()};
}
const tools=['resolve_location','get_report','search_nearby_reports'].map(name=>({name}));
describe('public MCP homepage connection',()=>{
 it('keeps the connection unavailable before a reviewed release',async()=>{const f=fixture();const fetch=vi.fn(),writeText=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{clipboard:{writeText}});initPublicMcp(f.root,false);expect(f.url.disabled).toBe(true);expect(f.status.textContent).toContain('尚未開放');await f.click('copy-mcp-url');expect(fetch).not.toHaveBeenCalled();expect(writeText).not.toHaveBeenCalled();});
 it('checks actual anonymous discovery and copies the exact public URL',async()=>{const f=fixture(),fetch=vi.fn().mockResolvedValue(new Response('event: message\ndata: '+JSON.stringify({jsonrpc:'2.0',id:1,result:{tools}})+'\n\n')),writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{clipboard:{writeText}});initPublicMcp(f.root,true);await f.click('copy-mcp-url');expect(fetch).toHaveBeenCalledWith('/api/mcp-public',expect.objectContaining({method:'POST',credentials:'omit'}));expect(writeText).toHaveBeenCalledWith('https://roadtag.org/api/mcp-public');expect(f.status.textContent).toContain('已複製');});
 it('does not copy a disabled or unexpected server',async()=>{for(const response of [new Response('',{status:503}),Response.json({result:{tools:[...tools,{name:'create_report'}]}})]){const f=fixture(),writeText=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response));vi.stubGlobal('navigator',{clipboard:{writeText}});initPublicMcp(f.root,true);await f.click('copy-mcp-url');expect(writeText).not.toHaveBeenCalled();expect(f.status.textContent).toContain('暫時無法連接');}});
 it('provides manual copy feedback when clipboard permission is denied',async()=>{const f=fixture();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({result:{tools}})));vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn().mockRejectedValue(Error('denied'))}});initPublicMcp(f.root,true);await f.click('copy-mcp-url');expect(f.status.textContent).toContain('手動複製');});
 it('copies the visible coordinate example',async()=>{const f=fixture(),writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('navigator',{clipboard:{writeText}});const cleanup=initPublicMcp(f.root,true);await f.click('copy-mcp-prompt');expect(writeText).toHaveBeenCalledWith('請查詢這個座標附近的公開回報。');cleanup();expect(f.prompt.removeEventListener).toHaveBeenCalledOnce();});
});

it('announces text search only when both release flags are enabled',()=>{
 for(const released of [false,true]){const f=fixture();initPublicMcp(f.root,released,false);expect(f.capabilities.textContent).toContain('暫停');expect(f.notice.hidden).toBe(true);}
 const disabled=fixture();initPublicMcp(disabled.root,false,true);expect(disabled.capabilities.textContent).toContain('暫停');expect(disabled.notice.hidden).toBe(true);
 const live=fixture();initPublicMcp(live.root,true,true);expect(live.capabilities.textContent).toContain('商家');expect(live.text.textContent).toContain('先讓我選擇');expect(live.notice.hidden).toBe(false);
});
