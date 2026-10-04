type Reveal = {revert: () => void};
async function revealStory(root: HTMLElement): Promise<Reveal> {
  const {gsap} = await import('gsap');
  return gsap.context(() => {
    gsap.fromTo(root.querySelector('.pov-copy'), {opacity: 0, y: 12}, {opacity: 1, y: 0, duration: .65, ease: 'power1.out'});
    gsap.fromTo(root.querySelector('.pov-frame'), {opacity: .5, scale: .97}, {opacity: 1, scale: 1, duration: .8, ease: 'power1.out'});
  }, root);
}
export function initStoryVideo(root: HTMLElement, reveal = revealStory): () => void {
  const video=root.querySelector<HTMLVideoElement>('video')!;
  const button=root.querySelector<HTMLButtonElement>('.pov-toggle')!;
  const status=root.querySelector<HTMLElement>('.pov-status')!;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, userPaused=false, disposed=false, revealed=false;
  let animation: Reveal | undefined;
  let playbackRevision=0;
  const load=()=>{
    if(!video.getAttribute('src')) { video.src=video.dataset.src!; video.load(); }
  };
  const pause=()=>{ playbackRevision++; video.pause(); };
  const play=async()=>{
    const revision=++playbackRevision;
    load(); video.muted=true;
    try { await video.play(); }
    catch { if(!disposed && visible && revision===playbackRevision) status.textContent='影片尚未播放，請按播放影片再試一次。'; }
    // A pending play promise must not restart media after scrolling away.
    if(disposed || !visible || document.hidden || revision!==playbackRevision) pause();
  };
  const sync=()=>{
    button.textContent=video.paused ? '播放影片' : '暫停影片';
    if(!video.paused) status.textContent='';
  };
  const toggle=()=>{
    if(video.paused) { userPaused=false; visible=true; void play(); }
    else { userPaused=true; pause(); }
  };
  const preference=()=>{
    animation?.revert(); animation=undefined;
    if(motion.matches) pause();
    else if(visible && !userPaused && !document.hidden) void play();
  };
  const visibility=()=>{
    if(document.hidden) pause();
    else if(visible && !motion.matches && !userPaused) void play();
  };
  const error=()=>{ status.textContent='影片暫時無法載入，請稍後再試。'; };
  button.addEventListener('click',toggle);
  video.addEventListener('play',sync); video.addEventListener('pause',sync); video.addEventListener('error',error);
  motion.addEventListener('change',preference); document.addEventListener('visibilitychange',visibility);
  // Keep the initial homepage payload free of video downloads. Reduced motion loads only on explicit play.
  const nearby=typeof IntersectionObserver==='undefined' ? undefined : new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting) && !motion.matches) load();
  },{rootMargin:'250px 0px'});
  nearby?.observe(video);
  const observer=typeof IntersectionObserver==='undefined' ? undefined : new IntersectionObserver(entries=>{
    const entry=entries[entries.length-1]; visible=entry.isIntersecting && entry.intersectionRatio>=.55;
    if(!visible) { pause(); return; }
    if(motion.matches) return;
    if(!revealed) {
      revealed=true;
      void reveal(root).then(result=>{ if(disposed || motion.matches) result.revert(); else animation=result; }).catch(()=>{});
    }
    if(!userPaused && !document.hidden) void play();
  },{threshold:[0,.55]});
  observer?.observe(video);
  return ()=>{
    disposed=true; observer?.disconnect(); nearby?.disconnect(); pause(); animation?.revert();
    button.removeEventListener('click',toggle); video.removeEventListener('play',sync); video.removeEventListener('pause',sync); video.removeEventListener('error',error);
    motion.removeEventListener('change',preference); document.removeEventListener('visibilitychange',visibility);
  };
}
