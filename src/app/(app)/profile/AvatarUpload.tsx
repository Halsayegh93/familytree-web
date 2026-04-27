"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({
  profileId,
  currentUrl,
  fallback,
}: {
  profileId: string;
  currentUrl: string | null;
  fallback: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الرجاء اختيار صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة أكبر من 5MB");
      return;
    }

    setBusy(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profileId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (upErr) {
      setBusy(false);
      setError("خطأ في الرفع: " + upErr.message);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profileId);

    setBusy(false);
    if (updErr) {
      setError("خطأ في الحفظ: " + updErr.message);
    } else {
      router.refresh();
    }
  }

  async function removeAvatar() {
    if (!currentUrl) return;
    if (!confirm("حذف الصورة الشخصية؟")) return;
    setBusy(true);
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profileId);
    setBusy(false);
    if (updErr) setError("خطأ: " + updErr.message);
    else router.refresh();
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black overflow-hidden flex-shrink-0 text-white shadow-sm bg-gradient-to-br from-[#357DED] to-[#10B981] disabled:opacity-50"
        title="انقر لتغيير الصورة"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
      </button>

      {/* أيقونة كاميرا في الزاوية */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[#357DED] text-white text-xs flex items-center justify-center shadow-md border-2 border-white disabled:opacity-50"
      >
        {busy ? "…" : "📷"}
      </button>

      {currentUrl && !busy && (
        <button
          type="button"
          onClick={removeAvatar}
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center shadow-md border-2 border-white"
          title="حذف الصورة"
        >
          ✕
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {error && (
        <div className="absolute top-full mt-2 right-0 left-0 p-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
