import {compressImage} from '../src/utils/images';
const form=document.querySelector('form')!,status=document.querySelector('pre')!;
const operation=form.elements.namedItem('operation') as HTMLInputElement,report=form.elements.namedItem('report') as HTMLInputElement;
operation.value=crypto.randomUUID();report.value=operation.value;
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button')!;button.disabled=true;
 try{
  const data=new FormData(form),file=data.get('photo');if(!(file instanceof File))throw new Error('請選擇照片');
  status.textContent='正在處理照片…';const blob=await compressImage(file),headers={authorization:'Bearer '+String(data.get('credential')),'Content-Type':'application/json'};
  const payload={operation_id:data.get('operation'),report_id:data.get('report'),kind:data.get('kind'),format:blob.type==='image/jpeg'?'jpeg':'webp'};
  const call=async(path:string)=>{const response=await fetch(path,{method:'POST',headers,body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error?.code||'上傳失敗');return result;};
  const reserved=await call('/api/mcp-photo');
  if(!reserved.uploaded){const response=await fetch('/api/mcp-photo/upload',{method:'POST',headers:{authorization:headers.authorization,'Content-Type':blob.type,'x-roadtag-photo':JSON.stringify(payload)},body:blob});if(!response.ok)throw new Error('上傳失敗');}
  status.textContent=JSON.stringify(await call('/api/mcp-photo/finalize'),null,2);
 }catch(error){status.textContent=error instanceof Error?error.message:'照片交接失敗';}finally{button.disabled=false;}
});
