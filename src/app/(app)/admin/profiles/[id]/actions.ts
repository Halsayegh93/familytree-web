"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Updates = {
  first_name?: string;
  full_name?: string;
  phone_number?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  is_deceased?: boolean;
  is_hidden_from_tree?: boolean;
  is_phone_hidden?: boolean;
  gender?: string | null;
  is_married?: boolean | null;
  status?: string;
  role?: string;
};

export async function updateMemberAction(
  memberId: string,
  updates: Updates,
  oldFirstName: string
) {
  const supabase = await createClient();

  // 1) تحديث العضو نفسه
  const { error: updErr } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", memberId);

  if (updErr) {
    return { success: false, error: updErr.message };
  }

  // 2) إذا تغيّر first_name → نُحدّث full_name لكل الأحفاد
  let cascadeCount = 0;
  if (updates.first_name && updates.first_name !== oldFirstName) {
    cascadeCount = await cascadeFullName(supabase, memberId);
  }

  revalidatePath(`/admin/profiles/${memberId}`);
  revalidatePath(`/admin/profiles`);
  revalidatePath(`/tree`);

  return { success: true, cascadeCount };
}

/**
 * إعادة حساب full_name لكل الأحفاد بناءً على:
 * child.full_name = child.first_name + " " + father.full_name
 */
async function cascadeFullName(
  supabase: any,
  memberId: string
): Promise<number> {
  // اجلب العضو لمعرفة full_name الجديد
  const { data: parent } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", memberId)
    .single();

  if (!parent?.full_name) return 0;

  // اجلب الأبناء المباشرين
  const { data: children } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("father_id", memberId);

  if (!children || children.length === 0) return 0;

  let count = 0;
  for (const child of children) {
    const newFullName = `${child.first_name} ${parent.full_name}`;
    await supabase
      .from("profiles")
      .update({ full_name: newFullName })
      .eq("id", child.id);
    count++;
    // recurse للأحفاد
    count += await cascadeFullName(supabase, child.id);
  }

  return count;
}
