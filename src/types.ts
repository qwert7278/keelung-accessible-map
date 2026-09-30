export const CATEGORIES = {
  uneven_surface: "路面不平／破損",
  level_difference: "高低差／階梯",
  ramp: "缺少斜坡／斜坡不良",
  arcade: "騎樓障礙",
  occupied: "人行道被占用",
  narrow: "通道過窄",
  construction: "施工阻礙",
  other: "其他",
} as const;
export const STATUSES = {
  open: "待改善",
  in_progress: "處理中",
  resolved: "已改善",
} as const;
export const ACCESS = {
  blocked: "無法通過",
  difficult: "通行困難",
  passable: "可通過",
} as const;
export type Status = keyof typeof STATUSES;
export type Category = keyof typeof CATEGORIES;
export type Access = keyof typeof ACCESS;
export type Location = { lat: number; lng: number };
export type ReportUpdate = {
  id: string;
  message: string;
  imageUrl: string | null;
  createdAt: string;
  type: "community" | "admin";
  suggestedStatus: Status | null;
};
export type Report = {
  id: string;
  cityId: string;
  district: string;
  title: string;
  address: string;
  description: string;
  category: Category;
  location: Location;
  status: Status;
  wheelchairAccess: Access;
  createdAt: string;
  updatedAt: string;
  beforeImageUrl: string;
  afterImageUrl: string | null;
  officialSource: false;
  schemaVersion: 1;
};
export type ReportDraft = Pick<
  Report,
  | "cityId"
  | "district"
  | "title"
  | "address"
  | "description"
  | "category"
  | "location"
  | "wheelchairAccess"
>;
export type Session = { uid: string; admin: boolean; anonymous: boolean };
export type UpdateDraft = { message: string; suggestedStatus: Status | null };
export interface ReportRepository {
  session(): Promise<Session>;
  subscribe(
    cityId: string,
    next: (reports: Report[]) => void,
    error: (error: Error) => void,
  ): () => void;
  create(
    draft: ReportDraft,
    photo: Blob,
    progress: (percent: number) => void,
  ): Promise<string>;
  updates(reportId: string): Promise<ReportUpdate[]>;
  addUpdate(
    reportId: string,
    draft: UpdateDraft,
    photo: Blob | null,
    progress: (percent: number) => void,
  ): Promise<void>;
  moderate(
    report: Report,
    status: Status,
    note: string,
    access: Access,
    photo: Blob | null,
    progress: (percent: number) => void,
  ): Promise<void>;
}
