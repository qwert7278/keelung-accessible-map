import { DEMO_MODE } from "../config";
import type { ReportRepository } from "../types";
export async function loadRepository(): Promise<ReportRepository> {
  if (DEMO_MODE) return (await import("./demo")).demoRepository;
  return (await import("./supabase")).createSupabaseRepository();
}
