import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CrosshairIcon,
  MapPinIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type City, DEMO_MODE } from "../config";
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
import GuidedTourPrompt from "./GuidedTourPrompt";

const GUIDE_COPY: Record<number, { title: string; body: string }> = {
  1: {
    title: "選擇障礙位置",
    body: "點選閃動的地圖標記障礙位置，或按「使用目前位置」。不想開 GPS 也可以完成。",
  },
  2: {
    title: "寫一個看得懂的地點名稱",
    body: "在閃動欄位輸入清楚的位置，例如「車站出口旁的騎樓入口」。填好後點欄位外，教學會帶你到下一個按鈕。",
  },
  3: {
    title: "前往現場資訊",
    body: "確認位置與地點名稱後，按「下一步」。",
  },
  4: {
    title: "上傳現場照片",
    body: "按閃動區域內的「選擇檔案」，上傳一張能看見障礙本身與周圍通行空間的照片。",
  },
  5: {
    title: "選擇輪椅通行程度",
    body: "依你看到的現況，選擇「無法通過」、「通行困難」或「可通過」。",
  },
  6: {
    title: "檢查現場資料",
    body: "照片與通行程度完成後，按「下一步」。",
  },
  7: {
    title: "確認公開內容",
    body: "閱讀確認事項，確認沒有不必要的個人資訊後勾選同意。",
  },
  8: {
    title: "送出回報",
    body: "最後按「確認送出」。完成後這筆紀錄會顯示在地圖上。",
  },
};

export default function ReportForm({
  repository,
  city,
  initialDistrict,
  reports,
  guidedStep = null,
  onGuidedStepChange,
  onClose,
  onCreated,
  onExisting,
}: {
  repository: ReportRepository;
  city: City;
  initialDistrict: string;
  reports: Report[];
  guidedStep?: number | null;
  onGuidedStepChange?: (step: number | null) => void;
  onClose: () => void;
  onCreated: (id: string) => void;
  onExisting: (id: string) => void;
}) {
  const [locating, setLocating] = useState(false),
    [locationNote, setLocationNote] = useState("");
  const [manualCoordinates, setManualCoordinates] = useState({
    lat: false,
    lng: false,
  });
  const [step, setStep] = useState(1),
    [photo, setPhoto] = useState<Blob | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [honeypot, setHoneypot] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [picked, setPicked] = useState(false);
  const [draft, setDraft] = useState<ReportDraft>({
    cityId: city.id,
    district: initialDistrict === "all" ? city.defaultDistrict : initialDistrict,
    title: "",
    address: "",
    description: "",
    category: "uneven_surface",
    wheelchairAccess: "difficult",
    location: { ...city.center },
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
  function updateManualCoordinate(axis: "lat" | "lng", value: string) {
    const location = { ...draft.location, [axis]: Number(value) };
    const touched = { ...manualCoordinates, [axis]: true };
    const bounds = city.bounds;
    const valid =
      touched.lat &&
      touched.lng &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      location.lat >= bounds.south &&
      location.lat <= bounds.north &&
      location.lng >= bounds.west &&
      location.lng <= bounds.east;

    setManualCoordinates(touched);
    update("location", location);
    setPicked(valid);
    if (valid && guidedStep === 1) onGuidedStepChange?.(2);
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
    if (guidedStep !== null) {
      if (step === 1) onGuidedStepChange?.(4);
      if (step === 2) onGuidedStepChange?.(7);
    }
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
      onGuidedStepChange?.(null);
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
          b = city.bounds;
        if (
          location.lat < b.south ||
          location.lat > b.north ||
          location.lng < b.west ||
          location.lng > b.east
        ) {
          setError(`目前位置不在${city.name}範圍，請切換縣市後回報，或在地圖選擇障礙位置。`);
          return;
        }
        update("location", location);
        setPicked(true);
        setLocationNote(
          `定位誤差約 ${Math.round(p.coords.accuracy)} 公尺。請確認標記位於障礙現場，必要時點選地圖調整。`,
        );
        if (guidedStep === 1) onGuidedStepChange?.(2);
      },
      () => {
        setLocating(false);
        setError("無法取得定位，仍可點選地圖或輸入座標。");
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 },
    );
  }
  const currentGuide =
    guidedStep !== null ? GUIDE_COPY[guidedStep] : undefined;

  useEffect(() => {
    if (guidedStep === null) return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      const target =
        dialog?.querySelector<HTMLElement>(".guide-target-active") ?? null;
      if (!target) return;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        block: "center",
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guidedStep, step]);

  return (
    <Modal title="回報通行障礙" onClose={onClose} busy={busy} wide>
      <ol className="steps" aria-label="回報步驟">
        {["障礙在哪裡？", "現場是什麼狀況？", "確認後送出"].map((label, i) => (
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
      {currentGuide && (
        <GuidedTourPrompt
          step={guidedStep! + 1}
          total={9}
          title={currentGuide.title}
          onSkip={() => onGuidedStepChange?.(null)}
        >
          {currentGuide.body}
        </GuidedTourPrompt>
      )}
      <form onSubmit={submit} className="report-form">
        <fieldset disabled={busy}>
          {step === 1 && (
            <>
              <p className="muted">
                回報縣市：{city.name}。點選地圖標記騎樓或人行道障礙，也可以直接輸入座標。
              </p>
              <div
                className={`picker-map${guidedStep === 1 ? " guide-target-active guide-target-block" : ""}`}
              >
                <MapView
                  city={city}
                  reports={[]}
                  onSelect={() => {}}
                  picking
                  onPick={(location) => {
                    update("location", location);
                    setPicked(true);
                    if (guidedStep === 1) onGuidedStepChange?.(2);
                  }}
                  position={picked ? draft.location : undefined}
                  focus={draft.location}
                />
              </div>
              <button
                type="button"
                className={`button secondary full${guidedStep === 1 ? " guide-target-active" : ""}`}
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
                    onChange={(e) =>
                      updateManualCoordinate("lat", e.target.value)
                    }
                  />
                </label>
                <label>
                  經度
                  <input
                    type="number"
                    step="any"
                    required
                    value={draft.location.lng}
                    onChange={(e) =>
                      updateManualCoordinate("lng", e.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                位置名稱／標題（必填）
                <input
                  className={guidedStep === 2 ? "guide-target-active" : undefined}
                  required
                  maxLength={80}
                  placeholder="例如：車站出口旁的騎樓入口"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                  onBlur={() => {
                    if (guidedStep === 2 && draft.title.trim()) {
                      onGuidedStepChange?.(3);
                    }
                  }}
                />
              </label>
              <div className="form-grid">
                <label>
                  行政區
                  <select
                    value={draft.district}
                    onChange={(e) => update("district", e.target.value)}
                  >
                    {city.districts.map((d) => (
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
              <div className={guidedStep === 4 ? "guide-target-active guide-target-block" : undefined}>
                <PhotoUploader
                  label="現場照片"
                  required
                  value={photo}
                  onChange={(blob) => {
                    setPhoto(blob);
                    if (blob && guidedStep === 4) {
                      onGuidedStepChange?.(5);
                    }
                  }}
                />
              </div>
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
              <fieldset
                className={`access-options${guidedStep === 5 ? " guide-target-active guide-target-block" : ""}`}
              >
                <legend>輪椅通行程度</legend>
                {Object.entries(ACCESS).map(([key, label]) => (
                  <label
                    key={key}
                    className={`${draft.wheelchairAccess === key ? "chosen " : ""}access-${key}`}
                  >
                    <input
                      type="radio"
                      name="access"
                      value={key}
                      checked={draft.wheelchairAccess === key}
                      onChange={() => {
                        update(
                          "wheelchairAccess",
                          key as ReportDraft["wheelchairAccess"],
                        );
                        if (guidedStep === 5) {
                          onGuidedStepChange?.(6);
                        }
                      }}
                    />
                    {key === "blocked" ? (
                      <XCircleIcon size={18} aria-hidden="true" />
                    ) : key === "difficult" ? (
                      <WarningCircleIcon size={18} aria-hidden="true" />
                    ) : (
                      <CheckCircleIcon size={18} aria-hidden="true" />
                    )}
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
                  {city.name} {draft.district} · {CATEGORIES[draft.category]}
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
              <label
                className={`check-label${guidedStep === 7 ? " guide-target-active guide-target-block" : ""}`}
              >
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    if (e.target.checked && guidedStep === 7) {
                      onGuidedStepChange?.(8);
                    }
                  }}
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
                const previousStep = step - 1;
                setStep(previousStep);
                setError("");
                if (guidedStep !== null) {
                  onGuidedStepChange?.(previousStep === 1 ? 1 : 4);
                }
              }}
            >
              <ArrowLeftIcon size={18} />
              上一步
            </button>
          ) : (
            <span />
          )}
          <button
            className={`button primary${
              (step === 1 && guidedStep === 3) ||
              (step === 2 && guidedStep === 6) ||
              (step === 3 && guidedStep === 8)
                ? " guide-target-active"
                : ""
            }`}
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
