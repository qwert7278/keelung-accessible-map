export function initChatgptExample(root:Document=document):()=>void{
  const button=root.getElementById('copy-chatgpt-example');
  const text=root.getElementById('chatgpt-example-text');
  const status=root.getElementById('copy-chatgpt-status');
  if(!button||!text||!status)return ()=>{};
  let disposed=false;
  const copy=async()=>{
    try{
      await navigator.clipboard.writeText(text.textContent?.trim()||'');
      if(!disposed)status.textContent='已複製。請換成你的現場資訊，並先上傳照片。';
    }catch{
      if(!disposed)status.textContent='無法自動複製，請選取上方範例文字後手動複製。';
    }
  };
  button.addEventListener('click',copy);
  return ()=>{disposed=true;button.removeEventListener('click',copy);};
}
