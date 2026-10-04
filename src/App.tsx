import { geographyAt } from './utils/locationSelection';
import { useEffect, useMemo, useRef, useState } from "react";
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
import { BETA_FEEDBACK_EMAIL, CITIES, DEMO_MODE, canReportInCity } from "./config";
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

import ReportThumbnail from './components/ReportThumbnail';
import GeographyPicker from './components/GeographyPicker';
import { initialGeography, rememberGeography, shouldSuggestCity, geographyUrl } from './utils/geography';
import { readConsent, CONSENT_EVENT } from './utils/consent';
import { useSuggestedCity } from './utils/useSuggestedCity';
import { districtCamera } from './utils/mapCamera';
const HOMEPAGE_URL = "/";

export default function App() {
  const [geography] = useState(initialGeography);
  const [city, setCity] = useState(geography.city);
  const [repository, setRepository] = useState<ReportRepository | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [reports, setReports] = useState<Report[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState<Status | "all">("all"),
    [district, setDistrict] = useState(geography.district),
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
  const [loadError, setLoadError] = useState('');
  const [linkedReport, setLinkedReport] = useState<Report | null>(null);
  const [createdGeography, setCreatedGeography] = useState({ cityId:city.id, district });
  const [focusZoom, setFocusZoom] = useState(districtCamera(city, district).zoom);
  const [focusRevision, setFocusRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [feedPages,setFeedPages] = useState(1);
  const [hasMore,setHasMore] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInSent, setSignInSent] = useState(false);
  const [adminDraftStatus, setAdminDraftStatus] = useState<Status | null>(null);
  const adminPage = window.location.pathname.replace(/\/$/, "") === "/admin";
  const guideReady = !!repository && !!session;
  const [consentReady, setConsentReady] = useState(() => !!readConsent());
  useEffect(() => { const update = () => setConsentReady(!!readConsent()); window.addEventListener(CONSENT_EVENT, update); return () => window.removeEventListener(CONSENT_EVENT, update); }, []);
  useEffect(() => {
    let active = true;
    loadRepository()
      .then(async (repo) => {
        if (!active) return;
        setRepository(repo);
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
    };
  }, []);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    const unsubscribe = repository.subscribe(city.id, (data,more) => {
      if (active) { setReports(data); setHasMore(!!more); setLoading(false); setLoadError(''); }
    }, e => { if (active) { setLoadError(readableError(e)); setLoading(false); } }, {district,access,status:filter,search,pages:feedPages});
    return () => { active = false; unsubscribe(); };
  }, [repository, city.id, district, access, filter, search, feedPages]);
  useEffect(()=>{setFeedPages(1);setPage(1);setReports([]);setHasMore(false);setLoading(true);},[city.id,district,access,filter,search]);
  const manuallyChosen = useRef(false);
  const gpsRevision=useRef(0);
  useEffect(()=>()=>{gpsRevision.current++;},[]);
  const suggestedCity = useSuggestedCity();
  const [suggestionNote, setSuggestionNote] = useState('');
  useEffect(() => {
    if (!suggestedCity || manuallyChosen.current || adminPage || creating || selected || !shouldSuggestCity()) return;
    const suggested = CITIES.find(c => c.id === suggestedCity);
    if (!suggested) return;
    changeCity(suggested.id);
    setSuggestionNote(`依網路連線推估為${suggested.name}；行政區是瀏覽起點，可隨時切換。`);
  }, [suggestedCity, adminPage, creating, selected]);
  function chooseCity(id: string) {
    gpsRevision.current++;
    manuallyChosen.current = true; setSuggestionNote('');
    if (id === city.id) rememberGeography(id, district);
    changeCity(id);
  }
  function chooseDistrict(value: string) {
    gpsRevision.current++;
    manuallyChosen.current = true; setSuggestionNote(''); changeDistrict(value);
  }
  function changeCity(id: string) {
    const next = CITIES.find(c => c.id === id);
    if (!next || next.id === city.id) return;
    setPage(1); closeReport(); setCreating(false); setCreatedReportId(null); setGuideStep(null);
    setReports([]); setLoading(true); setError(''); setSearch(''); setAccess('all'); setFilter('all');
    setCity(next); setDistrict(next.defaultDistrict); setFocus(next.center); setFocusZoom(next.zoom); setFocusRevision(r => r + 1); setLinkedReport(null); setLoadError('');
    rememberGeography(next.id, next.defaultDistrict);
    window.history.pushState({}, '', geographyUrl(window.location.href, next.id, next.defaultDistrict));
  }
  function changeDistrict(value: string) {
    setPage(1); setDistrict(value); closeReport();
    rememberGeography(city.id, value);
    const camera = districtCamera(city, value);
    setFocus(camera.focus); setFocusZoom(camera.zoom); setFocusRevision(r => r + 1);
    window.history.pushState({}, '', geographyUrl(window.location.href, city.id, value));
  }

  useEffect(() => {
    if (adminPage || !readConsent()) return;
    try {
      if (localStorage.getItem("keelung-accessible-map-onboarding-seen-v1") !== "yes")
        setOnboarding(true);
    } catch {
      // Keep the map available when browser storage is disabled.
    }
  }, [adminPage, consentReady]);

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
    if (!canReportInCity(city.id)) { setToast("此縣市目前提供地圖預覽，正式回報尚未開放。"); return; }
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

  const resolvedReport = reports.find(r => r.id === selected) || (linkedReport?.id === selected ? linkedReport : null);
  const scoped = useMemo(() => reports.filter(r =>
    (district === 'all' || r.district === district) &&
    (access === 'all' || r.wheelchairAccess === access)),
    [reports, district, access]);
  const visible = useMemo(() => {
    const rows = scoped.filter(r => filter === 'all' || r.status === filter);
    return resolvedReport && !rows.some(r => r.id === resolvedReport.id) ? [resolvedReport, ...rows] : rows;
  }, [scoped, filter, resolvedReport]);
  const sorted = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageCount = Math.max(1, Math.ceil(sorted.length / 5));
  const currentPage = Math.min(page, pageCount);
  const pageReports = sorted.slice((currentPage - 1) * 5, currentPage * 5);
  const report = resolvedReport;
  function choose(id: string) {
    gpsRevision.current++;
    setSelected(id);
    setFocus(reports.find((r) => r.id === id)?.location); setFocusZoom(16); setFocusRevision(r => r + 1);
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
    const syncLocation = () => {
      gpsRevision.current++;
      const next = initialGeography();
      manuallyChosen.current = true;
      setSelected(reportIdFromSearch(window.location.search)); setLinkedReport(null);
      if (next.city.id !== city.id) { setReports([]); setLoading(true); }
      setCity(next.city); setDistrict(next.district); setPage(1);
      rememberGeography(next.city.id, next.district);
      const camera = districtCamera(next.city, next.district);
      setFocus(camera.focus); setFocusZoom(camera.zoom); setFocusRevision(r => r + 1);
    };
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, [city.id]);
  useEffect(() => {
    if (!selected || !repository || reports.some(r => r.id === selected)) return;
    let active = true;
    void repository.get(selected).then(found => { if (active) setLinkedReport(found); })
      .catch(e => { if (active) setError(readableError(e)); });
    return () => { active = false; };
  }, [repository, selected, reports]);
  const matchCity = resolvedReport?.cityId, matchDistrict = resolvedReport?.district;
  const matchLat = resolvedReport?.location.lat, matchLng = resolvedReport?.location.lng;
  useEffect(() => {
    if (!selected || !matchCity || !matchDistrict || matchLat === undefined || matchLng === undefined) return;
    const next = CITIES.find(c => c.id === matchCity);
    if (!next) return;
    if (next.id !== city.id) { setReports([]); setLoading(true); }
    setCity(next); setDistrict(matchDistrict); setPage(1);
    setFocus({ lat:matchLat, lng:matchLng }); setFocusZoom(16); setFocusRevision(r => r + 1);
    window.history.replaceState({}, '', geographyUrl(window.location.href, next.id, matchDistrict, selected));
  }, [selected, matchCity, matchDistrict, matchLat, matchLng]);
  function focusLocation(geography:{city:typeof city;district:string}, location:Location) {
    manuallyChosen.current=true;
    if (geography.city.id!==city.id) {setReports([]);setLoading(true);}
    setSelected(null);setLinkedReport(null);setCity(geography.city);setDistrict(geography.district);setPage(1);
    setFocus(location);setFocusZoom(17);setFocusRevision(r=>r+1);
    rememberGeography(geography.city.id,geography.district);
    window.history.replaceState({},'',geographyUrl(window.location.href,geography.city.id,geography.district));
  }
  function locate() {
    if (!navigator.geolocation) {setToast('此瀏覽器不支援定位。你仍可拖曳地圖查看。');return;}
    const revision=++gpsRevision.current;
    navigator.geolocation.getCurrentPosition(p=>{void(async()=>{
      const location={lat:p.coords.latitude,lng:p.coords.longitude};
      try {
        const geography=await geographyAt(location,city);
        if (revision!==gpsRevision.current) return;
        if (!geography) {setToast('目前位置不在 Road Tag 可回報範圍，請改用搜尋或地圖選點。');return;}
        focusLocation(geography,location);setToast('已定位到目前位置。');
      } catch {if(revision===gpsRevision.current)setToast('行政區資料暫時無法載入，仍可手動查看地圖。');}
    })();},()=>{if(revision===gpsRevision.current)setToast('未取得定位權限，仍可拖曳地圖或手動選點。');},{timeout:10000});
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
  const pageIntro = (<section className="page-intro">{suggestionNote && <p className="city-suggestion-note" role="status">{suggestionNote}</p>}
          <div>
            <h1>{adminPage ? "案件管理" : "台灣騎樓與人行道通行回報地圖"}</h1>
            <p>
              {adminPage
                ? "檢視案件、確認現況與管理者更新。"
                : "選擇縣市與行政區，查看或標註騎樓、人行道的通行障礙。"}
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
        </section>);
  return (
    <div className={adminPage ? "admin-app-shell" : "map-app-shell"}>
      {(!adminPage || session?.admin) && <a href="#report-list" className="skip-link">
        跳至案件列表
      </a>}
      <header className="site-header">
        <a href={HOMEPAGE_URL} className="brand" aria-label="路見不平首頁">
          <img className="brand-wordmark" src="/images/roadtag-logo-horizontal.webp" alt="路見不平 Road Tag" width="1086" height="362" />

        </a>
        {(!adminPage || session?.admin) && <nav aria-label="主要選單">
          <a className={!adminPage ? "nav-active" : ""} href="/map">
            通行地圖
          </a>
          <a href="/about">
            關於計畫
            <ArrowUpRightIcon size={14} />
          </a>
          <a href="/how-to">如何使用</a>
          <a href="https://www.threads.com/@roadtag2046" target="_blank" rel="noopener noreferrer" aria-label="在 Threads 追蹤路見不平"><ThreadsLogoIcon size={20} /><span>Threads</span></a>
          <details className="header-more"><summary>更多</summary><div className="header-more-menu">
            <button onClick={() => setHelp(true)}>常見問題</button>
            {!adminPage && <button onClick={startGuidedTour}>跟著操作教學</button>}
            <a href="/privacy">隱私權政策</a><a href="/terms">使用條款</a>
            {DEMO_MODE ? <button onClick={() => setAbout(true)}>Demo 資料與重設</button> : <a href={'mailto:' + BETA_FEEDBACK_EMAIL + '?subject=' + encodeURIComponent('路見不平 使用回饋')}>提供使用回饋</a>}
            <a href="/">回到首頁</a>
          </div></details>
        </nav>}
        {!adminPage && (
          <button
            className={`button primary header-report${guideStep === 0 && guideReady ? " guide-target-active" : ""}`}
            onClick={openReportForm}
            disabled={!repository || !session || !canReportInCity(city.id)}
          >
            <PlusIcon size={20} weight="bold" />
            回報障礙
          </button>
        )}
      </header>
      {(!adminPage || session?.admin) && <div className="demo-banner">
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
      </div>}
      <main id="main-content" tabIndex={-1}>
        {adminPage && session?.admin && pageIntro}
        {adminPage && session?.admin && (<section className="geography-bar" aria-label="選擇地圖範圍">
          <GeographyPicker city={city} district={district} onCity={chooseCity} onDistrict={chooseDistrict} />
          <p>{canReportInCity(city.id) ? '目前查看：' + city.name + ' · ' + (district === 'all' ? '所有行政區' : district) : '此縣市目前提供地圖預覽，正式回報尚未開放。'}</p>
        </section>)}
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
        {(error || loadError) && (
          <div className="error top-alert" role="alert">
            {error || loadError}
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
              selectedReport={report || undefined}
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
        ) : !adminPage ? (
        <>
        <section className="workspace" aria-label="通行回報探索">
          <aside className="sidebar">
            <div className="sidebar-head">
              <h2>{adminPage ? "案件管理" : "探索通行狀況"}</h2>
              <span className="count">{reports.length} 件</span>
            </div>
            <div className="sidebar-geography"><GeographyPicker city={city} district={district} onCity={chooseCity} onDistrict={chooseDistrict} />
              {!canReportInCity(city.id) && <p className="city-preview-note">此縣市提供地圖預覽，正式回報尚未開放。</p>}
            </div>
            <label className="search-field">
              <MagnifyingGlassIcon size={20} />
              <span className="sr-only">搜尋已回報地點</span>
              <input
                type="search"
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="搜尋已回報地點、路名…"
              />
            </label>
            <div className="filter-grid">
              <label>
                <span className="sr-only">通行程度篩選</span>
                <select
                  value={access}
                  onChange={(e) => { setPage(1); setAccess(e.target.value); }}
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
                onClick={() => { setPage(1); setFilter("all"); }}
              >
                全部
              </button>
              {Object.entries(STATUSES).map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => { setPage(1); setFilter(key as Status); }}
                >
                  <i className={`dot dot-${key}`} />
                  {label}

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
                  <p>目前沒有符合條件的回報；沒有標記不代表沒有障礙。你可以切換行政區、清除篩選，或手動移動地圖。</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      changeDistrict("all");
                      setAccess("all");
                    }}
                  >
                    清除篩選
                  </button>
                </div>
              ) : (
                pageReports.map((r) => (
                    <button
                      className={`report-card ${selected === r.id ? "selected" : ""}`}
                      key={r.id}
                      onClick={() => choose(r.id)}
                      aria-label={`查看回報：${r.title}，${r.district}，${CATEGORIES[r.category]}`}
                    >
                      <ReportThumbnail report={r} />
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
            <div className="list-pagination" aria-label="案件分頁">
              <span>第 {visible.length ? (currentPage - 1) * 5 + 1 : 0}–{Math.min(currentPage * 5, visible.length)} 筆／已載入 {visible.length} 筆{hasMore ? "（還有更多）" : ""}</span>
              <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="上一頁案件">上一頁</button>
              <button onClick={() => {if(currentPage===pageCount && hasMore) {setFeedPages(n=>n+1);setLoading(true);} setPage(currentPage+1);}} disabled={loading || (currentPage === pageCount && !hasMore)} aria-label="下一頁案件">下一頁</button>
            </div>
            <div className="sidebar-foot">
              <span className="live-dot" />
              {DEMO_MODE
                ? "示範資料 · 可自由體驗"
                : "依條件查詢 · 地圖顯示已載入案件"}
            </div>
          </aside>
          <div className="map-area">
            <div className="map-heading">{pageIntro}<div className="mobile-geography"><GeographyPicker city={city} district={district} onCity={chooseCity} onDistrict={chooseDistrict} />
          {!canReportInCity(city.id) && <p className="city-preview-note">此縣市提供地圖預覽，正式回報尚未開放。</p>}</div></div>
            <div className="map-stage">
            <MapView key={city.id} city={city} reports={visible} onSelect={choose} focus={focus || districtCamera(city, district).focus} focusZoom={focusZoom} focusRevision={focusRevision} />
            <div className="map-caption">
              <span className="live-dot" />
              {city.name} · {district === 'all' ? '所有行政區' : district}
              <span className="caption-divider" />
              騎樓與人行道通行回報
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
          </div>
        </section></>
        ) : null}
        {!adminPage && (
          <button
            className={`button primary mobile-report-cta${guideStep === 0 && guideReady ? " guide-target-active" : ""}`}
            onClick={openReportForm}
            disabled={!repository || !session || !canReportInCity(city.id)}
          >
            <PlusIcon size={20} weight="bold" />
            回報障礙
          </button>
        )}
      </main>
      <footer className="site-footer clean-footer"><span>© 2026 路見不平 · Road Tag</span><a href="/" className="footer-home-link"><HouseIcon size={16} />回到首頁</a></footer>
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
          city={city}
          onLocated={(geography,location)=>{gpsRevision.current++;focusLocation(geography,location);}}
          initialDistrict={district}
          reports={reports}
          guidedStep={guideStep}
          onGuidedStepChange={setGuideStep}
          onClose={() => {
            setCreating(false);
            if (guideStep !== null) setGuideStep(null);
          }}
          onCreated={(id, geography) => {
            setCreatedGeography(geography);
            setCreating(false);
            setFilter("all");
            changeDistrict("all");
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
          geography={createdGeography}
          onClose={() => setCreatedReportId(null)}
          onView={() => {
            const id = createdReportId;
            setCreatedReportId(null);
            choose(id);
          }}
        />
      )}
      {about && (
        <Modal title="關於路見不平" onClose={() => setAbout(false)}>
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
    </div>
  );
}
