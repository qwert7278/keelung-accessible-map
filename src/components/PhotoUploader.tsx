import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { CameraIcon, ImageIcon, XIcon } from "@phosphor-icons/react";
import './PhotoUploader.css';
import { compressImage } from "../utils/images";
import { readableError } from "../utils/validation";
import { revisionGate } from "../utils/revisionGate";
export default function PhotoUploader({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  onProcessingChange,
}: {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const id = useId(),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const gate = useRef(revisionGate());
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryButtonRef = useRef<HTMLButtonElement>(null);
  const processingCallback = useRef(onProcessingChange);
  processingCallback.current = onProcessingChange;
  useEffect(() => {
    const inputs = [inputRef.current, cameraRef.current];
    const stopPickerCancel = (event: Event) => event.stopPropagation();
    inputs.forEach(input => input?.addEventListener('cancel', stopPickerCancel));
    return () => inputs.forEach(input => input?.removeEventListener('cancel', stopPickerCancel));
  }, []);
  useEffect(() => () => { gate.current.invalidate(); processingCallback.current?.(false); }, []);
  useEffect(() => {
    if (!value) {
      setUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(value);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);
  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return; // Cancelling a picker preserves the current photo and form.
    event.target.value = "";
    const request = gate.current.next();
    setBusy(true); onProcessingChange?.(true);
    setError("");
    onChange(null);
    try {
      const blob = await compressImage(file);
      if (gate.current.current(request)) onChange(blob);
    } catch (error) {
      if (gate.current.current(request)) setError(readableError(error));
    } finally {
      if (gate.current.current(request)) { setBusy(false); onProcessingChange?.(false); }
    }
  }
  return (
    <div className="photo-uploader">
      <span className="field-label">
        {label}
        {required && "（必填）"}
      </span>
      {url ? (
        <div className="photo-preview-container">
          <img className="photo-preview" src={url} alt={`${label}預覽`} />
          <button
            type="button"
            className="icon-button photo-remove"
            aria-label={`移除${label}`}
            title="移除照片，重新選擇"
            disabled={disabled || busy}
            onClick={(event) => {
              event.stopPropagation();
              gate.current.invalidate();
              setError("");
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
              if (cameraRef.current) cameraRef.current.value = "";
              galleryButtonRef.current?.focus();
            }}
          >
            <XIcon size={22} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="photo-empty">
          <CameraIcon size={32} aria-hidden="true" />
          <span>記錄現場，讓問題更清楚</span>
        </div>
      )}
      <div className="photo-picker-actions">
        <button type="button" className="button secondary" disabled={disabled || busy}
          aria-describedby={`${id}-help`} onClick={()=>cameraRef.current?.click()}>
          <CameraIcon size={20} aria-hidden="true" />拍照
        </button>
        <button ref={galleryButtonRef} type="button" className="button secondary" disabled={disabled || busy}
          aria-describedby={`${id}-help`} onClick={()=>inputRef.current?.click()}>
          <ImageIcon size={20} aria-hidden="true" />從相簿選擇
        </button>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
          hidden
          disabled={disabled || busy}
          aria-describedby={`${id}-help`}
          onChange={selectPhoto}
        />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
          disabled={disabled || busy} onChange={selectPhoto}/>
      </div>
      <small id={`${id}-help`}>
        一次選擇一張照片。可拍照或從相簿、檔案選取；取消選圖不會關閉回報視窗。系統會自動壓縮照片。
      </small>
      {busy && <p role="status">正在處理照片…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
