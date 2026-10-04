import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { XIcon } from '@phosphor-icons/react';
import Modal from './Modal';

export default function ReportDetailShell({ title, busy, onClose, children }: {
  title:string; busy:boolean; onClose:()=>void; children:ReactNode;
}) {
  const heading = useId();
  const drawer = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const change = () => setDesktop(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const closeDrawer = () => {
    if (drawer.current?.contains(document.activeElement))
      (document.querySelector<HTMLElement>('.report-card.selected') || document.querySelector<HTMLElement>('main'))?.focus({preventScroll:true});
    onClose();
  };
  useEffect(() => {
    if (!desktop) return;
    const escape = (event:KeyboardEvent) => {
      // A help/report modal owns Escape while it is above the non-modal drawer.
      if (event.key === 'Escape' && !event.defaultPrevented && !busy && !document.querySelector('dialog[open]')) closeDrawer();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [desktop, busy, closeDrawer]);
  if (!desktop) return <Modal title={title} busy={busy} onClose={onClose} wide sheet>{children}</Modal>;
  return <aside ref={drawer} className="report-detail-drawer" aria-labelledby={heading}>
    <header className="report-detail-header">
      <h2 id={heading}>{title}</h2>
      <button className="icon-button" type="button" aria-label="關閉案件詳情" disabled={busy} onClick={closeDrawer}><XIcon size={24}/></button>
    </header>
    {children}
  </aside>;
}
