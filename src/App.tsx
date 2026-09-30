import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CrosshairIcon,
  InfoIcon,
  ListIcon,
  MapPinIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  WheelchairIcon,
  PathIcon,
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
import { reportIdFromSearch } from "./utils/reportLink";

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
    [help, setHelp] = useState(false),
    [about, setAbout] = useState(false),
    [focus, setFocus] = useState<Location>(),
    [toast, setToast] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const adminPage = window.location.pathname.replace(/\/$/, "") === "/admin";
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
    try {
      const { loginAdmin } = await import("./services/supabase");
      await loginAdmin(adminEmail);
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
        <a href="/" className="brand" aria-label="基隆好行首頁">
          <span className="brand-icon">
            <PathIcon size={30} weight="bold" />
          </span>
          <span>
            <strong>{CITY.productName}</strong>
            <small>讓每一段路，都更好走</small>
          </span>
        </a>
        <nav aria-label="主要選單">
          <a className={!adminPage ? "nav-active" : ""} href="/">
            通行地圖
          </a>
          <button onClick={() => setAbout(true)}>
            關於計畫
            <ArrowUpRightIcon size={14} />
          </button>
          <button onClick={() => setHelp(true)}>如何使用</button>
          <a className={adminPage ? "nav-active" : ""} href="/admin">
            <ShieldCheckIcon size={18} />
            <span>管理{DEMO_MODE ? "體驗" : "案件"}</span>
          </a>
        </nav>
        <button
          className="button primary header-report"
          onClick={() => setCreating(true)}
          disabled={!repository || !session}
        >
          <PlusIcon size={20} weight="bold" />
          回報障礙
        </button>
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
            <div className="city-label">
              <MapPinIcon size={17} weight="fill" />
              基隆市<span>首站示範城市</span>
            </div>
            <h1>
              {adminPage ? "一起，讓改善發生。" : "看見障礙，一起走得更遠。"}
            </h1>
            <p>
              基隆無障礙通行回報地圖：查看路口、騎樓與人行道現況，也能回報障礙、補充照片，持續追蹤改善。
            </p>
            <button
              className="text-button help-link"
              onClick={() => setHelp(true)}
            >
              如何使用與常見問題 <ArrowRightIcon size={16} />
            </button>
          </div>
          <div className="intro-note">
            <WheelchairIcon size={24} />
            <span>
              為輪椅、推車與每一位行人
              <br />
              <strong>多留一條好走的路</strong>
            </span>
          </div>
        </section>
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
                需使用已由營運者授權的管理者 Email
                帳號。一般使用者仍可查看與補充案件。
              </p>
            </div>
            <label>
              管理者 Email
              <input
                type="email"
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
        {adminPage && session?.admin && (
          <div className="admin-banner">
            <ShieldCheckIcon size={20} />
            {DEMO_MODE
              ? "管理體驗：點選任一案件，即可模擬更新狀態與上傳改善後照片。"
              : "管理權限已驗證。請點選案件處理。"}
            {!DEMO_MODE && (
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await (await import("./services/supabase")).logoutAdmin();
                    window.location.assign("/");
                  } catch (e) {
                    setError(readableError(e));
                  }
                }}
              >
                登出管理帳號
              </button>
            )}
          </div>
        )}
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
                    >
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
        <section className="contribute-strip">
          <div className="contribute-icon">
            <MapPinIcon size={28} />
          </div>
          <div>
            <h2>你的一筆紀錄，是城市改變的起點。</h2>
            <p>遇見不好走的路？留下位置與照片，讓障礙被看見。</p>
          </div>
          <button
            className="button secondary"
            onClick={() => setCreating(true)}
            disabled={!repository || !session}
          >
            新增一筆回報
            <PlusIcon size={19} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          基隆好行 <span className="footer-separator">/</span> Keelung
          Accessible Map
        </span>
        <button onClick={() => setHelp(true)}>如何使用</button>
        <button onClick={() => setAbout(true)}>使用與隱私說明</button>
        {!DEMO_MODE && (
          <a
            href={`mailto:${BETA_FEEDBACK_EMAIL}?subject=${encodeURIComponent("基隆好行 Beta 試用回饋")}`}
          >
            提供試用回饋
          </a>
        )}
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
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setFilter("all");
            setDistrict("all");
            setAccess("all");
            setSearch("");
            choose(id);
            setToast(
              DEMO_MODE
                ? "測試回報已建立，案件內容已開啟。"
                : "回報已建立，案件內容已開啟。感謝你的紀錄。",
            );
          }}
          onExisting={(id) => {
            setCreating(false);
            choose(id);
          }}
        />
      )}
      {report && repository && !creating && (
        <ReportPanel
          key={report.id}
          report={report}
          repository={repository}
          admin={adminPage && !!session?.admin}
          onClose={closeReport}
        />
      )}
      {help && <HelpPanel onClose={() => setHelp(false)} />}
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
                : "案件、照片及補充紀錄會公開保存在 Supabase。照片公開後可能被他人下載，請勿上傳個人資訊。帳號識別碼隨案件保存，以支援管理與追蹤。"}
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
