import { useEffect, useId, useRef, type ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";
export default function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
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
    return () => {
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
      className={wide ? "modal modal-wide" : "modal"}
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
