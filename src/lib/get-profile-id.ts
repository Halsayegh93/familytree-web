import type { User } from "@supabase/supabase-js";

/**
 * يرجّع profile_id للمستخدم الحالي
 * - لو دخل بالـ OTP: نفس user.id
 * - لو دخل بـ username/password: من user_metadata.profile_id
 */
export function getProfileId(user: User | null): string | null {
  if (!user) return null;
  const fromMetadata = (user.user_metadata as any)?.profile_id;
  return fromMetadata || user.id;
}
