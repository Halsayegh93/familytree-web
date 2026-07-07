"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateMemberAction } from "./actions";

type LiteMember = { id: string; full_name: string; avatar_url?: string | null };
type ChildLite = {
  id: string;
  first_name: string;
  full_name: string;
  avatar_url: string | null;
  is_deceased: boolean | null;
  sort_order: number | null;
};

export function MemberFullEditClient({
  member,
  canManageRoles,
  variant = "button",
  allMembers,
  childrenList,
  onNavigate,
}: {
  member: any;
  canManageRoles: boolean;
  variant?: "button" | "icon";
  /** قائمة كل الأعضاء — لتفعيل تغيير الأب (يُمرَّر من الشجرة فقط) */
  allMembers?: LiteMember[];
  /** أبناء العضو الحالي — لتفعيل قسم الأبناء (يُمرَّر من الشجرة فقط) */
  childrenList?: ChildLite[];
  /** الانتقال لعضو آخر داخل الشجرة */
  onNavigate?: (id: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إخفاء شريط البحث في الشجرة عند فتح التعديل
  useEffect(() => {
    if (open) {
      document.body.classList.add("editing-member");
    } else {
      document.body.classList.remove("editing-member");
    }
    return () => document.body.classList.remove("editing-member");
  }, [open]);

  const [firstName, setFirstName] = useState(member.first_name ?? "");
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(member.phone_number ?? "");
  const [birthDate, setBirthDate] = useState(member.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(member.death_date ?? "");
  const [isDeceased, setIsDeceased] = useState(member.is_deceased ?? false);
  const [isHiddenFromTree, setIsHiddenFromTree] = useState(member.is_hidden_from_tree ?? false);
  const [isPhoneHidden, setIsPhoneHidden] = useState(member.is_phone_hidden ?? false);
  const [gender, setGender] = useState<string>(member.gender ?? "");
  const [isMarried, setIsMarried] = useState<boolean | null>(member.is_married ?? null);
  const [role, setRole] = useState(member.role ?? "member");
  const [status, setStatus] = useState(member.status ?? "active");
  const [fatherId, setFatherId] = useState<string | null>(member.father_id ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member.avatar_url ?? null);

  const showFather = Array.isArray(allMembers) && allMembers.length > 0;
  const showChildren = Array.isArray(childrenList);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !fullName.trim()) return;

    setBusy(true);
    setError(null);

    const updates: Record<string, any> = {
      first_name: firstName.trim(),
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
      birth_date: birthDate || null,
      death_date: isDeceased ? (deathDate || null) : null,
      is_deceased: isDeceased,
      is_hidden_from_tree: isHiddenFromTree,
      is_phone_hidden: isPhoneHidden,
      gender: gender || null,
      is_married: isMarried,
      status,
    };

    if (canManageRoles) {
      updates.role = role;
    }
    if (showFather) {
      updates.father_id = fatherId;
    }

    const result = await updateMemberAction(
      member.id,
      updates,
      member.first_name ?? "",
      member.full_name ?? ""
    );

    setBusy(false);
    if (!result.success) {
      setError("خطأ: " + result.error);
    } else {
      setOpen(false);
      if (result.cascadeCount && result.cascadeCount > 0) {
        setTimeout(() => {
          alert(`✅ تم التحديث — تحديث ${result.cascadeCount} اسم لأحفاد العضو تلقائياً`);
        }, 100);
      }
      router.refresh();
    }
  }

  if (!open) {
    if (variant === "icon") {
      return (
        <button
          onClick={() => setOpen(true)}
          title="تعديل بيانات العضو"
          className="w-7 h-7 rounded-full bg-white text-[#357DED] border border-[#357DED]/30 flex items-center justify-center text-xs hover:bg-[#357DED] hover:text-white shadow-sm transition"
        >
          ✏️
        </button>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#357DED] text-white rounded-2xl font-bold shadow-md hover:opacity-90 transition"
      >
        <span className="text-xl">✏️</span>
        <span>تعديل بيانات العضو</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0F172A]">✏️ تعديل بيانات العضو</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
          {/* الصورة الشخصية */}
          <div className="flex flex-col items-center gap-2 pb-1">
            <AvatarEditor
              memberId={member.id}
              currentUrl={avatarUrl}
              fallback={(fullName || member.full_name || "؟").charAt(0)}
              onChange={setAvatarUrl}
            />
            <span className="text-[11px] text-[#94A3B8] font-bold">انقر لتغيير الصورة</span>
          </div>

          <Group title="المعلومات الأساسية">
            <Input label="الاسم الأول *" value={firstName} onChange={setFirstName} required />
            <Input label="الاسم الكامل *" value={fullName} onChange={setFullName} required />
            <Input
              label="رقم الهاتف"
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="+965..."
              dir="ltr"
            />
          </Group>

          {/* الأب — تغيير الأب (من الشجرة فقط) */}
          {showFather && (
            <Group title="الأب">
              <FatherPicker
                members={allMembers!}
                currentId={fatherId}
                selfId={member.id}
                onChange={setFatherId}
              />
            </Group>
          )}

          <Group title="التواريخ">
            <DateInput label="تاريخ الميلاد" value={birthDate} onChange={setBirthDate} />
            {isDeceased && (
              <DateInput label="تاريخ الوفاة" value={deathDate} onChange={setDeathDate} />
            )}
          </Group>

          <Group title="الحالة">
            <Toggle label="متوفى" icon="🕊️" value={isDeceased} onChange={setIsDeceased} color="#6B7B8D" />
            <Select
              label="حالة الحساب"
              value={status}
              onChange={setStatus}
              options={[
                { value: "active", label: "✅ نشط" },
                { value: "frozen", label: "🔒 مجمّد" },
              ]}
            />
            <Toggle label="إخفاء من الشجرة" icon="🚫" value={isHiddenFromTree} onChange={setIsHiddenFromTree} color="#F59E0B" />
            <Toggle label="إخفاء رقم الهاتف" icon="📵" value={isPhoneHidden} onChange={setIsPhoneHidden} color="#3B82F6" />
          </Group>

          <Group title="معلومات إضافية">
            <Select
              label="الجنس"
              value={gender}
              onChange={setGender}
              options={[
                { value: "", label: "—" },
                { value: "male", label: "ذكر" },
                { value: "female", label: "أنثى" },
              ]}
            />
            <Select
              label="متزوج"
              value={isMarried === null ? "" : String(isMarried)}
              onChange={(v) => setIsMarried(v === "" ? null : v === "true")}
              options={[
                { value: "", label: "—" },
                { value: "true", label: "نعم" },
                { value: "false", label: "لا" },
              ]}
            />
          </Group>

          {canManageRoles && member.role !== "owner" && (
            <Group title="الدور (المالك فقط)">
              <Select
                label="الدور"
                value={role}
                onChange={setRole}
                options={[
                  { value: "admin", label: "👑 مدير" },
                  { value: "monitor", label: "👁️ مراقب" },
                  { value: "supervisor", label: "⭐ مشرف" },
                  { value: "member", label: "👤 عضو" },
                ]}
              />
            </Group>
          )}

          {/* الأبناء — إضافة/تعديل (من الشجرة فقط) */}
          {showChildren && (
            <ChildrenSection
              parent={member}
              parentFullName={fullName}
              childrenList={childrenList!}
              onNavigate={onNavigate}
              onClose={() => setOpen(false)}
            />
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</div>
          )}

          {/* حذف العضو — المالك فقط + بدون أبناء */}
          {canManageRoles && member.role !== "owner" && showChildren && (
            <DeleteMemberSection
              memberId={member.id}
              memberName={member.full_name}
              hasChildren={(childrenList?.length ?? 0) > 0}
              onDeleted={() => {
                setOpen(false);
                if (member.father_id && onNavigate) onNavigate(member.father_id);
                router.refresh();
              }}
            />
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white border-t border-[#E2E8F0] -mx-5 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-5 py-3 bg-[#F1F5F9] text-[#475569] rounded-2xl font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy || !firstName.trim() || !fullName.trim()}
              className="flex-1 bg-[#357DED] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
            >
              {busy ? "..." : "💾 حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MARK: - Avatar Editor (رفع/حذف صورة العضو)

function AvatarEditor({
  memberId,
  currentUrl,
  fallback,
  onChange,
}: {
  memberId: string;
  currentUrl: string | null;
  fallback: string;
  onChange: (url: string | null) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("الرجاء اختيار صورة");
    if (file.size > 5 * 1024 * 1024) return setErr("حجم الصورة أكبر من 5MB");

    setBusy(true);
    setErr(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${memberId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setBusy(false);
      return setErr("خطأ في الرفع: " + upErr.message);
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", memberId);
    setBusy(false);
    if (updErr) return setErr("خطأ في الحفظ: " + updErr.message);
    onChange(publicUrl);
    router.refresh();
  }

  async function remove() {
    if (!currentUrl) return;
    if (!confirm("حذف الصورة الشخصية؟")) return;
    setBusy(true);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", memberId);
    setBusy(false);
    if (updErr) return setErr("خطأ: " + updErr.message);
    onChange(null);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black overflow-hidden text-white shadow-md ring-4 ring-white bg-gradient-to-br from-[#357DED] to-[#10B981] disabled:opacity-50"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-[#357DED] text-white text-sm flex items-center justify-center shadow-md border-2 border-white disabled:opacity-50"
      >
        {busy ? "…" : "📷"}
      </button>
      {currentUrl && !busy && (
        <button
          type="button"
          onClick={remove}
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center shadow-md border-2 border-white"
          title="حذف الصورة"
        >
          ✕
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {err && (
        <div className="absolute top-full mt-1 right-1/2 translate-x-1/2 p-2 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold whitespace-nowrap z-10">
          {err}
        </div>
      )}
    </div>
  );
}

// MARK: - Father Picker (تغيير الأب — بحث)

function FatherPicker({
  members,
  currentId,
  selfId,
  onChange,
}: {
  members: LiteMember[];
  currentId: string | null;
  selfId: string;
  onChange: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const currentName = currentId ? members.find((m) => m.id === currentId)?.full_name : null;

  const matched = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return members
      .filter((m) => m.id !== selfId && m.full_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, members, selfId]);

  if (currentName && !search) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F1F5F9] rounded-xl">
        <span className="font-bold text-sm text-[#0F172A] truncate">{currentName}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[#EF4444] text-xs font-bold flex-shrink-0 mr-2"
        >
          تغيير
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث عن الأب بالاسم..."
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] text-sm"
      />
      {matched.length > 0 && (
        <div className="absolute top-full mt-2 right-0 left-0 bg-white rounded-xl border border-[#E2E8F0] z-20 max-h-56 overflow-y-auto shadow-xl">
          {matched.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id);
                setSearch("");
              }}
              className="w-full text-right px-4 py-2.5 hover:bg-[#F1F5F9] border-b border-[#E2E8F0] last:border-0 text-sm font-bold text-[#0F172A]"
            >
              {m.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// MARK: - Children Section (قائمة + إضافة ابن)

function ChildrenSection({
  parent,
  parentFullName,
  childrenList,
  onNavigate,
  onClose,
}: {
  parent: any;
  parentFullName: string;
  childrenList: ChildLite[];
  onNavigate?: (id: string) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [sonName, setSonName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addSon(e: React.MouseEvent) {
    e.preventDefault();
    const first = sonName.trim();
    if (!first) return;
    setBusy(true);
    setErr(null);

    const maxSort = childrenList.reduce((mx, c) => Math.max(mx, c.sort_order ?? 0), 0);
    const { error } = await supabase.from("profiles").insert({
      first_name: first,
      full_name: `${first} ${parentFullName}`.trim(),
      father_id: parent.id,
      role: "member",
      status: "active",
      gender: "male",
      sort_order: maxSort + 1,
    });
    setBusy(false);
    if (error) return setErr("خطأ: " + error.message);
    setSonName("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
          الأبناء {childrenList.length > 0 && `· ${childrenList.length}`}
        </h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[11px] font-black text-[#10B981] hover:underline"
        >
          {adding ? "✕ إلغاء" : "➕ إضافة ابن"}
        </button>
      </div>

      {adding && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 space-y-2">
          <input
            type="text"
            value={sonName}
            onChange={(e) => setSonName(e.target.value)}
            placeholder="اسم الابن الأول"
            className="w-full px-3 py-2.5 bg-white rounded-lg outline-none focus:ring-2 focus:ring-[#10B981] text-sm"
            autoFocus
          />
          {sonName.trim() && (
            <p className="text-[11px] text-[#059669] font-bold">
              الاسم الكامل: {sonName.trim()} {parentFullName}
            </p>
          )}
          <button
            type="button"
            onClick={addSon}
            disabled={busy || !sonName.trim()}
            className="w-full bg-[#10B981] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {busy ? "..." : "إضافة"}
          </button>
          {err && <p className="text-[11px] text-red-600 font-bold">{err}</p>}
        </div>
      )}

      {childrenList.length > 0 && (
        <div className="space-y-1">
          {childrenList.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onClose();
                  onNavigate(c.id);
                }
              }}
              className="w-full flex items-center gap-2.5 p-2 bg-[#F8FAFC] rounded-xl hover:bg-[#EFF6FF] transition text-right border border-[#E2E8F0]"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#357DED] to-[#10B981] text-white flex items-center justify-center font-black text-sm overflow-hidden flex-shrink-0">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  c.first_name.charAt(0)
                )}
              </div>
              <span className="flex-1 min-w-0 font-bold text-sm text-[#0F172A] truncate">
                {c.first_name}
                {c.is_deceased && <span className="mr-1 text-[11px]">🕊️</span>}
              </span>
              {onNavigate && <span className="text-[#94A3B8] text-xs flex-shrink-0">تعديل ←</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// MARK: - Delete Member Section (المالك فقط)

function DeleteMemberSection({
  memberId,
  memberName,
  hasChildren,
  onDeleted,
}: {
  memberId: string;
  memberName: string;
  hasChildren: boolean;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    if (hasChildren) return;
    if (!confirm(`حذف «${memberName}» نهائياً؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("profiles").delete().eq("id", memberId);
    setBusy(false);
    if (error) return setErr("خطأ: " + error.message);
    onDeleted();
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy || hasChildren}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 font-black text-sm hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title={hasChildren ? "لا يمكن حذف عضو له أبناء" : "حذف العضو نهائياً"}
      >
        🗑️ {busy ? "جارٍ الحذف..." : hasChildren ? "لا يمكن الحذف (له أبناء)" : "حذف العضو نهائياً"}
      </button>
      {err && <p className="text-[11px] text-red-600 font-bold mt-1 text-center">{err}</p>}
    </div>
  );
}

// MARK: - Form Components

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, required, dir,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        dir={dir}
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
      />
    </div>
  );
}

function DateInput({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1">{label}</label>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED]"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#0F172A] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#357DED] font-bold"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label, icon, value, onChange, color,
}: {
  label: string; icon: string; value: boolean; onChange: (v: boolean) => void; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
      <span className="text-xl">{icon}</span>
      <span className="flex-1 font-bold text-[#0F172A]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full transition ${value ? "" : "bg-[#E2E8F0]"}`}
        style={value ? { background: color } : {}}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${
            value ? "right-1" : "right-6"
          }`}
        />
      </button>
    </div>
  );
}
