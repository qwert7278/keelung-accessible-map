const endpoint='https://roadtag.org/api/mcp-public';
export function initPublicMcp(root:Document=document,released=import.meta.env.VITE_MCP_PUBLIC_RELEASED==='true'):()=>void{
 const button=root.getElementById('copy-mcp-url') as HTMLButtonElement|null;
 const example=root.getElementById('copy-mcp-prompt') as HTMLButtonElement|null;
 const text=root.getElementById('public-mcp-prompt'),status=root.getElementById('public-mcp-status');
 if(!example||!text||!status)return ()=>{};
 if(button)button.disabled=false;
 example.disabled=!released;
 status.textContent=button?'固定連接網址可直接複製；請在 AI 助理中確認連線狀態。':released?'':'公開唯讀 MCP 準備中，尚未開放。';
 let disposed=false;
 const show=(message:string)=>{if(!disposed)status.textContent=message;};
 const copy=async(value:string,kind:'url'|'example'='example')=>{
  try{await navigator.clipboard.writeText(value);show(kind==='url'?'已複製 MCP 網址，不代表服務目前可連接。請貼到 AI 助理的接入設定。':'已複製查詢範例。請貼到已連接 Road Tag 的 AI 對話中。');}
  catch{show('無法自動複製，請選取上方文字後手動複製。');}
 };
 const copyUrl=async()=>{if(!disposed)await copy(endpoint,'url');};
 const copyExample=async()=>{if(released&&!disposed)await copy(text.textContent?.trim()||'');};
 button?.addEventListener('click',copyUrl);example.addEventListener('click',copyExample);
 return ()=>{disposed=true;button?.removeEventListener('click',copyUrl);example.removeEventListener('click',copyExample);};
}
