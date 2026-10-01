import { useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { ACCESS, type Report, type ReportRepository, type Status } from "../types";
import { DEMO_MODE } from "../config";
import StatusBadge from "./StatusBadge";
import ReportPanel from "./ReportPanel";

type StatusFilter = Status | "all";

export default function AdminWorkspace({
  reports,
  loading,
  repository,
  selectedReport,
  initialStatus,
  onSelect,
  onCloseCase,
  onLogout,
}: {
  reports: Report[];
  loading: boolean;
  repository: ReportRepository;
  selectedReport: Report | undefined;
  initialStatus: Status | null;
  onSelect: (id: string, status?: Status) => void;
  onCloseCase: () => void;
  onLogout: () => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [search, setSearch] = useState("");
  const [defaultFilterApplied, setDefaultFilterApplied] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const counts = {
    open: reports.filter((report) => report.status === "open").length,
    in_progress: reports.filter((report) => report.status === "in_progress").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
  };

  useEffect(() => {
    if (loading || defaultFilterApplied) return;
    setFilter(counts.open > 0 ? "open" : "in_progress");
    setDefaultFilterApplied(true);
  }, [counts.open, defaultFilterApplied, loading]);

  useEffect(() => {
    if (!selectedReport) return;
    window.requestAnimationFrame(() =>
      document.getElementById("admin-case-title")?.focus(),
    );
  }, [selectedReport?.id]);

  const visible = reports
    .filter(
      (report) =>
        (filter === "all" || report.status === filter) &&
        `${report.title} ${report.address} ${report.description}`
          .toLocaleLowerCase("zh-TW")
          .includes(search.trim().toLocaleLowerCase("zh-TW")),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function selectReport(id: string, status?: Status) {
    returnFocus.current = document.activeElement as HTMLElement | null;
    onSelect(id, status);
  }

  function closeCase() {
    onCloseCase();
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  }

  return (
    <section className={`admin-workspace${selectedReport ? " has-selection" : ""}`} aria-label="管理案件工作區">
      <div className="admin-workspace-list">
        <header className="admin-toolbar">
          <div className="admin-mode-label">
            <ShieldCheckIcon size={21} aria-hidden="true" />
            <div>
              <strong>管理模式</strong>
              <span>
                {DEMO_MODE ? "本機示範資料，不會同步" : "資料庫已驗證管理權限"}
              </span>
            </div>
          </div>
          <button className="button secondary admin-logout" onClick={onLogout}>
            登出
          </button>
        </header>

        <div className="admin-queue" role="group" aria-label="案件狀態篩選">
          <button
            aria-pressed={filter === "open"}
            onClick={() => setFilter("open")}
          >
            待改善 <span>{counts.open}</span>
          </button>
          <button
            aria-pressed={filter === "in_progress"}
            onClick={() => setFilter("in_progress")}
          >
            處理中 <span>{counts.in_progress}</span>
          </button>
          <button
            aria-pressed={filter === "resolved"}
            onClick={() => setFilter("resolved")}
          >
            已改善 <span>{counts.resolved}</span>
          </button>
          <button
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            全部 <span>{reports.length}</span>
          </button>
        </div>

        <label className="search-field admin-search">
          <span className="sr-only">搜尋管理案件</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜尋地點或案件內容"
          />
        </label>

        <div className="admin-case-list" id="report-list" tabIndex={-1}>
          {visible.length === 0 ? (
            <div className="admin-empty">
              <h2>
                {filter === "open"
                  ? "目前沒有待處理案件"
                  : "沒有符合的案件"}
              </h2>
              <p>
                {filter === "open"
                  ? "可以查看處理中的案件，確認是否有新進度。"
                  : "調整狀態篩選或搜尋文字，再試一次。"}
              </p>
              {filter === "open" ? (
                <button
                  className="button secondary"
                  onClick={() => setFilter("in_progress")}
                >
                  查看處理中案件 <ArrowRightIcon size={17} />
                </button>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  清除篩選
                </button>
              )}
            </div>
          ) : (
            visible.map((report) => {
              const action =
                report.status === "open"
                  ? { label: "開始處理", target: "in_progress" as const }
                  : report.status === "in_progress"
                    ? { label: "確認改善", target: "resolved" as const }
                    : { label: "重新開啟", target: "open" as const };

              return (
                <article className="admin-case-item" key={report.id}>
                  <button
                    className={`admin-case-select${selectedReport?.id === report.id ? " selected" : ""}`}
                    data-admin-report-id={report.id}
                    aria-pressed={selectedReport?.id === report.id}
                    onClick={() => selectReport(report.id)}
                  >
                    <span className="admin-case-status">
                      <StatusBadge status={report.status} />
                      <span>{report.district}</span>
                    </span>
                    <strong>{report.title}</strong>
                    <span className="admin-case-access">
                      {ACCESS[report.wheelchairAccess]}
                      {report.address ? ` · ${report.address}` : ""}
                    </span>
                  </button>
                  <button
                    className="admin-quick-action"
                    onClick={() => selectReport(report.id, action.target)}
                    aria-label={`${action.label}：${report.title}`}
                  >
                    {action.label}
                    <ArrowRightIcon size={16} aria-hidden="true" />
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>

      <div className="admin-workspace-detail">
        {selectedReport ? (
          <ReportPanel
            key={`${selectedReport.id}:${initialStatus ?? "current"}`}
            report={selectedReport}
            repository={repository}
            admin
            embedded
            initialStatus={initialStatus}
            onClose={closeCase}
          />
        ) : (
          <div className="admin-select-prompt">
            <ArrowUpRightIcon size={24} aria-hidden="true" />
            <h2>選擇一筆案件</h2>
            <p>案件內容、管理註記、改善照片與儲存操作會顯示在這裡。</p>
          </div>
        )}
      </div>
    </section>
  );
}
