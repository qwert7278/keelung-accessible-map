import { get, set } from "idb-keyval";
import { demoReports } from "../data/demoReports";
import type { Report, ReportRepository, ReportUpdate } from "../types";
import { toDataUrl } from "../utils/images";
import { validateDraft } from "../utils/validation";
type Store = {
  version: 1;
  reports: Report[];
  updates: Record<string, ReportUpdate[]>;
};
const key = "accessible-map-demo-v1";
const event = "accessible-map-change";
const uid = "demo-local-user";
async function read(): Promise<Store> {
  const store = (await get<Store>(key)) ?? { version: 1, reports: [], updates: {} };
  // Remove only the eight known historical fixtures; preserve locally created reports.
  const seedIds = new Set(Array.from({ length: 8 }, (_, i) => `demo-${i + 1}`));
  const reports = store.reports.filter((report) => !seedIds.has(report.id));
  if (reports.length !== store.reports.length) {
    store.reports = reports;
    for (const id of seedIds) delete store.updates[id];
    await set(key, store);
  }
  return store;
}
async function save(store: Store) {
  await set(key, store);
  window.dispatchEvent(new Event(event));
}
export const demoRepository: ReportRepository = {
  async get(id) { return (await read()).reports.find(report => report.id === id) || null; },
  async session() {
    return { uid, admin: true, anonymous: false };
  },
  subscribe(cityId, next, error, criteria = {}) {
    let active = true;
    const refresh = () => {
      read()
        .then((s) => {
          if (active) {
            const rows=s.reports.filter(r=>r.cityId===cityId && (!criteria.district || criteria.district==='all' || r.district===criteria.district)
              && (!criteria.status || criteria.status==='all' || r.status===criteria.status)
              && (!criteria.access || criteria.access==='all' || r.wheelchairAccess===criteria.access)
              && (r.title+' '+r.address+' '+r.description).toLowerCase().includes(criteria.search?.trim().toLowerCase()||''));
            next(rows,false);
          }
        })
        .catch(error);
    };
    refresh();
    window.addEventListener(event, refresh);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener(event, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  },
  async create(draft, photo, progress, operationId = crypto.randomUUID()) {
    const error = validateDraft(draft);
    if (error) throw new Error(error);
    const store = await read(),
      now = new Date().toISOString(),
      id = operationId;
    if (store.reports.some(report=>report.id===id)) return id;
    const image = await toDataUrl(photo);
    progress(60);
    store.reports.unshift({
      ...draft,
      id,
      schemaVersion: 1,
      status: "open",
      beforeImageUrl: image,
      afterImageUrl: null,
      createdAt: now,
      updatedAt: now,
      officialSource: false,
    });
    await save(store);
    progress(100);
    return id;
  },
  async updates(id) {
    return (await read()).updates[id] ?? [];
  },
  async addUpdate(id, draft, photo, progress,operationId=crypto.randomUUID()) {
    const store = await read();
    if(store.updates[id]?.some(update=>update.id===operationId)) return;
    if (!store.reports.some((r) => r.id === id))
      throw new Error("案件不存在。");
    const imageUrl = photo ? await toDataUrl(photo) : null;
    const update: ReportUpdate = {
      ...draft,
      id: operationId,
      type: "community",
      imageUrl,
      createdAt: new Date().toISOString(),
    };
    store.updates[id] = [...(store.updates[id] ?? []), update];
    await save(store);
    progress(100);
  },
  async moderate(report, status, note, access, photo, progress,operationId=crypto.randomUUID()) {
    const store = await read(),
      target = store.reports.find((r) => r.id === report.id);
    if (!target) throw new Error("案件不存在。");
    if(store.updates[report.id]?.some(update=>update.id===operationId)) return;
    if(target.updatedAt!==report.updatedAt) throw new Error('案件已被其他管理者更新，請重新開啟後再試。');
    if (status === "resolved" && !photo && !target.afterImageUrl)
      throw new Error("標記已改善前，請提供改善後照片。");
    const imageUrl = photo ? await toDataUrl(photo) : null;
    target.status = status;
    target.updatedAt = new Date().toISOString();
    target.wheelchairAccess = access;
    if (imageUrl) target.afterImageUrl = imageUrl;
    store.updates[report.id] = [
      ...(store.updates[report.id] ?? []),
      {
        id: operationId,
        message: note,
        imageUrl,
        suggestedStatus: status,
        type: "admin",
        createdAt: target.updatedAt,
      },
    ];
    await save(store);
    progress(100);
  },
};
export async function resetDemo() {
  await save({
    version: 1,
    reports: structuredClone(demoReports),
    updates: {},
  });
}
