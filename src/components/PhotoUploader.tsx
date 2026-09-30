import { useEffect, useId, useState } from "react";
import { CameraIcon, ImageIcon } from "@phosphor-icons/react";
import { compressImage } from "../utils/images";
import { readableError } from "../utils/validation";
export default function PhotoUploader({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
}: {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const id = useId(),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          aria-describedby={`${id}-help`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            onChange(null);
            try {
              onChange(await compressImage(file));
            } catch (e) {
              setError(readableError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      <small id={`${id}-help`}>
        JPG、PNG、WebP，最大 10 MB。自動縮圖並移除原始 EXIF 中繼資料。
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
