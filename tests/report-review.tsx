// Local browser regression only: real encoder/component, synthetic images, no repository.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import PhotoUploader from '../src/components/PhotoUploader';
import Modal from '../src/components/Modal';
import { MAX_IMAGE_SIZE } from '../src/utils/images';
import '../src/styles.css';

function ReviewQA() {
  const form = useRef<HTMLFormElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [fixtureError, setFixtureError] = useState('');
  const [open, setOpen] = useState(true);
  const sample = useRef<File | null>(null);
  const previousPhoto = useRef<Blob | null>(null);
  const [replacement, setReplacement] = useState(false);
  async function selectPhoto(valid: boolean, failure: 'broken' | 'large' | 'decoder' = 'broken') {
    try {
      setFixtureError('');
      if (!sample.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const context = canvas.getContext('2d')!;
        context.fillStyle = '#007f86'; context.fillRect(0, 0, 640, 480);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        if (!blob) throw new Error('QA JPEG encoder unavailable');
        sample.current = new File([blob], 'synthetic-road.jpg', {type:'image/jpeg'});
      }
      const transfer = new DataTransfer();
      if (!valid) { previousPhoto.current = photo; setReplacement(true); } else setReplacement(false);
      let selected = sample.current;
      if (!valid) {
        let bytes: BlobPart = 'invalid bytes';
        if (failure === 'large') bytes = new Uint8Array(MAX_IMAGE_SIZE + 1);
        if (failure === 'decoder') {
          const jpeg = new Uint8Array(await sample.current.arrayBuffer());
          const sos = jpeg.findIndex((value,index)=>value===255 && jpeg[index+1]===218);
          if (sos < 0) throw new Error('QA JPEG scan missing');
          bytes = jpeg.slice(0, sos + 4); // Valid dimensions, missing scan data: decoder rejection.
        }
        selected = new File([bytes], 'synthetic-road.jpg', {type:'image/jpeg'});
      }
      transfer.items.add(selected);
      const input = form.current!.querySelector<HTMLInputElement>('input[type="file"]')!;
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    } catch (error) {setFixtureError(String(error));}
  }
  return <main style={{maxWidth:650,margin:'24px auto',padding:16}}>
    <h1>照片回歸驗證</h1><p>僅使用合成照片；實際執行照片元件與 WebP 壓縮，不上傳或寫入案件。</p>
    {!open && <button onClick={()=>setOpen(true)}>開啟回報視窗</button>}
    {open && <Modal title="回報照片隔離驗證" onClose={()=>setOpen(false)}>
    <div className="form-actions">
      <button type="button" disabled={busy} onClick={()=>void selectPhoto(true)}>選擇／重選同一張合成照片</button>
      <button type="button" disabled={busy} onClick={()=>void selectPhoto(false)}>選擇損壞照片</button>
      <button type="button" disabled={busy} onClick={()=>void selectPhoto(false,'large')}>選擇過大照片</button>
      <button type="button" disabled={busy} onClick={()=>void selectPhoto(false,'decoder')}>選擇無法解碼照片</button>
      <button type="button" onClick={()=>form.current!.querySelector('input[type="file"]')!.dispatchEvent(new Event('cancel',{bubbles:true}))}>模擬取消選圖</button>
    </div>
    <form ref={form} onSubmit={event=>{event.preventDefault();if(photo&&!busy)setSubmitted(value=>value+1);}}>
      <label>已填位置名稱<input defaultValue="車站出口騎樓" /></label>
      <PhotoUploader label="QA 現場照片" required value={photo} onChange={setPhoto} onProcessingChange={setBusy}/>
      <button className="button primary" disabled={busy} type="submit">驗證下一步</button>
    </form>
    <output aria-label="照片驗證結果">{`照片：${photo?.type || '無'}；處理中：${busy}；下一步次數：${submitted}`}</output>
    {replacement && !busy && <output aria-label="重選失敗回歸">{photo === previousPhoto.current && !!photo ? 'PASS：保留相同原照片' : 'FAIL：原照片遺失'}</output>}
    {fixtureError && <p role="alert">{fixtureError}</p>}
    </Modal>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<ReviewQA/>);
