import {describe,it,expect,vi,afterEach} from 'vitest';
import {initChatgptExample} from './chatgpt-onboarding';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  let listener:(()=>Promise<void>)|undefined;
  const button={addEventListener:vi.fn((_type:string,fn:()=>Promise<void>)=>{listener=fn;}),removeEventListener:vi.fn()};
  const text={textContent:'  現場回報範例  '},status={textContent:''};
  const root={getElementById:(id:string)=>id==='copy-chatgpt-example'?button:id==='chatgpt-example-text'?text:status} as unknown as Document;
  return {root,status,button,click:()=>listener!()};
}
describe('homepage example copy',()=>{
  it('copies only the visible example and announces completion',async()=>{
    const f=fixture(),writeText=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('navigator',{clipboard:{writeText}});
    const cleanup=initChatgptExample(f.root);await f.click();expect(writeText).toHaveBeenCalledWith('現場回報範例');expect(f.status.textContent).toContain('已複製');cleanup();expect(f.button.removeEventListener).toHaveBeenCalledOnce();
  });
  it('provides a manual fallback when clipboard permission is denied',async()=>{
    const f=fixture();vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
    initChatgptExample(f.root);await f.click();expect(f.status.textContent).toContain('手動複製');
  });
});
