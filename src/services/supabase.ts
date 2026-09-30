import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Access,
  Category,
  Report,
  ReportRepository,
  ReportUpdate,
  Session,
  Status,
} from "../types";
import { validateDraft } from "../utils/validation";

let client: SupabaseClient | undefined;
function supabase() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL,
    key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase 設定尚未完成。請補齊 URL 與 Publishable Key，或使用 Demo Mode。",
    );
  client = createClient(url, key);
  return client;
}
export async function loginAdmin(email: string) {
  const { error } = await supabase().auth.signInWithOtp({
    email,
    // New admin identities can be created by magic link; the private
    // admin_users table still independently gates all privileged operations.
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  });
  if (error) throw new Error(error.message);
}
export async function logoutAdmin() {
  const { error } = await supabase().auth.signOut();
  if (error) throw new Error(error.message);
}
type Row = {
  id: string;
  city_id: string;
  district: string;
  title: string;
  address: string;
  description: string;
  category: Category;
  lat: number;
  lng: number;
  status: Status;
  wheelchair_access: Access;
  created_at: string;
  updated_at: string;
  before_image_path: string;
  after_image_path: string | null;
};
const changed = "supabase-reports-changed";
export function createSupabaseRepository(): ReportRepository {
  const db = supabase();
  const photoUrl = (path: string | null) =>
    path
      ? db.storage.from("report-photos").getPublicUrl(path).data.publicUrl
      : null;
  const fromRow = (r: Row): Report => ({
    id: r.id,
    cityId: r.city_id,
    district: r.district,
    title: r.title,
    address: r.address,
    description: r.description,
    category: r.category,
    location: { lat: r.lat, lng: r.lng },
    status: r.status,
    wheelchairAccess: r.wheelchair_access,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    beforeImageUrl: photoUrl(r.before_image_path) || "",
    afterImageUrl: photoUrl(r.after_image_path),
    schemaVersion: 1,
    officialSource: false,
  });
  let pendingSession: Promise<Session> | null = null;
  async function session(): Promise<Session> {
    if (pendingSession) return pendingSession;
    pendingSession = (async () => {
      const { data: current, error: readError } = await db.auth.getSession();
      if (readError) throw new Error(readError.message);
      let user = current.session?.user;
      if (!user) {
        const { data, error } = await db.auth.signInAnonymously();
        if (error) throw new Error(`匿名登入失敗：${error.message}`);
        user = data.user ?? undefined;
      }
      if (!user) throw new Error("無法建立登入狀態。");
      const { data: admin, error } = await db.rpc("is_admin");
      if (error) throw new Error(error.message);
      return { uid: user.id, admin: admin === true };
    })();
    try {
      return await pendingSession;
    } finally {
      pendingSession = null;
    }
  }
  async function upload(
    reportId: string,
    kind: "before" | "updates" | "after",
    blob: Blob,
    progress: (n: number) => void,
  ) {
    await session();
    const { data, error } = await db.auth.getSession();
    if (error || !data.session) throw new Error("登入已過期，請重新登入。");
    const path = `${reportId}/${kind}/${crypto.randomUUID()}.jpg`;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/report-photos/${path}`,
      );
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${data.session!.access_token}`,
      );
      xhr.setRequestHeader(
        "apikey",
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      );
      xhr.setRequestHeader("Content-Type", "image/jpeg");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.timeout = 120000;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          progress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new Error("網路連線失敗，照片尚未上傳。"));
      xhr.ontimeout = () => reject(new Error("照片上傳逾時，請重試。"));
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(
              new Error(
                `照片上傳失敗（${xhr.status}），請確認 Storage 權限與容量。`,
              ),
            );
      xhr.send(blob);
    });
    return path;
  }
  return {
    session,
    subscribe(cityId, next, onError) {
      let active = true;
      async function refresh() {
        const { data, error } = await db
          .from("report_feed")
          .select("*")
          .eq("city_id", cityId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (!active) return;
        if (error) onError(new Error(error.message));
        else next((data as Row[]).map(fromRow));
      }
      void refresh();
      const timer = window.setInterval(() => {
        if (!document.hidden) void refresh();
      }, 15000);
      const onVisible = () => {
        if (!document.hidden) void refresh();
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener(changed, refresh);
      return () => {
        active = false;
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener(changed, refresh);
      };
    },
    async create(draft, photo, progress) {
      const validation = validateDraft(draft);
      if (validation) throw new Error(validation);
      await session();
      const id = crypto.randomUUID(),
        path = await upload(id, "before", photo, progress);
      const { error } = await db
        .from("reports")
        .insert({
          id,
          city_id: draft.cityId,
          district: draft.district,
          title: draft.title.trim(),
          address: draft.address,
          description: draft.description,
          category: draft.category,
          lat: draft.location.lat,
          lng: draft.location.lng,
          wheelchair_access: draft.wheelchairAccess,
          before_image_path: path,
        });
      if (error) throw new Error(error.message);
      window.dispatchEvent(new Event(changed));
      return id;
    },
    async updates(id) {
      const { data, error } = await db
        .from("report_update_feed")
        .select("*")
        .eq("report_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return data
        .reverse()
        .map(
          (r) =>
            ({
              id: r.id,
              message: r.message,
              imageUrl: photoUrl(r.image_path),
              suggestedStatus: r.suggested_status,
              createdAt: r.created_at,
              type: r.type,
            }) as ReportUpdate,
        );
    },
    async addUpdate(id, draft, photo, progress) {
      await session();
      const imagePath = photo
        ? await upload(id, "updates", photo, progress)
        : null;
      const { error } = await db
        .from("report_updates")
        .insert({
          report_id: id,
          message: draft.message.trim(),
          image_path: imagePath,
          suggested_status: draft.suggestedStatus,
        });
      if (error) throw new Error(error.message);
    },
    async moderate(report, status, note, access, photo, progress) {
      const user = await session();
      if (!user.admin) throw new Error("權限不足。");
      if (status === "resolved" && !photo && !report.afterImageUrl)
        throw new Error("請提供改善後照片。");
      const path = photo
        ? await upload(report.id, "after", photo, progress)
        : undefined;
      const change = {
        status,
        wheelchair_access: access,
        admin_note: note.trim(),
        ...(path ? { after_image_path: path } : {}),
      };
      const { data, error } = await db
        .from("reports")
        .update(change)
        .eq("id", report.id)
        .eq("updated_at", report.updatedAt)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data.length)
        throw new Error("案件已被其他管理者更新，請重新開啟後再試。");
      window.dispatchEvent(new Event(changed));
    },
  };
}
