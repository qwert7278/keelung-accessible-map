import { useEffect, useId, useRef, type ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";
export default function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
  sheet = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  sheet?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.showModal();
    const header = dialog.querySelector<HTMLElement>('.modal-header');
    const measureHeader = () => {
      if (header) dialog.style.setProperty('--modal-header-height', `${header.getBoundingClientRect().height}px`);
    };
    measureHeader();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureHeader);
    if (header) observer?.observe(header);
    window.addEventListener('resize', measureHeader);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureHeader);
      dialog.close();
      window.requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
        else document.querySelector<HTMLElement>("main")?.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${wide ? " modal-wide" : ""}${sheet ? " modal-sheet" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="關閉視窗"
          disabled={busy}
          onClick={onClose}
        >
          <XIcon size={24} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
