import { useEffect, useId, useRef, useState } from "react";
import { CameraIcon, ImageIcon } from "@phosphor-icons/react";
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
  const processingCallback = useRef(onProcessingChange);
  processingCallback.current = onProcessingChange;
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
  return (
    <div className="photo-uploader">
      <label className="field-label" htmlFor={id}>
        {label}
        {required && "（必填）"}
      </label>
      {url ? (
        <img className="photo-preview" src={url} alt={`${label}預覽`} />
      ) : (
        <div className="photo-empty">
          <CameraIcon size={32} aria-hidden="true" />
          <span>記錄現場，讓問題更清楚</span>
        </div>
      )}
      <div className="file-picker">
        <ImageIcon size={20} aria-hidden="true" />
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          required={required}
          disabled={disabled || busy}
          aria-describedby={`${id}-help`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Allow retrying the same file after a transient decoder failure.
            e.target.value = "";
            const request = gate.current.next();
            setBusy(true); onProcessingChange?.(true);
            setError("");
            onChange(null);
            try {
              const blob = await compressImage(file);
              if (gate.current.current(request)) onChange(blob);
            } catch (e) {
              if (gate.current.current(request)) setError(readableError(e));
            } finally {
              if (gate.current.current(request)) { setBusy(false); onProcessingChange?.(false); }
            }
          }}
        />
      </div>
      <small id={`${id}-help`}>
        可直接上傳手機照片（含 HEIC／HEIF）、JPG、PNG、WebP。系統自動壓縮轉檔並移除原始 EXIF；原檔最多 10 MB、2,000 萬像素，上傳最多 1 MB。
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
