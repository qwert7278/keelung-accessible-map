import {afterEach,expect,it,vi} from 'vitest';
import {initGuideCopies} from './mcp-guide';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 let click:()=>Promise<void>=async()=>{};
 const button={dataset:{copySource:'config'},disabled:true,addEventListener:vi.fn((_event:string,fn:()=>Promise<void>)=>{click=fn;}),removeEventListener:vi.fn()};
 const source={textContent:'  {"mcpServers":{"roadtag":{"httpUrl":"https://roadtag.org/api/mcp-public"}}}\n'},status={textContent:''};
 const root={querySelectorAll:()=>[button],getElementById:(id:string)=>id==='guide-copy-status'?status:id==='config'?source:null} as unknown as Document;
 return {root,source,status,button,click:()=>click()};
}
it('copies the selected config with newlines and never calls an API',async()=>{const f=fixture(),writeText=vi.fn().mockResolvedValue(undefined),fetch=vi.fn();vi.stubGlobal('navigator',{clipboard:{writeText}});vi.stubGlobal('fetch',fetch);const cleanup=initGuideCopies(f.root);await f.click();expect(writeText).toHaveBeenCalledWith(f.source.textContent.trim());expect(fetch).not.toHaveBeenCalled();expect(f.status.textContent).toContain('已複製');cleanup();expect(f.button.removeEventListener).toHaveBeenCalledOnce();});
it('offers manual selection on clipboard denial',async()=>{const f=fixture();vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn().mockRejectedValue(Error('denied'))}});initGuideCopies(f.root);await f.click();expect(f.status.textContent).toContain('手動複製');});

it.each([
 'codex mcp add roadtag --url https://roadtag.org/api/mcp-public',
 '[mcp_servers.roadtag]\nurl = "https://roadtag.org/api/mcp-public"',
 '{"mcpServers":{"roadtag":{"httpUrl":"https://roadtag.org/api/mcp-public","trust":false}}}',
])('preserves the selected CLI/TOML/JSON snippet',async snippet=>{
 const f=fixture(),writeText=vi.fn().mockResolvedValue(undefined);
 f.source.textContent=snippet;vi.stubGlobal('navigator',{clipboard:{writeText}});
 initGuideCopies(f.root);await f.click();expect(writeText).toHaveBeenCalledWith(snippet);
});
