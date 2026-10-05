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
import { PUBLIC_SITE_URL, canReportInCity } from "../config";
import { validateDraft } from "../utils/validation";
import { districtAt } from "../utils/districtBoundary";
import { imageUploadFormat } from "../utils/images";

let client: SupabaseClient | undefined;
function supabase() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL,
    key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "目前無法連線至回報服務，請稍後再試。",
    );
  client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
export async function loginAdmin(email: string) {
  const { error } = await supabase().auth.signInWithOtp({
    email: email.trim(),
    options: {
      // Admin accounts are provisioned separately. The login page must not
      // create arbitrary Auth users when someone enters an unknown address.
      shouldCreateUser: false,
      // Always return admin Magic Links to the configured public site.
      // This avoids Preview/local origins leaking into production login emails.
      emailRedirectTo: new URL("/admin", PUBLIC_SITE_URL).toString(),
    },
  });
  if (error) throw new Error(error.message);
}
export async function logoutAdmin() {
  const { error } = await supabase().auth.signOut();
  if (error) throw new Error(error.message);
}

export function subscribeAuthSession(
  next: (session: Session | null, event: string) => void,
  onError: (error: Error) => void,
) {
  const db = supabase();
  let revision = 0;
  const {
    data: { subscription },
  } = db.auth.onAuthStateChange((event, authSession) => {
    const currentRevision = ++revision;
    if (event === "SIGNED_OUT") {
      next(null, event);
      return;
    }
    if (!authSession?.user) return;

    // Keep the auth callback synchronous. Resolve the private admin check
    // immediately afterwards so magic-link redirects refresh the UI.
    window.setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await db.rpc("is_admin");
          if (error) {
            onError(new Error(error.message));
            return;
          }
          const { data: current, error: sessionError } =
            await db.auth.getSession();
          if (sessionError) {
            onError(new Error(sessionError.message));
            return;
          }
          if (
            currentRevision !== revision ||
            current.session?.user.id !== authSession.user.id
          )
            return;
          next(
            {
              uid: authSession.user.id,
              admin: data === true && authSession.user.is_anonymous !== true,
              anonymous: authSession.user.is_anonymous === true,
            },
            event,
          );
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    }, 0);
  });
  return () => subscription.unsubscribe();
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
      const anonymous = user.is_anonymous === true;
      return { uid: user.id, admin: admin === true && !anonymous, anonymous };
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
    operation: string = crypto.randomUUID(),
  ) {
    const { contentType, extension, format } = imageUploadFormat(blob);
    await session();
    const { data, error } = await db.auth.getSession();
    if (error || !data.session) throw new Error("登入已過期，請重新登入。");
    const preparation=await fetch('/api/prepare-photo',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({report:reportId,kind,operation,format}),signal:AbortSignal.timeout(30000)});
    const prepared=await preparation.json().catch(()=>{throw new Error('照片上傳服務暫時無法使用，請稍後重試。');});
    if(!preparation.ok) throw new Error(prepared.error || '照片上傳準備失敗，請稍後再試。');
    const { path, uploaded } = prepared as {path:string;uploaded:boolean};
    if (!path || path !== `${reportId}/${kind}/${operation}.${extension}`) throw new Error('無效的照片上傳位置。');
    if (uploaded) { progress(100); return path; }
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
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.setRequestHeader("x-upsert", "false");
      // UUID paths are never overwritten, so browser/CDN caches can reuse them.
      xhr.setRequestHeader("cache-control", "public, max-age=3600");
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
                "照片上傳沒有完成，請稍後重試。",
              ),
            );
      xhr.send(blob);
    });
    return path;
  }
  return {
    session,
    async get(id) {
      const { data, error } = await db.from("report_feed").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? fromRow(data as Row) : null;
    },
    subscribe(cityId, next, onError, criteria = {}) {
      let active = true;
      let revision = 0;
      async function refresh() {
        const request = ++revision;
        const rows: Row[] = [];
        let hasMore=false;
        for(let page=0;page<Math.max(1,criteria.pages || 1);page++) {
          let query=db.from("report_feed").select("*").eq("city_id",cityId);
          if(criteria.district && criteria.district!=='all') query=query.eq('district',criteria.district);
          if(criteria.access && criteria.access!=='all') query=query.eq('wheelchair_access',criteria.access);
          if(criteria.status && criteria.status!=='all') query=query.eq('status',criteria.status);
          if(criteria.search?.trim()) query=query.ilike('search_text','%'+criteria.search.trim().replace(/[\\%_]/g,'\\$&')+'%');
          const cursor=rows.at(-1);
          if(cursor) query=query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
          const {data,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).limit(201);
          if(!active || request!==revision) return;
          if(error) {onError(new Error(error.message)); return;}
          hasMore=data.length>200;
          rows.push(...(data as Row[]).slice(0,200));
          if(!hasMore) break;
        }
        next(rows.map(fromRow),hasMore);
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
    async create(draft, photo, progress, operationId = crypto.randomUUID()) {
      if (!canReportInCity(draft.cityId)) throw new Error("此縣市的正式回報尚未開放。");
      const validation = validateDraft(draft);
      if (validation) throw new Error(validation);
      await session();
      const id = operationId;
      const existing = await db.rpc('owned_report',{report:id});
      if(existing.error) throw new Error(existing.error.message);
      if(existing.data) return id;
      if(await districtAt(draft.cityId,draft.district,draft.location)!==draft.district)
        throw new Error('所選位置與行政區不一致，請重新確認。');
      const path = await upload(id, "before", photo, progress, id);
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
      if (error) {
        const outcome=await db.rpc('owned_report',{report:id});
        if(outcome.error || !outcome.data) throw new Error(error.message);
      }
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
    async addUpdate(id, draft, photo, progress, operationId=crypto.randomUUID()) {
      await session();
      const existing=await db.rpc('owned_update',{report:id,operation:operationId});
      if(existing.error) throw new Error(existing.error.message);
      if(existing.data) return;
      const imagePath = photo
        ? await upload(id, "updates", photo, progress,operationId)
        : null;
      const { error } = await db
        .from("report_updates")
        .insert({
          report_id: id,
          operation_id:operationId,
          message: draft.message.trim(),
          image_path: imagePath,
          suggested_status: draft.suggestedStatus,
        });
      if (error) {
        const outcome=await db.rpc('owned_update',{report:id,operation:operationId});
        if(outcome.error || !outcome.data) throw new Error(error.message);
      }
    },
    async moderate(report, status, note, access, photo, progress,operationId=crypto.randomUUID()) {
      const user = await session();
      if (!user.admin) throw new Error("權限不足。");
      const existing=await db.rpc('owned_update',{report:report.id,operation:operationId});
      if(existing.error) throw new Error(existing.error.message);
      if(existing.data) return;
      if (status === "resolved" && !photo && !report.afterImageUrl)
        throw new Error("請提供改善後照片。");
      const path = photo
        ? await upload(report.id, "after", photo, progress,operationId)
        : null;
      const {error}=await db.rpc('moderate_report',{report:report.id,expected_updated_at:report.updatedAt,operation:operationId,new_status:status,new_access:access,note:note.trim(),photo_path:path});
      if(error) {
        const outcome=await db.rpc('owned_update',{report:report.id,operation:operationId});
        if(outcome.error || !outcome.data) throw new Error(error.message);
      }
      window.dispatchEvent(new Event(changed));
    },
  };
}
