import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CrosshairIcon,
  HouseIcon,
  InfoIcon,
  ListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ThreadsLogoIcon,
  WheelchairIcon,
} from "@phosphor-icons/react";
import { BETA_FEEDBACK_EMAIL, CITY, DEMO_MODE } from "./config";
import {
  ACCESS,
  CATEGORIES,
  STATUSES,
  type Location,
  type Report,
  type ReportRepository,
  type Session,
  type Status,
} from "./types";
import { loadRepository } from "./services/repository";
import { readableError } from "./utils/validation";
import MapView from "./components/MapView";
import StatusBadge from "./components/StatusBadge";
import ReportForm from "./components/ReportForm";
import ReportPanel from "./components/ReportPanel";
import Modal from "./components/Modal";
import HelpPanel from "./components/HelpPanel";
import OnboardingPanel from "./components/OnboardingPanel";
import ReportSuccessPanel from "./components/ReportSuccessPanel";
import GuidedTourPrompt from "./components/GuidedTourPrompt";
import AdminWorkspace from "./components/AdminWorkspace";
import { reportIdFromSearch } from "./utils/reportLink";

const HOMEPAGE_URL = "/";

export default function App() {
  const [repository, setRepository] = useState<ReportRepository | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [reports, setReports] = useState<Report[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState<Status | "all">("all"),
    [district, setDistrict] = useState("all"),
    [access, setAccess] = useState("all"),
    [selected, setSelected] = useState<string | null>(() =>
      reportIdFromSearch(window.location.search),
    ),
    [creating, setCreating] = useState(false),
    [onboarding, setOnboarding] = useState(false),
    [guideStep, setGuideStep] = useState<number | null>(null),
    [help, setHelp] = useState(false),
    [about, setAbout] = useState(false),
    [focus, setFocus] = useState<Location>(),
    [toast, setToast] = useState(""),
    [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInSent, setSignInSent] = useState(false);
  const [adminDraftStatus, setAdminDraftStatus] = useState<Status | null>(null);
  const adminPage = window.location.pathname.replace(/\/$/, "") === "/admin";
  const guideReady = !!repository && !!session;
  useEffect(() => {
    let active = true,
      unsubscribe: (() => void) | undefined;
    loadRepository()
      .then(async (repo) => {
        if (!active) return;
        setRepository(repo);
        // Public browsing must remain available even if anonymous sign-in fails.
        unsubscribe = repo.subscribe(
          CITY.id,
          (data) => {
            if (active) {
              setReports(data);
              setLoading(false);
            }
          },
          (e) => {
            if (active) {
              setError(readableError(e));
              setLoading(false);
            }
          },
        );
        try {
          const current = await repo.session();
          if (active) setSession(current);
        } catch (e) {
          if (active) setError(readableError(e));
        }
      })
      .catch((e) => {
        if (active) {
          setError(readableError(e));
          setLoading(false);
        }
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (adminPage) return;
    try {
      if (localStorage.getItem("keelung-accessible-map-onboarding-seen-v1") !== "yes")
        setOnboarding(true);
    } catch {
      // Keep the map available when browser storage is disabled.
    }
  }, [adminPage]);

  function dismissOnboarding() {
    try {
      localStorage.setItem("keelung-accessible-map-onboarding-seen-v1", "yes");
    } catch {
      // The guide remains skippable when browser storage is disabled.
    }
    setOnboarding(false);
  }

  function startGuidedTour() {
    dismissOnboarding();
    setHelp(false);
    setAbout(false);
    setCreatedReportId(null);
    if (selected) closeReport();
    setCreating(false);
    setGuideStep(0);
  }

  function openReportForm() {
    setCreating(true);
    if (guideStep === 0) setGuideStep(1);
  }

  useEffect(() => {
    if (guideStep !== 0 || !guideReady) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        ".header-report.guide-target-active",
      );
      if (!target) return;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target.scrollIntoView({
        block: "nearest",
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guideReady, guideStep]);

  useEffect(() => {
    if (DEMO_MODE) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void import("./services/supabase")
      .then(({ subscribeAuthSession }) => {
        if (!active) return;
        unsubscribe = subscribeAuthSession(
          (current, event) => {
            if (!active) return;
            setSession(current);
            if (event === "SIGNED_IN" && current?.admin && adminPage) {
              setError("");
              setToast("管理者登入成功。");
            }
          },
          (e) => {
            if (active) setError(readableError(e));
          },
        );
      })
      .catch((e) => {
        if (active) setError(readableError(e));
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [adminPage]);

  const visible = useMemo(
    () =>
      reports.filter(
        (r) =>
          (filter === "all" || r.status === filter) &&
          (district === "all" || r.district === district) &&
          (access === "all" || r.wheelchairAccess === access) &&
          `${r.title} ${r.address} ${r.description}`.includes(search.trim()),
      ),
    [reports, filter, district, access, search],
  );
  const counts = {
    open: reports.filter((r) => r.status === "open").length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };
  const report = reports.find((r) => r.id === selected);
  function choose(id: string) {
    setSelected(id);
    setFocus(reports.find((r) => r.id === id)?.location);
    const url = new URL(window.location.href);
    if (reportIdFromSearch(url.search) !== id) {
      url.searchParams.set("report", id);
      window.history.pushState({}, "", url);
    }
  }
  function closeReport() {
    const url = new URL(window.location.href);
    url.searchParams.delete("report");
    window.history.replaceState({}, "", url);
    setSelected(null);
  }
  useEffect(() => {
    const syncSelectedReport = () =>
      setSelected(reportIdFromSearch(window.location.search));
    window.addEventListener("popstate", syncSelectedReport);
    return () => window.removeEventListener("popstate", syncSelectedReport);
  }, []);
  useEffect(() => {
    if (!selected) return;
    const match = reports.find((r) => r.id === selected);
    if (match) setFocus(match.location);
  }, [reports, selected]);
  function locate() {
    if (!navigator.geolocation) {
      setToast("此瀏覽器不支援定位。你仍可拖曳地圖查看。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const b = CITY.bounds,
          location = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (
          location.lat < b.south ||
          location.lat > b.north ||
          location.lng < b.west ||
          location.lng > b.east
        ) {
          setToast("目前位置不在基隆示範範圍，已保留基隆地圖。");
          return;
        }
        setFocus(location);
        setToast("已定位到目前位置。");
      },
      () => setToast("未取得定位權限，仍可拖曳地圖或手動選點。"),
      { timeout: 10000 },
    );
  }
  async function signIn() {
    if (signingIn) return;
    setSigningIn(true);
    setSignInSent(false);
    setError("");
    try {
      const { loginAdmin } = await import("./services/supabase");
      await loginAdmin(adminEmail);
      setSignInSent(true);
      setToast("登入連結已寄出，請查看你的管理者信箱。");
    } catch (e) {
      setError(readableError(e));
    } finally {
      setSigningIn(false);
    }
  }
  return (
    <>
      <a href="#report-list" className="skip-link">
        跳至案件列表
      </a>
      <header className="site-header">
        <a href={HOMEPAGE_URL} className="brand" aria-label="基隆好行首頁">
          <span className="brand-icon">
            <img src="/brand-mark.webp" alt="" width="46" height="46" />
          </span>
          <span>
            <strong>{CITY.productName}</strong>
            <small>讓每一段路，都更好走</small>
          </span>
        </a>
        <nav aria-label="主要選單">
          <a className={!adminPage ? "nav-active" : ""} href="/map">
            通行地圖
          </a>
          <a href="/about">
            關於計畫
            <ArrowUpRightIcon size={14} />
          </a>
          <a href="/how-to">如何使用</a>
          <a className={adminPage ? "nav-active" : ""} href="/admin">
            <ShieldCheckIcon size={18} />
            <span>管理{DEMO_MODE ? "體驗" : "案件"}</span>
          </a>
        </nav>
        {!adminPage && (
          <button
            className={`button primary header-report${guideStep === 0 && guideReady ? " guide-target-active" : ""}`}
            onClick={openReportForm}
            disabled={!repository || !session}
          >
            <PlusIcon size={20} weight="bold" />
            回報障礙
          </button>
        )}
      </header>
      <div className="demo-banner">
        <InfoIcon size={18} aria-hidden="true" />
        <p>
          {DEMO_MODE ? (
            <>
              <strong>Demo 展示版</strong>
              <span className="banner-divider">／</span>
              所有案件均為測試資料，操作只保存在此瀏覽器，不會送交政府。
            </>
          ) : (
            <>
              社群通行紀錄 · 本平台尚未串接政府派工，請依現場狀況判斷通行安全。
            </>
          )}
        </p>
      </div>
      <main id="main-content" tabIndex={-1}>
        <section className="page-intro">
          <div>
            <h1>{adminPage ? "案件管理" : "基隆無障礙通行地圖"}</h1>
            <p>
              {adminPage
                ? "檢視案件、確認現況與管理者更新。"
                : "查看附近障礙，或回報你現在看到的通行問題。"}
            </p>
            <div className="intro-help-actions">
              <button
                className="text-button help-link"
                onClick={() => setHelp(true)}
              >
                如何使用與常見問題 <ArrowRightIcon size={16} />
              </button>
              {!adminPage && (
                <button
                  className="text-button help-link"
                  onClick={startGuidedTour}
                >
                  跟著操作教學 <ArrowRightIcon size={16} />
                </button>
              )}
            </div>
          </div>
        </section>
        {!adminPage && guideStep === 0 && (
          <GuidedTourPrompt
            step={1}
            total={9}
            title={guideReady ? "先開始一筆回報" : "地圖正在準備"}
            placement="start"
            onSkip={() => setGuideStep(null)}
          >
            {guideReady
              ? "請按「回報障礙」。接下來會一步一步帶你選位置、拍照與送出。"
              : "資料準備完成後，就能按「回報障礙」開始操作；你也可以隨時結束教學。"}
          </GuidedTourPrompt>
        )}
        {error && (
          <div className="error top-alert" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              重新載入
            </button>
          </div>
        )}
        {adminPage && !session?.admin && (
          <section className="admin-gate">
            <ShieldCheckIcon size={28} />
            <div>
              <h2>管理者登入</h2>
              <p>
                請使用已授權的管理者 Email。登入連結僅能使用一次，點開後會返回本頁。
              </p>
              {session && !session.anonymous && !session.admin && (
                <p className="error admin-denied" role="status">
                  這個帳號已登入，但尚未被授權為管理者。
                </p>
              )}
              {signInSent && (
                <p className="success admin-login-sent" role="status">
                  登入連結已寄出。請在此裝置開啟信件中的一次性連結；驗證成功後會自動返回管理案件。
                </p>
              )}
            </div>
            <label>
              管理者 Email
              <input
                type="email"
                autoComplete="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button
              className="button primary"
              onClick={signIn}
              disabled={signingIn || !repository || !adminEmail.includes("@")}
            >
              {signingIn ? "寄送中…" : "寄送登入連結"}
            </button>
          </section>
        )}
        {adminPage && session?.admin ? (
          repository ? (
            <AdminWorkspace
              reports={reports}
              loading={loading}
              repository={repository}
              selectedReport={report}
              initialStatus={adminDraftStatus}
              onSelect={(id, status) => {
                choose(id);
                setAdminDraftStatus(status ?? null);
              }}
              onCloseCase={() => {
                closeReport();
                setAdminDraftStatus(null);
              }}
              onLogout={async () => {
                try {
                  await (await import("./services/supabase")).logoutAdmin();
                  window.location.assign("/");
                } catch (e) {
                  setError(readableError(e));
                }
              }}
            />
          ) : (
            <p className="admin-loading" role="status">正在載入管理案件…</p>
          )
        ) : (
        <section className="workspace" aria-label="通行回報探索">
          <aside className="sidebar">
            <div className="sidebar-head">
              <h2>{adminPage ? "案件管理" : "探索通行狀況"}</h2>
              <span className="count">{reports.length} 件</span>
            </div>
            <label className="search-field">
              <MagnifyingGlassIcon size={20} />
              <span className="sr-only">搜尋已回報地點</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜尋已回報地點、路名…"
              />
            </label>
            <div className="filter-grid">
              <label>
                <span className="sr-only">行政區篩選</span>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="all">所有行政區</option>
                  {CITY.districts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">通行程度篩選</span>
                <select
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                >
                  <option value="all">所有通行程度</option>
                  {Object.entries(ACCESS).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="status-filters" aria-label="案件狀態篩選">
              <button
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                全部
              </button>
              {Object.entries(STATUSES).map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key as Status)}
                >
                  <i className={`dot dot-${key}`} />
                  {label}
                  <span>{counts[key as Status]}</span>
                </button>
              ))}
            </div>
            <div className="list-heading">
              <span>
                <ListIcon size={17} />
                {visible.length} 個回報點
              </span>
              <small>依最近建立排序</small>
            </div>
            <div
              className="report-list"
              id="report-list"
              tabIndex={-1}
              aria-busy={loading}
            >
              {loading ? (
                <p className="empty">正在載入通行紀錄…</p>
              ) : visible.length === 0 ? (
                <div className="empty">
                  <MagnifyingGlassIcon size={32} />
                  <h3>沒有符合的回報</h3>
                  <p>試著換個關鍵字，或清除篩選。</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      setDistrict("all");
                      setAccess("all");
                    }}
                  >
                    清除篩選
                  </button>
                </div>
              ) : (
                [...visible]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((r) => (
                    <button
                      className={`report-card ${selected === r.id ? "selected" : ""}`}
                      key={r.id}
                      onClick={() => choose(r.id)}
                      aria-label={`查看回報：${r.title}，${r.district}，${CATEGORIES[r.category]}`}
                    >
                      {(r.beforeImageUrl || r.afterImageUrl) && (
                        <img
                          className="report-card-thumb"
                          src={r.beforeImageUrl || r.afterImageUrl || ""}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="report-card-content">
                        <div className="card-top">
                          <StatusBadge status={r.status} />
                          <small>{r.district}</small>
                        </div>
                        <h3>
                          {r.title}
                          <ArrowRightIcon size={18} />
                        </h3>
                        <p>{CATEGORIES[r.category]}</p>
                        <div className="card-bottom">
                          <span>
                            <WheelchairIcon size={16} />
                            {ACCESS[r.wheelchairAccess]}
                          </span>
                          <small>
                            {DEMO_MODE
                              ? "測試資料"
                              : new Date(r.createdAt).toLocaleDateString("zh-TW")}
                          </small>
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </div>
            <div className="sidebar-foot">
              <span className="live-dot" />
              {DEMO_MODE
                ? "8 筆示範起始資料 · 可自由體驗"
                : "顯示最近 200 筆 · 民眾共同記錄"}
            </div>
          </aside>
          <div className="map-area">
            <MapView reports={visible} onSelect={choose} focus={focus} />
            <div className="map-caption">
              <span className="live-dot" />
              基隆市
              <span className="caption-divider" />
              無障礙通行回報
            </div>
            <button
              className="locate-button"
              aria-label="定位到我的位置"
              onClick={locate}
            >
              <CrosshairIcon size={24} />
            </button>
            <div className="map-legend">
              {Object.keys(STATUSES).map((s) => (
                <StatusBadge key={s} status={s as Status} />
              ))}
            </div>
          </div>
        </section>
        )}
        {!adminPage && (
          <button
            className={`button primary mobile-report-cta${guideStep === 0 && guideReady ? " guide-target-active" : ""}`}
            onClick={openReportForm}
            disabled={!repository || !session}
          >
            <PlusIcon size={20} weight="bold" />
            回報障礙
          </button>
        )}
      </main>
      <footer className="site-footer">
        <span>
          基隆好行 <span className="footer-separator">/</span> Keelung
          Accessible Map
        </span>
        <a href="/how-to">如何使用</a>
        <a href="/about">關於計畫</a>
        {DEMO_MODE && (
          <button type="button" onClick={() => setAbout(true)}>
            Demo 資料與重設
          </button>
        )}
        <a href="/terms">使用條款</a>
        <a href="/privacy">隱私權政策</a>
        <a href="https://www.threads.com/@roadrecall2046" target="_blank" rel="noopener noreferrer" aria-label="在 Threads 追蹤基隆好行 @roadrecall2046">
          <ThreadsLogoIcon size={18} aria-hidden="true" />
          <span>Threads</span>
        </a>
        {!DEMO_MODE && (
          <a
            href={`mailto:${BETA_FEEDBACK_EMAIL}?subject=${encodeURIComponent("基隆好行 Beta 試用回饋")}`}
          >
            提供試用回饋
          </a>
        )}
        <a href={HOMEPAGE_URL} className="footer-home-link">
          <HouseIcon size={16} aria-hidden="true" />
          回到首頁
        </a>
        <a href={adminPage ? "/" : "/admin"}>
          {adminPage ? "返回地圖" : DEMO_MODE ? "管理體驗" : "管理案件"}
        </a>
        <span>從基隆出發，逐步走向全台灣。</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="關閉通知" onClick={() => setToast("")}>
            關閉
          </button>
        </div>
      )}
      {creating && repository && (
        <ReportForm
          repository={repository}
          reports={reports}
          guidedStep={guideStep}
          onGuidedStepChange={setGuideStep}
          onClose={() => {
            setCreating(false);
            if (guideStep !== null) setGuideStep(null);
          }}
          onCreated={(id) => {
            setCreating(false);
            setFilter("all");
            setDistrict("all");
            setAccess("all");
            setSearch("");
            setCreatedReportId(id);
            setGuideStep(null);
            setFocus(reports.find((item) => item.id === id)?.location);
          }}
          onExisting={(id) => {
            setCreating(false);
            setGuideStep(null);
            choose(id);
          }}
        />
      )}
      {report && repository && !creating && !adminPage && (
        <ReportPanel
          key={report.id}
          report={report}
          repository={repository}
          admin={adminPage && !!session?.admin}
          onClose={closeReport}
        />
      )}
      {help && (
        <HelpPanel
          onClose={() => setHelp(false)}
          onStartGuide={!adminPage ? startGuidedTour : undefined}
        />
      )}
      {onboarding && (
        <OnboardingPanel
          onClose={dismissOnboarding}
          onStartGuide={startGuidedTour}
        />
      )}
      {createdReportId && (
        <ReportSuccessPanel
          id={createdReportId}
          onClose={() => setCreatedReportId(null)}
          onView={() => {
            const id = createdReportId;
            setCreatedReportId(null);
            choose(id);
          }}
        />
      )}
      {about && (
        <Modal title="關於基隆好行" onClose={() => setAbout(false)}>
          <div className="panel-content">
            <h3>看見障礙，留下改善。</h3>
            <p>
              讓輪椅使用者、長者、推嬰兒車的人，以及每一位行人，都能參與記錄公共通行環境。
            </p>
            <h3>目前版本</h3>
            <p>
              {DEMO_MODE
                ? "所有案件皆為虛構示範。你新增的照片、紀錄與管理操作只保存在本瀏覽器 IndexedDB，不會同步到其他裝置。清除網站資料後即會移除。"
                : "公開回報會顯示案件內容、照片及補充紀錄。照片公開後可能被他人下載，請勿上傳個人資訊；系統會保存必要的識別資料，以支援案件管理與防止濫用。"}
            </p>
            <p>
              定位只在你點選按鈕時取得。地圖供應商會收到地圖載入所需的網路請求；本版未加入行銷追蹤。
            </p>
            <h3>請留意</h3>
            <p>
              這是社群觀察紀錄，不代表政府公告，也不保證路線安全。通行狀況可能改變；此平台尚未串接
              1999 或政府派工。
            </p>
            <p>
              搜尋目前僅搜尋既有回報。照片請避開人臉、車牌及個人資訊。
              {DEMO_MODE
                ? " Demo 的回報和照片只保存在此瀏覽器；可在本說明視窗使用清除功能移除。"
                : " 公開案件與照片會在案件公開期間持續保留；收到並確認移除申請後會處理，並至少每年檢視一次資料是否仍有保留必要。"}
            </p>
            <p>
              Beta 回饋、資料更正、照片移除與隱私申訴：{" "}
              <a href={`mailto:${BETA_FEEDBACK_EMAIL}`}>
                {BETA_FEEDBACK_EMAIL}
              </a>
            </p>
            {DEMO_MODE && (
              <button
                className="button secondary"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "清除這個瀏覽器的測試回報與照片，恢復 8 筆示範資料？",
                    )
                  )
                    return;
                  try {
                    await (await import("./services/demo")).resetDemo();
                    setAbout(false);
                    setSelected(null);
                    setToast("已恢復起始測試資料。");
                  } catch (e) {
                    setError(readableError(e));
                  }
                }}
              >
                重設這台裝置的 Demo 資料
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
