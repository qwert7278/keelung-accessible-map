export function initGuideCopies(root:Document=document):()=>void{
 const status=root.getElementById('guide-copy-status');
 const handlers=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-copy-source]')).map(button=>{
  button.disabled=false;
  const copy=async()=>{
   const source=root.getElementById(button.dataset.copySource||'');if(!source||!status)return;
   try{await navigator.clipboard.writeText(source.textContent?.trim()||'');button.textContent='已複製';status.textContent='已複製設定。請加入對應設定檔，保留原有其他內容。';}
   catch{status.textContent='無法自動複製，請選取設定文字後手動複製。';}
  };
  button.addEventListener('click',copy);return ()=>button.removeEventListener('click',copy);
 });
 return ()=>handlers.forEach(remove=>remove());
}
