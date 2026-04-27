"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateMemberAction } from "./actions";

export function MemberFullEditClient({
  member,
  canManageRoles,
  variant = "button",
}: {
  member: any;
  canManageRoles: boolean;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const supabase = createClient();
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

    const result = await updateMemberAction(member.id, updates, member.first_name ?? "");

    setBusy(false);
    if (!result.success) {
      setError("خطأ: " + result.error);
    } else {
      setOpen(false);
      if (result.cascadeCount && result.cascadeCount > 0) {
        // إشعار بسيط بعدد الأحفاد اللي تعدّلوا
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
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#0F172A]">✏️ تعديل بيانات العضو</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={save} className="p-5 space-y-4">
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

          <Group title="التواريخ">
            <DateInput label="تاريخ الميلاد" value={birthDate} onChange={setBirthDate} />
            {isDeceased && (
              <DateInput label="تاريخ الوفاة" value={deathDate} onChange={setDeathDate} />
            )}
          </Group>

          <Group title="الحالة">
            <Toggle
              label="متوفى"
              icon="🕊️"
              value={isDeceased}
              onChange={setIsDeceased}
              color="#6B7B8D"
            />
            <Select
              label="حالة الحساب"
              value={status}
              onChange={setStatus}
              options={[
                { value: "active", label: "✅ نشط" },
                { value: "frozen", label: "🔒 مجمّد" },
              ]}
            />
            <Toggle
              label="إخفاء من الشجرة"
              icon="🚫"
              value={isHiddenFromTree}
              onChange={setIsHiddenFromTree}
              color="#F59E0B"
            />
            <Toggle
              label="إخفاء رقم الهاتف"
              icon="📵"
              value={isPhoneHidden}
              onChange={setIsPhoneHidden}
              color="#3B82F6"
            />
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

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold">{error}</div>
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
        className={`relative w-12 h-7 rounded-full transition ${
          value ? "" : "bg-[#E2E8F0]"
        }`}
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
