import { useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CrosshairIcon,
  MapPinIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { CITY, DEMO_MODE } from "../config";
import {
  ACCESS,
  CATEGORIES,
  type Report,
  type ReportDraft,
  type ReportRepository,
} from "../types";
import {
  distanceMeters,
  readableError,
  validateDraft,
} from "../utils/validation";
import MapView from "./MapView";
import Modal from "./Modal";
import PhotoUploader from "./PhotoUploader";

export default function ReportForm({
  repository,
  reports,
  onClose,
  onCreated,
  onExisting,
}: {
  repository: ReportRepository;
  reports: Report[];
  onClose: () => void;
  onCreated: (id: string) => void;
  onExisting: (id: string) => void;
}) {
  const [locating, setLocating] = useState(false),
    [locationNote, setLocationNote] = useState("");
  const [step, setStep] = useState(1),
    [photo, setPhoto] = useState<Blob | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [honeypot, setHoneypot] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [picked, setPicked] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>({
    cityId: CITY.id,
    district: "仁愛區",
    title: "",
    address: "",
    description: "",
    category: "uneven_surface",
    wheelchairAccess: "difficult",
    location: { ...CITY.center },
  });
  const nearby = reports.find(
    (r) =>
      r.status !== "resolved" &&
      r.category === draft.category &&
      distanceMeters(r.location, draft.location) < 30,
  );
  function update<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  }
  function next() {
    const error = validateDraft(draft);
    if (!picked) {
      setError("請在地圖選點、使用定位，或輸入座標。");
      return;
    }
    if (error) {
      setError(error);
      return;
    }
    if (step === 2 && !photo) {
      setError("請選擇一張現場照片。");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 3) {
      next();
      return;
    }
    if (!photo || !confirmed || honeypot || busy) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem("last-accessible-report") ?? 0);
    } catch {
      /* Server cooldown remains authoritative when storage is unavailable. */
    }
    if (Date.now() - last < 30000) {
      setError("剛剛已送出回報，請稍候 30 秒再試。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await repository.create(draft, photo, setProgress);
      try {
        localStorage.setItem("last-accessible-report", String(Date.now()));
      } catch {
        /* Successful write must not be reported as a failure. */
      }
      onCreated(id);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setError("此瀏覽器不支援定位，請手動選點。");
      return;
    }
    setLocating(true);
    setError("");
    setLocationNote("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const location = { lat: p.coords.latitude, lng: p.coords.longitude },
          b = CITY.bounds;
        if (
          location.lat < b.south ||
          location.lat > b.north ||
          location.lng < b.west ||
          location.lng > b.east
        ) {
          setError("目前位置不在基隆服務範圍，請在地圖選擇障礙位置。");
          return;
        }
        update("location", location);
        setPicked(true);
        setLocationNote(
          `定位誤差約 ${Math.round(p.coords.accuracy)} 公尺。請確認標記位於障礙現場，必要時點選地圖調整。`,
        );
      },
      () => {
        setLocating(false);
        setError("無法取得定位，仍可點選地圖或輸入座標。");
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 },
    );
  }
  return (
    <Modal title="回報通行障礙" onClose={onClose} busy={busy} wide>
      <ol className="steps" aria-label="回報步驟">
        {["選擇位置", "照片與問題", "確認送出"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={step >= i + 1 ? "active" : ""}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <form onSubmit={submit} className="report-form">
        <fieldset disabled={busy}>
          {step === 1 && (
            <>
              <p className="muted">
                點選地圖標記障礙的位置，也可以直接輸入座標。
              </p>
              <div className="picker-map">
                <MapView
                  reports={[]}
                  onSelect={() => {}}
                  picking
                  onPick={(location) => {
                    update("location", location);
                    setPicked(true);
                  }}
                  position={picked ? draft.location : undefined}
                  focus={draft.location}
                />
              </div>
              <button
                type="button"
                className="button secondary full"
                disabled={locating}
                onClick={locate}
              >
                <CrosshairIcon size={20} />
                {locating ? "正在取得位置…" : "使用目前位置"}
              </button>
              {locationNote && (
                <p className="muted" role="status">
                  {locationNote}
                </p>
              )}
              <div className="form-grid">
                <label>
                  緯度
                  <input
                    type="number"
                    step="any"
                    required
                    value={draft.location.lat}
                    onChange={(e) => {
                      update("location", {
                        ...draft.location,
                        lat: Number(e.target.value),
                      });
                      setPicked(true);
                    }}
                  />
                </label>
                <label>
                  經度
                  <input
                    type="number"
                    step="any"
                    required
                    value={draft.location.lng}
                    onChange={(e) => {
                      update("location", {
                        ...draft.location,
                        lng: Number(e.target.value),
                      });
                      setPicked(true);
                    }}
                  />
                </label>
              </div>
              <label>
                位置名稱／標題（必填）
                <input
                  required
                  maxLength={80}
                  placeholder="例如：基隆車站南站出口旁"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label>
                  行政區
                  <select
                    value={draft.district}
                    onChange={(e) => update("district", e.target.value)}
                  >
                    {CITY.districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  地址（選填）
                  <input
                    maxLength={200}
                    value={draft.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="不知道地址也能回報"
                  />
                </label>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="photo-guidance">
                拍到障礙本身，也盡量拍到周圍通行空間。請避免刻意拍攝可辨識的人臉、車牌或其他不必要個資。
              </p>
              <PhotoUploader
                label="現場照片"
                required
                value={photo}
                onChange={setPhoto}
              />
              <label>
                障礙類型
                <select
                  value={draft.category}
                  onChange={(e) =>
                    update(
                      "category",
                      e.target.value as ReportDraft["category"],
                    )
                  }
                >
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="access-options">
                <legend>輪椅通行程度</legend>
                {Object.entries(ACCESS).map(([key, label]) => (
                  <label
                    key={key}
                    className={draft.wheelchairAccess === key ? "chosen" : ""}
                  >
                    <input
                      type="radio"
                      name="access"
                      value={key}
                      checked={draft.wheelchairAccess === key}
                      onChange={() =>
                        update(
                          "wheelchairAccess",
                          key as ReportDraft["wheelchairAccess"],
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <label>
                簡短說明（選填）
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={draft.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="告訴大家現場的狀況，例如需要繞路、坡度太陡…"
                />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <div className="review-card">
                <MapPinIcon size={28} />
                <h3>{draft.title}</h3>
                <p>
                  {draft.district} · {CATEGORIES[draft.category]}
                </p>
                <strong>{ACCESS[draft.wheelchairAccess]}</strong>
                <p>
                  {draft.location.lat.toFixed(5)},{" "}
                  {draft.location.lng.toFixed(5)}
                </p>
                <p>{draft.description || "未填寫補充說明"}</p>
              </div>
              {nearby && (
                <div className="notice">
                  30 公尺內已有同類型回報「{nearby.title}」。
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onExisting(nearby.id)}
                  >
                    查看現有回報
                  </button>
                  <p>若是不同障礙，可以繼續送出。</p>
                </div>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                我已確認照片未包含可辨識的人臉、車牌或個人資訊，並同意
                {DEMO_MODE ? "將測試回報保存在此瀏覽器" : "公開此回報與照片"}。
              </label>
              <p className="muted">
                {DEMO_MODE
                  ? "這是 Demo，資料不會送交政府，也不會分享給其他使用者。"
                  : "送出後可公開瀏覽。此平台目前不會將案件自動轉交政府。"}
              </p>
            </>
          )}
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <div role="status">
            <p>
              {DEMO_MODE ? "正在儲存測試回報" : "正在上傳照片與儲存回報"}…{" "}
              {progress}%
            </p>
            <progress value={progress} max={100} />
          </div>
        )}
        <footer className="form-actions">
          {step > 1 ? (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setStep((s) => s - 1);
                setError("");
              }}
            >
              <ArrowLeftIcon size={18} />
              上一步
            </button>
          ) : (
            <span />
          )}
          <button
            className="button primary"
            disabled={busy || (step === 3 && !confirmed)}
            type="submit"
          >
            {step === 3 ? (
              <>
                <CheckCircleIcon size={20} />
                {busy ? "送出中…" : "確認送出"}
              </>
            ) : (
              <>
                下一步
                <ArrowRightIcon size={18} />
              </>
            )}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
