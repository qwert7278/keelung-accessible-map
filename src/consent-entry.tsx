import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CONSENT_EVENT, readConsent, saveConsent } from './utils/consent';
import './consent.css';

function CookieChoices() {
  const [consent, setConsent] = useState(readConsent);
  const [opened, setOpened] = useState(false);
  const [desktop,setDesktop]=useState(()=>window.matchMedia('(min-width: 900px)').matches);
  useEffect(()=>{const media=window.matchMedia('(min-width: 900px)');const change=()=>setDesktop(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(() => {
    const update = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, update);
    return () => window.removeEventListener(CONSENT_EVENT, update);
  }, []);
  const visible = !consent || opened;
  const path=window.location.pathname.replace(/\/$/,'');
  const hideSettings=path==='/admin' || path==='/map' && desktop;
  function choose(enabled: boolean) { setConsent(saveConsent(enabled)); setOpened(false); }
  return <>
    {visible && <aside className="cookie-banner" aria-labelledby="cookie-title">
      <div><h2 id="cookie-title">從你附近的城市開始</h2>
        <p>允許地區偏好後，我們會用網路連線推估所在縣市，並記住你選擇的地區。推估可能有誤，你隨時可以切換；拒絕也能使用全部地圖功能。</p>
        <p className="cookie-detail">Cookie 選擇保存 180 天。這個功能不保存原始 IP、不取得 GPS 精確位置；目前沒有啟用使用統計。<a href="/privacy">查看隱私說明</a></p>
      </div>
      <div className="cookie-actions"><button type="button" onClick={() => choose(false)}>僅使用必要 Cookie</button><button type="button" onClick={() => choose(true)}>接受地區偏好</button>{consent && <button type="button" onClick={() => setOpened(false)}>保留原設定</button>}</div>
    </aside>}
    {!visible && !hideSettings && <button type="button" className="cookie-settings" onClick={() => setOpened(true)}>Cookie 設定</button>}
  </>;
}
const host = document.createElement('div');
host.id = 'roadtag-cookie-root';
document.body.append(host);
createRoot(host).render(<CookieChoices />);
