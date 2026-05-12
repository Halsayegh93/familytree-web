/**
 * Canonical filter for "أعضاء العائلة" — the single source of truth for
 * who counts as a family member across the entire app.
 *
 * يطابق فلتر شجرة iOS:
 *   - role != 'pending'        (طلبات الانضمام تحت الموافقة)
 *   - status != 'frozen'       (الحسابات المجمّدة)
 *   - is_hidden_from_tree = false  (المخفيّون يدوياً)
 *   - full_name not null/empty (سجلّات معطوبة بدون اسم)
 *
 * استخدم `applyCountableFilters` على استعلامات السيرفر،
 * أو `isCountable` على المصفوفات المحمّلة في العميل.
 */

import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type Q = PostgrestFilterBuilder<any, any, any, any, any>;

export function applyCountableFilters<T extends Q>(query: T): T {
  return query
    .neq("role", "pending")
    .neq("status", "frozen")
    .eq("is_hidden_from_tree", false)
    .not("full_name", "is", null)
    .neq("full_name", "") as T;
}

export type CountableMember = {
  role?: string | null;
  status?: string | null;
  is_hidden_from_tree?: boolean | null;
  full_name?: string | null;
};

export function isCountable(m: CountableMember): boolean {
  if (!m) return false;
  if (m.role === "pending") return false;
  if (m.status === "frozen") return false;
  if (m.is_hidden_from_tree === true) return false;
  const name = (m.full_name ?? "").trim();
  if (!name) return false;
  return true;
}

/** تسميات موحّدة لاستخدامها في أي UI يعرض هذه الأعداد. */
export const COUNT_LABELS = {
  family: "أعضاء العائلة",
  pending: "طلبات الانضمام",
  frozen: "حسابات مجمّدة",
  deceased: "متوفّون",
  active: "نشطون",
} as const;
