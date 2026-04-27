/**
 * تنسيق رقم الهاتف — فصل كود الدولة عن الرقم
 * - +96599887766 → "+965 99887766"
 * - 97106020 → "+965 97106020" (محلي كويتي 8 أرقام)
 * - 966512345678 → "+966 512345678" (سعودي بدون +)
 * - 512345678 → "+966 512345678" (سعودي 9 أرقام)
 */
export function formatPhone(phone?: string | null): string {
  const { code, local } = parsePhone(phone);
  if (!code && local === "—") return "—";
  // local بدون مسافات داخلية لـ formatPhone
  const cleanLocal = local.replace(/\s/g, "");
  return code ? `${code} ${cleanLocal}` : cleanLocal;
}

/**
 * المنطق الأساسي لاستخراج كود الدولة + الرقم المحلي
 */
function parsePhone(phone?: string | null): { code: string; local: string } {
  if (!phone) return { code: "", local: "—" };
  let cleaned = phone.replace(/\s/g, "").replace(/[-()]/g, "");

  // 00 → +
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);

  let local = cleaned;
  let code = "";

  const codes = ["965", "966", "971", "974", "973", "968", "20", "44", "1"];

  if (cleaned.startsWith("+")) {
    // دولي صريح
    local = cleaned.slice(1);
    for (const c of codes) {
      if (local.startsWith(c)) {
        code = `+${c}`;
        local = local.slice(c.length);
        break;
      }
    }
  } else {
    // بدون + — نحدد حسب الطول والبداية
    if (local.length === 8) {
      // 8 خانات → كويت محلي
      code = "+965";
    } else if (local.length === 9 && local.startsWith("5")) {
      // 9 خانات تبدأ بـ 5 → سعودي محلي (5XX XXX XXX)
      code = "+966";
    } else if (local.length >= 10) {
      // أطول → نحاول نلقى كود دولة في البداية
      for (const c of codes) {
        // الكويت 965 + 8 = 11
        // السعودية 966 + 9 = 12
        // الإمارات 971 + 9 = 12
        const expectedTotal = c.length + (c === "965" ? 8 : 9);
        if (local.startsWith(c) && local.length === expectedTotal) {
          code = `+${c}`;
          local = local.slice(c.length);
          break;
        }
      }
      // لو ما لقى مطابقة دقيقة، نجرّب أطوال أخرى
      if (!code) {
        for (const c of codes) {
          if (local.startsWith(c) && local.length - c.length >= 7) {
            code = `+${c}`;
            local = local.slice(c.length);
            break;
          }
        }
      }
    }
  }

  return { code, local };
}

/**
 * عرض كود الدولة منفصلاً + الرقم منفصلاً (للـ JSX) مع تجزئة محلية
 */
export function splitPhone(phone?: string | null): { code: string; local: string } {
  const { code, local: rawLocal } = parsePhone(phone);
  let local = rawLocal;

  // تجزئة محلية للقراءة
  if (local.length === 8) {
    local = `${local.slice(0, 4)} ${local.slice(4)}`;
  } else if (local.length === 9) {
    local = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  } else if (local.length === 10) {
    local = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  return { code, local };
}
