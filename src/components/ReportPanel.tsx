import { useEffect, useState, type FormEvent } from "react";
import {
  ImageIcon,
  WheelchairIcon,
  MapPinIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import {
  ACCESS,
  CATEGORIES,
  STATUSES,
  type Access,
  type Report,
  type ReportRepository,
  type ReportUpdate,
  type Status,
} from "../types";
import { DEMO_MODE } from "../config";
import { readableError } from "../utils/validation";
import Modal from "./Modal";
import PhotoUploader from "./PhotoUploader";
import StatusBadge from "./StatusBadge";
import { reportShareUrl } from "../utils/reportLink";

const date = (value: string) =>
  new Date(value).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
function Photo({ src, label }: { src: string | null; label: string }) {
  return (
    <figure>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={label} />
        </a>
      ) : (
        <div className="photo-empty">
          <ImageIcon size={32} />
          <span>尚無照片</span>
        </div>
      )}
      <figcaption>{label}</figcaption>
    </figure>
  );
}
export default function ReportPanel({
  report,
  repository,
  admin,
  onClose,
}: {
  report: Report;
  repository: ReportRepository;
  admin: boolean;
  onClose: () => void;
}) {
  const [updates, setUpdates] = useState<ReportUpdate[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [photo, setPhoto] = useState<Blob | null>(null),
    [suggestion, setSuggestion] = useState<Status | "">(""),
    [status, setStatus] = useState(report.status),
    [access, setAccess] = useState(report.wheelchairAccess),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [success, setSuccess] = useState(""),
    [shareMessage, setShareMessage] = useState(""),
    [shareUrl, setShareUrl] = useState(""),
    [revision, setRevision] = useState(0),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    let active = true;
    repository
      .updates(report.id)
      .then((u) => {
        if (active) setUpdates(u);
      })
      .catch((e) => {
        if (active) setError(readableError(e));
      });
    return () => {
      active = false;
    };
  }, [repository, report.id, revision]);
  const latest = [...updates].reverse().find((u) => u.imageUrl)?.imageUrl;
  async function shareReport() {
    const url = reportShareUrl(window.location.origin, report.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, url });
        setShareMessage("已開啟分享選項。");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareMessage("案件連結已複製。");
      } else {
        setShareUrl(url);
        setShareMessage("此瀏覽器不支援自動複製，請複製下方連結。");
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        setShareUrl(url);
        setShareMessage("無法分享連結，請確認瀏覽器權限後再試。");
      }
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !consent) return;
    setBusy(true);
    setError("");
    setSuccess("");
    setProgress(0);
    try {
      if (admin)
        await repository.moderate(
          report,
          status,
          message,
          access,
          photo,
          setProgress,
        );
      else
        await repository.addUpdate(
          report.id,
          { message, suggestedStatus: suggestion || null },
          photo,
          setProgress,
        );
      setPhoto(null);
      setMessage("");
      setConsent(false);
      setRevision((r) => r + 1);
      setSuccess(
        admin
          ? "案件狀態與管理紀錄已更新。"
          : "補充已保存，正式案件狀態由管理者審核。",
      );
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={report.title} onClose={onClose} busy={busy} wide>
      <div className="panel-content">
        <div className="detail-top">
          <StatusBadge status={report.status} />
          <span>{CATEGORIES[report.category]}</span>
          {DEMO_MODE && <span className="demo-tag">測試資料</span>}
        </div>
        <p className="location-line">
          <MapPinIcon size={18} />
          {report.address ||
            `${report.district} · ${report.location.lat.toFixed(5)}, ${report.location.lng.toFixed(5)}`}
        </p>
        <div className="report-actions">
          <button className="button secondary" type="button" onClick={shareReport}>
            <ShareNetworkIcon size={18} />
            分享案件
          </button>
          {shareMessage && <span role="status">{shareMessage}</span>}
          {shareUrl && (
            <label className="share-link">
              案件連結
              <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
            </label>
          )}
        </div>
        <div className={`access-callout access-${report.wheelchairAccess}`}>
          <WheelchairIcon size={24} />
          <div>
            <small>輪椅通行程度</small>
            <strong>{ACCESS[report.wheelchairAccess]}</strong>
          </div>
        </div>
        <p>{report.description || "此案件尚無補充說明。"}</p>
        <div className="before-after">
          <Photo src={report.beforeImageUrl} label="改善前／原始照片" />
          <Photo
            src={report.afterImageUrl || latest || null}
            label={report.afterImageUrl ? "改善後（管理者上傳）" : "最新照片"}
          />
        </div>
        <p className="metadata">
          建立：{date(report.createdAt)}
          <br />
          案件狀態更新：{date(report.updatedAt)}
        </p>
        <section className="timeline">
          <h3>
            現場紀錄 <span className="count">{updates.length}</span>
          </h3>
          {updates.length === 0 ? (
            <p className="muted">
              還沒有補充紀錄。每一筆更新，都讓現場更清楚。
            </p>
          ) : (
            <ol>
              {updates.map((u) => (
                <li key={u.id}>
                  <div>
                    <strong>
                      {u.type === "admin" ? "管理者更新" : "民眾補充"}
                    </strong>
                    <time>{date(u.createdAt)}</time>
                  </div>
                  <p>{u.message}</p>
                  {u.suggestedStatus && (
                    <small>
                      {u.type === "admin"
                        ? "設定狀態："
                        : "民眾回報（待審核）："}
                      {STATUSES[u.suggestedStatus]}
                    </small>
                  )}
                  {u.imageUrl && (
                    <img
                      className="update-photo"
                      src={u.imageUrl}
                      alt="此筆現場更新的照片"
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
        <form onSubmit={submit} className="update-form">
          <h3>{admin ? "管理案件" : "補充最新狀況"}</h3>
          {!admin && (
            <p className="muted">
              你的補充會公開顯示；若提出狀況改善，正式案件狀態仍由管理者確認後更新。
            </p>
          )}
          {admin && DEMO_MODE && (
            <p className="notice">Demo 管理操作只影響你的瀏覽器測試資料。</p>
          )}
          <fieldset disabled={busy}>
            {admin ? (
              <div className="form-grid">
                <label>
                  正式案件狀態
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                  >
                    {Object.entries(STATUSES).map(([k, v]) => (
                      <option value={k} key={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  最新通行程度
                  <select
                    value={access}
                    onChange={(e) => setAccess(e.target.value as Access)}
                  >
                    {Object.entries(ACCESS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <label>
                目前觀察
                <select
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value as Status | "")}
                >
                  <option value="">僅補充資訊</option>
                  <option value="open">問題仍存在</option>
                  <option value="resolved">看起來已改善（需管理者確認）</option>
                </select>
              </label>
            )}
            <label>
              {admin ? "管理註記" : "現場說明"}（必填）
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="請描述這次更新的內容"
              />
            </label>
            <PhotoUploader
              label={admin ? "改善後照片" : "最新照片（選填）"}
              value={photo}
              onChange={setPhoto}
            />
            <label className="check-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              我確認內容不包含可辨識的個人資訊，並同意
              {DEMO_MODE ? "儲存在此瀏覽器" : "公開此紀錄與照片"}。
            </label>
            <button className="button primary full" disabled={busy || !consent}>
              {busy
                ? `儲存中 ${progress}%`
                : admin
                  ? "儲存案件變更"
                  : "送出補充"}
            </button>
          </fieldset>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="success" role="status">
              {success}
            </p>
          )}
        </form>
      </div>
    </Modal>
  );
}
