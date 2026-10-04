import {afterEach,describe,it,expect,vi} from 'vitest';
import {initStoryVideo} from './home-story';
afterEach(()=>vi.unstubAllGlobals());
function fixture(reduced=false) {
 const video=Object.assign(new EventTarget(),{paused:true,muted:false,src:'',dataset:{src:'/demo.mp4'},load:vi.fn(),getAttribute:()=>video.src,play:vi.fn(),pause:vi.fn()});
 video.play.mockImplementation(async()=>{video.paused=false;video.dispatchEvent(new Event('play'));});
 video.pause.mockImplementation(()=>{video.paused=true;video.dispatchEvent(new Event('pause'));});
 const button=Object.assign(new EventTarget(),{textContent:'播放影片'}),status={textContent:''};
 const root={querySelector:(selector:string)=>selector==='video'?video:selector==='.pov-toggle'?button:status};
 const motion=Object.assign(new EventTarget(),{matches:reduced}),doc=Object.assign(new EventTarget(),{hidden:false});
 vi.stubGlobal('matchMedia',()=>motion);vi.stubGlobal('document',doc);
 const observers:Array<{callback:(entries:unknown[])=>void;disconnect:ReturnType<typeof vi.fn>}>=[];
 vi.stubGlobal('IntersectionObserver',class {disconnect=vi.fn();observe=vi.fn();constructor(callback:(entries:unknown[])=>void){observers.push({callback,disconnect:this.disconnect});}});
 const animation={revert:vi.fn()},reveal=vi.fn().mockResolvedValue(animation);
 const dispose=initStoryVideo(root as unknown as HTMLElement,reveal);
 const enter=()=>observers[1].callback([{isIntersecting:true,intersectionRatio:.6}]);
 const leave=()=>observers[1].callback([{isIntersecting:false,intersectionRatio:0}]);
 return {video,button,status,motion,doc,observers,reveal,animation,dispose,enter,leave};
}
describe('homepage POV media lifecycle',()=>{
 it('does not load/play initially; plays muted on enter and pauses on leave/re-enters',async()=>{
  const f=fixture();expect(f.video.load).not.toHaveBeenCalled();expect(f.video.play).not.toHaveBeenCalled();
  f.enter();await Promise.resolve();expect(f.video.muted).toBe(true);expect(f.video.play).toHaveBeenCalledOnce();expect(f.button.textContent).toBe('暫停影片');
  f.leave();expect(f.video.paused).toBe(true);f.enter();await Promise.resolve();expect(f.video.play).toHaveBeenCalledTimes(2);expect(f.video.load).toHaveBeenCalledOnce();expect(f.reveal).toHaveBeenCalledOnce();f.dispose();
 });
 it('user pause survives scroll re-entry until explicit play',async()=>{
  const f=fixture();f.enter();await Promise.resolve();f.button.dispatchEvent(new Event('click'));f.leave();f.enter();expect(f.video.play).toHaveBeenCalledOnce();expect(f.button.textContent).toBe('播放影片');f.button.dispatchEvent(new Event('click'));await Promise.resolve();expect(f.video.play).toHaveBeenCalledTimes(2);f.dispose();
 });
 it('reduced motion keeps poster and no GSAP/download until manual play',async()=>{
  const f=fixture(true);f.observers[0].callback([{isIntersecting:true}]);f.enter();expect(f.video.load).not.toHaveBeenCalled();expect(f.video.play).not.toHaveBeenCalled();expect(f.reveal).not.toHaveBeenCalled();f.button.dispatchEvent(new Event('click'));await Promise.resolve();expect(f.video.play).toHaveBeenCalledOnce();f.leave();f.enter();expect(f.video.play).toHaveBeenCalledOnce();f.dispose();
 });
 it('handles denied autoplay without unhandled rejection',async()=>{
  const f=fixture();f.video.play.mockRejectedValue(new Error('NotAllowedError'));f.enter();await Promise.resolve();expect(f.status.textContent).toContain('請按播放影片');expect(f.button.textContent).toBe('播放影片');f.dispose();
 });
 it('late play completion cannot restart after leave or reduced-motion change',async()=>{
  const f=fixture();let resolve!:()=>void;f.video.play.mockImplementation(()=>new Promise<void>(r=>{resolve=r;}));f.enter();f.motion.matches=true;f.motion.dispatchEvent(new Event('change'));resolve();await Promise.resolve();expect(f.video.paused).toBe(true);f.leave();f.dispose();
 });
 it('hidden tab pauses and reduced motion never resumes automatically',async()=>{
  const f=fixture();f.enter();await Promise.resolve();f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.video.paused).toBe(true);f.motion.matches=true;f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.video.play).toHaveBeenCalledOnce();f.dispose();expect(f.observers.every(o=>o.disconnect.mock.calls.length===1)).toBe(true);
 });
});
