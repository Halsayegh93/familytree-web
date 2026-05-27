"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/format-phone";

type Member = {
  id: string;
  first_name: string;
  full_name: string;
  phone_number: string | null;
  birth_date: string | null;
  death_date: string | null;
  is_deceased: boolean | null;
  role: string;
  status: string;
  gender: string | null;
  is_married: boolean | null;
  father_id: string | null;
  created_at: string;
  sort_order?: number | null;
  avatar_url?: string | null;
  has_logged_in?: boolean;
  last_sign_in_at?: string | null;
  is_recently_active?: boolean;
};

const FIELDS = [
  { key: "name", label: "الاسم الكامل", icon: "👤" },
  { key: "first_name", label: "الاسم الأول", icon: "🏷️" },
  { key: "phone", label: "رقم الهاتف", icon: "📞" },
  { key: "age", label: "العمر", icon: "🎂" },
  { key: "birth_date", label: "تاريخ الميلاد", icon: "📅" },
  { key: "death_date", label: "تاريخ الوفاة", icon: "🕊️" },
  { key: "role", label: "الدور", icon: "⭐" },
  { key: "status", label: "الحالة", icon: "🔵" },
  { key: "last_sign_in", label: "آخر دخول", icon: "🕐" },
  { key: "gender", label: "الجنس", icon: "👫" },
  { key: "is_married", label: "متزوج", icon: "💍" },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "✅ نشطون (آخر 30 يوم)" },
  { key: "never_logged_in", label: "❌ ما دخلوا أبداً" },
  { key: "living", label: "أحياء فقط" },
  { key: "deceased", label: "متوفون فقط" },
  { key: "with_phone", label: "عندهم هاتف" },
  { key: "without_phone", label: "بدون هاتف" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

export function CustomReportClient({ members }: { members: Member[] }) {
  const [selected, setSelected] = useState<Set<FieldKey>>(
    new Set(["name", "phone", "age"])
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [generated, setGenerated] = useState(false);
  const [reportTitle, setReportTitle] = useState("تقرير عائلة المحمدعلي");
  const [branchRoot, setBranchRoot] = useState<string>(""); // "" = كل الفروع
  const [branchSearch, setBranchSearch] = useState<string>("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchExpanded, setBranchExpanded] = useState<Set<string>>(new Set());

  // خريطة الأبناء حسب الأب لحساب الذرّية
  const childrenByFather = useMemo(() => {
    const map = new Map<string, Member[]>();
    members.forEach((m) => {
      if (m.father_id) {
        const arr = map.get(m.father_id) ?? [];
        arr.push(m);
        map.set(m.father_id, arr);
      }
    });
    return map;
  }, [members]);

  // كل ذرّية عضو معيّن (يشمل العضو نفسه)
  function descendantIds(rootId: string): Set<string> {
    const ids = new Set<string>([rootId]);
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const c of childrenByFather.get(cur) ?? []) {
        if (!ids.has(c.id)) {
          ids.add(c.id);
          stack.push(c.id);
        }
      }
    }
    return ids;
  }

  const branchMember = members.find((m) => m.id === branchRoot) ?? null;

  const filtered = useMemo(() => {
    // أول شي حصر على فرع معيّن (إذا اختار)
    let pool = members;
    if (branchRoot) {
      const ids = descendantIds(branchRoot);
      pool = members.filter((m) => ids.has(m.id));
    }

    switch (filter) {
      case "active":
        return pool.filter((m) => !m.is_deceased && m.is_recently_active);
      case "never_logged_in":
        return pool.filter((m) => !m.is_deceased && !m.has_logged_in);
      case "living": return pool.filter((m) => !m.is_deceased);
      case "deceased": return pool.filter((m) => m.is_deceased);
      case "with_phone": return pool.filter((m) => m.phone_number && !m.is_deceased);
      case "without_phone": return pool.filter((m) => !m.phone_number && !m.is_deceased);
      default: return pool;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, filter, branchRoot]);

  // الجذر = عبدالله المحمدعلي
  const rootMember = useMemo(() => {
    return (
      members.find(
        (m) => !m.father_id && m.full_name?.includes("عبدالله") && m.full_name?.includes("المحمدعلي"),
      ) ||
      members.find((m) => m.full_name?.trim() === "عبدالله المحمدعلي") ||
      members.find((m) => !m.father_id) ||
      null
    );
  }, [members]);

  // شجرة الفروع: 3 مستويات (أبناء + أحفاد) + (أبناء أحفاد) لحسين علي وحسين ابراهيم(العطار) فقط
  type BranchNode = {
    id: string;
    name: string;
    avatar_url: string | null;
    is_deceased: boolean;
    totalCount: number;
    sortOrder: number;
    children: BranchNode[];
  };

  const branchTree = useMemo<BranchNode[]>(() => {
    if (!rootMember) return [];

    const childrenByFather = new Map<string, Member[]>();
    members.forEach((m) => {
      if (m.father_id) {
        const arr = childrenByFather.get(m.father_id) ?? [];
        arr.push(m);
        childrenByFather.set(m.father_id, arr);
      }
    });

    function descCount(id: string): number {
      const ids = new Set<string>([id]);
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const c of childrenByFather.get(cur) ?? []) {
          if (!ids.has(c.id)) {
            ids.add(c.id);
            stack.push(c.id);
          }
        }
      }
      return ids.size;
    }

    function shouldExpandThirdLevel(name: string): boolean {
      const t = name.trim();
      return (t.startsWith("حسين علي") || t.startsWith("حسين ابراهيم")) && t.includes("المحمدعلي");
    }

    function makeNode(m: Member, depth: number): BranchNode {
      let kids: BranchNode[] = [];
      // depth 0 = ابن، depth 1 = حفيد، depth 2 = ابن حفيد
      if (depth === 0) {
        kids = (childrenByFather.get(m.id) ?? []).map((c) => makeNode(c, 1));
      } else if (depth === 1 && shouldExpandThirdLevel(m.full_name ?? "")) {
        kids = (childrenByFather.get(m.id) ?? []).map((c) => makeNode(c, 2));
      }
      kids.sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: m.id,
        name: m.full_name,
        avatar_url: m.avatar_url ?? null,
        is_deceased: m.is_deceased ?? false,
        totalCount: descCount(m.id),
        sortOrder: m.sort_order ?? 999999,
        children: kids,
      };
    }

    const directChildren = childrenByFather.get(rootMember.id) ?? [];
    const directChildrenIds = new Set(directChildren.map((c) => c.id));

    // أسماء فروع إضافية (أحفاد) تظهر مباشرة في القائمة الرئيسية للاختيار
    const EXTRA_TOP_LEVEL_NAMES = [
      "محمدعلي حسن المحمدعلي",
      "علي عبدالمحسن المحمدعلي",
      "محمدحسن احمد المحمدعلي",
      "ابراهيم(العطار) المحمدعلي",
      "علي عبدالله المحمدعلي",
    ];

    // تطبيع الحروف العربية (همزة، تاء مربوطة، تشكيل) ثم تجريد المسافات والأقواس
    const normalizeArabic = (s: string) =>
      s
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[ًٌٍَُِّْـ]/g, "");
    const cleanName = (s: string) =>
      normalizeArabic(s).replace(/[()،,]/g, " ").replace(/\s+/g, " ").trim();
    const compress = (s: string) => cleanName(s).replace(/\s+/g, "");

    // المطابقة: الاسم الكامل يبدأ بكل كلمات الاستعلام عدا الأخيرة (مع تجاهل
    // المسافات داخل الأسماء المركبة)، وينتهي بآخر كلمة (عادة "المحمدعلي").
    const matchesName = (fullName: string, query: string) => {
      const qTokens = cleanName(query).split(" ").filter(Boolean);
      if (qTokens.length < 2) return false;
      const lastQ = qTokens[qTokens.length - 1];
      const restQ = qTokens.slice(0, -1).join(" ");
      const fnC = compress(fullName);
      const restQC = compress(restQ);
      const lastQC = compress(lastQ);
      if (!restQC || !lastQC) return false;
      return fnC.startsWith(restQC) && fnC.endsWith(lastQC);
    };

    const extras: Member[] = [];
    const usedExtraIds = new Set<string>();
    for (const name of EXTRA_TOP_LEVEL_NAMES) {
      const candidates = members.filter(
        (mm) =>
          !directChildrenIds.has(mm.id) &&
          !usedExtraIds.has(mm.id) &&
          matchesName(mm.full_name ?? "", name),
      );
      if (candidates.length === 0) continue;
      // اختار الاسم الأقصر — الجد الفعلي، مو الأحفاد العميقة
      candidates.sort(
        (a, b) => (a.full_name?.length ?? 0) - (b.full_name?.length ?? 0),
      );
      const m = candidates[0];
      extras.push(m);
      usedExtraIds.add(m.id);
    }

    const sortedDirect = directChildren
      .map((c) => makeNode(c, 0))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return [...sortedDirect, ...extras.map((m) => makeNode(m, 0))];
  }, [members, rootMember]);

  // البحث: لو في نص، نسطّح كل المستويات ونفلتر
  const branchSearchResults = useMemo<BranchNode[]>(() => {
    const q = branchSearch.trim();
    if (!q) return branchTree;
    const matches: BranchNode[] = [];
    function walk(node: BranchNode) {
      if (node.name?.includes(q)) {
        matches.push({ ...node, children: [] });
      }
      for (const c of node.children) walk(c);
    }
    for (const parent of branchTree) walk(parent);
    return matches;
  }, [branchTree, branchSearch]);

  function toggleField(key: FieldKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function age(m: Member): string {
    if (!m.birth_date) return "—";
    const birth = new Date(m.birth_date);
    if (isNaN(birth.getTime())) return "—";
    // للمتوفّى مع تاريخ وفاة → نحسب عمر الوفاة (من الميلاد للوفاة)
    // للحيّ أو متوفى بدون تاريخ وفاة → نحسب للحين
    let endDate: Date;
    if (m.is_deceased && m.death_date) {
      const death = new Date(m.death_date);
      endDate = isNaN(death.getTime()) ? new Date() : death;
    } else {
      endDate = new Date();
    }
    let a = endDate.getFullYear() - birth.getFullYear();
    const mn = endDate.getMonth() - birth.getMonth();
    if (mn < 0 || (mn === 0 && endDate.getDate() < birth.getDate())) a--;
    if (a < 0) return "—";
    return String(a);
  }

  function valueOf(m: Member, key: FieldKey): string {
    switch (key) {
      case "name": return m.full_name;
      case "first_name": return m.first_name;
      case "phone": return m.phone_number ? formatPhone(m.phone_number) : "—";
      case "age": return age(m);
      case "birth_date": return m.birth_date ? new Date(m.birth_date).toLocaleDateString("ar") : "—";
      case "death_date": return m.death_date ? new Date(m.death_date).toLocaleDateString("ar") : "—";
      case "role":
        switch (m.role) {
          case "owner": return "مالك";
          case "admin": return "مدير";
          case "monitor": return "مراقب";
          case "supervisor": return "مشرف";
          default: return "عضو";
        }
      case "status": {
        if (m.is_deceased) return "🕊️ متوفى";
        if (m.status === "frozen") return "🔒 مجمّد";
        if (m.is_recently_active && m.status === "active") return "✅ نشط";
        if (m.has_logged_in) return "💤 خامل";
        if (!m.phone_number) return "📵 بدون هاتف";
        return "❌ ما دخل";
      }
      case "gender": return m.gender === "male" ? "ذكر" : m.gender === "female" ? "أنثى" : "—";
      case "is_married": return m.is_married === true ? "نعم" : m.is_married === false ? "لا" : "—";
      case "last_sign_in": {
        if (!m.last_sign_in_at) return "لم يدخل";
        const d = new Date(m.last_sign_in_at);
        const days = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000));
        if (days === 0) return "اليوم";
        if (days === 1) return "أمس";
        if (days < 30) return `قبل ${days} يوم`;
        if (days < 365) return `قبل ${Math.floor(days / 30)} شهر`;
        return d.toLocaleDateString("ar");
      }
      default: return "—";
    }
  }

  // اسم الملف التلقائي حسب اختيار الفرع
  function fileBaseName(): string {
    const date = new Date().toISOString().split("T")[0];
    const parts = [reportTitle];
    if (branchMember) {
      // ناخذ الاسم الأول فقط من الفرع لتسمية أنظف (مثلاً "محمدعلي")
      const firstWord = branchMember.full_name?.trim().split(/\s+/)[0] ?? "";
      if (firstWord) parts.push("فرع-" + firstWord);
    }
    parts.push(date);
    return parts.join("-");
  }

  // \u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 HTML \u0645\u0635\u0645\u0645 (\u064a\u0641\u062a\u062d \u0628\u0627\u0644\u0645\u062a\u0635\u0641\u062d\u060c \u064a\u0637\u0628\u0639 PDF \u0646\u0638\u064a\u0641\u060c \u0648\u064a\u062a\u0634\u0627\u0631\u0643)
  async function downloadStyledXLSX() {
    const ExcelJS = (await import("exceljs")).default;
    const fields = FIELDS.filter((f) => selected.has(f.key));
    const dateStr = new Date().toLocaleDateString("ar", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "";
    const branchName = branchMember?.full_name ?? "";

    const wb = new ExcelJS.Workbook();
    wb.creator = "تطبيق عائلة المحمدعلي";
    wb.created = new Date();

    const ws = wb.addWorksheet("التقرير", {
      pageSetup: {
        paperSize: 9,
        orientation: fields.length > 4 ? "landscape" : "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        horizontalCentered: true,
      },
      headerFooter: {
        oddFooter: "&Lapp.almohali.com&Cعائلة المحمدعلي&Rصفحة &P / &N",
      },
    });

    const lastColLetter = (n: number) => {
      let s = ""; let x = n;
      while (x > 0) { const r = (x - 1) % 26; s = String.fromCharCode(65 + r) + s; x = Math.floor((x - 1) / 26); }
      return s;
    };
    const totalCols = fields.length + 1;
    const lastCol = lastColLetter(totalCols);

    // ===== ترويسة الوثيقة (key/value منظّمة) =====
    let rowIdx = 0;

    // 1) Eyebrow صغير رمادي بأحرف لاتينية كبيرة
    rowIdx++;
    ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
    const eyeCell = ws.getCell(`A${rowIdx}`);
    eyeCell.value = "AL-MOHAMMADALI FAMILY  ·  REPORT";
    eyeCell.font = { name: "Cairo", size: 9, bold: true, color: { argb: "FF94A3B8" } };
    eyeCell.alignment = { horizontal: "right", vertical: "middle" };
    ws.getRow(rowIdx).height = 16;

    // 2) العنوان الكبير
    rowIdx++;
    ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
    const titleCell = ws.getCell(`A${rowIdx}`);
    titleCell.value = reportTitle;
    titleCell.font = { name: "Cairo", size: 20, bold: true, color: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(rowIdx).height = 34;

    // 3) فاصل صغير
    rowIdx++;
    ws.getRow(rowIdx).height = 6;

    // 4) صفوف معلومات (label : value) — سطر لكل بند
    const addMetaRow = (label: string, value: string, valueArgb = "FF0F172A") => {
      rowIdx++;
      ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
      const cell = ws.getCell(`A${rowIdx}`);
      cell.value = {
        richText: [
          { text: `${label}    `, font: { name: "Cairo", size: 11, color: { argb: "FF64748B" } } },
          { text: value, font: { name: "Cairo", size: 11, bold: true, color: { argb: valueArgb } } },
        ],
      };
      cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      ws.getRow(rowIdx).height = 22;
    };

    addMetaRow("📅  التاريخ:", dateStr);
    if (branchName) addMetaRow("🌳  الفرع:", branchName, "FF5438DC");
    addMetaRow("🏷️  الفلتر:", filterLabel);
    addMetaRow("📋  الحقول المعروضة:", fields.map((f) => f.label).join("  •  "));
    addMetaRow("👥  إجمالي الأعضاء:", `${filtered.length} عضو`, "FF357DED");

    // 5) فاصل + شريط ملوّن قبل الجدول
    rowIdx++;
    ws.getRow(rowIdx).height = 8;

    rowIdx++;
    ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
    const dividerCell = ws.getCell(`A${rowIdx}`);
    dividerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF357DED" } };
    ws.getRow(rowIdx).height = 4;

    rowIdx++;
    ws.getRow(rowIdx).height = 8;

    // 6) ترويسة الجدول (تثبّت + تتكرر بالطباعة)
    rowIdx++;
    const headerRowIdx = rowIdx;
    const headerValues = ["#", ...fields.map((f) => `${f.icon} ${f.label}`)];
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.values = headerValues;
    headerRow.height = 28;
    // طبّق الستايل على كل خلية في صف الترويسة (نمشي يدوياً عشان الخلايا الفارغة)
    for (let c = 1; c <= totalCols; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF357DED" } };
      cell.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E5BB8" } },
        bottom: { style: "thin", color: { argb: "FF1E5BB8" } },
        left: { style: "thin", color: { argb: "FF1E5BB8" } },
        right: { style: "thin", color: { argb: "FF1E5BB8" } },
      };
    }

    // ثبّت الترويسة (تبقى ظاهرة عند التمرير) + كرّرها بكل صفحة طباعة
    ws.views = [{ rightToLeft: true, state: "frozen", ySplit: headerRowIdx }];
    ws.pageSetup.printTitlesRow = `${headerRowIdx}:${headerRowIdx}`;

    // البيانات (استخدم فهارس صريحة عشان ما تتعارض مع الصفوف اليدوية أعلاه)
    filtered.forEach((m, i) => {
      const rowVals = [i + 1, ...fields.map((f) => valueOf(m, f.key))];
      const r = ws.getRow(headerRowIdx + 1 + i);
      r.values = rowVals;
      r.height = 20;
      const isAlt = i % 2 === 1;
      r.eachCell((cell, colNumber) => {
        const fieldDef = colNumber === 1 ? null : fields[colNumber - 2];
        const muted = cell.value === "—" || cell.value === "لم يدخل";
        cell.font = {
          name: "Cairo",
          size: 10,
          bold: colNumber === 1 || colNumber === 2,
          color: { argb: colNumber === 1 ? "FF94A3B8" : (muted ? "FFCBD5E1" : "FF0F172A") },
        };
        const isLtrCol = fieldDef?.key === "phone" || fieldDef?.key === "birth_date" || fieldDef?.key === "death_date";
        cell.alignment = {
          horizontal: colNumber === 1 ? "center" : (isLtrCol ? "left" : "right"),
          vertical: "middle",
          readingOrder: fieldDef?.key === "phone" ? "ltr" : "rtl",
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (isAlt) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
    });

    // عرض الأعمدة
    ws.getColumn(1).width = 6;
    fields.forEach((f, idx) => {
      const col = ws.getColumn(idx + 2);
      switch (f.key) {
        case "name": col.width = 55; break;
        case "first_name": col.width = 18; break;
        case "phone": col.width = 18; break;
        case "age": col.width = 8; break;
        case "birth_date":
        case "death_date":
        case "last_sign_in":
          col.width = 16; break;
        default: col.width = 14;
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleFields = FIELDS.filter((f) => selected.has(f.key));
  const reportDate = new Date().toLocaleDateString("ar", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* الإعدادات (تختفي بالطباعة) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden print:hidden shadow-sm">
        <div className="px-5 py-3 bg-gradient-to-l from-[#357DED]/10 to-transparent border-b border-[#E2E8F0] flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <h2 className="font-black text-[#357DED]">إعدادات التقرير</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* === القسم 1: معلومات التقرير === */}
          <SettingsSection icon="📝" title="معلومات التقرير">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#64748B] mb-1.5">عنوان التقرير</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F1F5F9] rounded-lg outline-none focus:ring-2 focus:ring-[#357DED] font-bold text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#64748B] mb-1.5">حصر على فرع (اختياري)</label>
                {!branchMember ? (
                  <button
                    type="button"
                    onClick={() => setBranchOpen(true)}
                    className="w-full text-right px-3 py-2 bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] text-sm font-bold text-[#475569] flex items-center gap-2"
                  >
                    <span>🌳</span>
                    <span className="flex-1">اختر فرعاً</span>
                    <span className="text-[#94A3B8]">▼</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#5438DC]/10 rounded-lg border border-[#5438DC]/20">
                    <span>🌳</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-[#5438DC] truncate">
                        {branchMember.full_name}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        {descendantIds(branchRoot).size} عضو
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBranchOpen(true)}
                      className="px-2 py-0.5 bg-white text-[#5438DC] rounded text-[10px] font-bold border border-[#5438DC]/30"
                    >
                      تغيير
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranchRoot("")}
                      className="text-[#EF4444] text-base"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>

          {/* مودال اختيار الفرع */}
          {branchOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[85vh] flex flex-col">
                {/* العنوان — أعلى شي */}
                <div className="bg-white border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-lg font-black text-[#0F172A]">🌳 اختر فرعاً</h2>
                  <button
                    onClick={() => { setBranchOpen(false); setBranchSearch(""); }}
                    className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] font-bold"
                  >
                    ✕
                  </button>
                </div>
                {/* البحث — تحت العنوان مباشرة */}
                <div className="p-4 bg-white border-b border-[#E2E8F0] flex-shrink-0">
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="🔍 ابحث بالاسم..."
                    autoFocus
                    className="w-full px-4 py-2.5 bg-[#F1F5F9] rounded-xl outline-none focus:ring-2 focus:ring-[#5438DC]"
                  />
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
                  {branchSearchResults.map((node) => {
                    const isExpanded = branchExpanded.has(node.id);
                    const canExpand = node.children.length > 0;
                    return (
                      <div key={node.id}>
                        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-[#F8FAFC]">
                          {canExpand ? (
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(branchExpanded);
                                if (next.has(node.id)) next.delete(node.id);
                                else next.add(node.id);
                                setBranchExpanded(next);
                              }}
                              className="w-7 h-7 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#475569] text-xs font-bold flex-shrink-0"
                            >
                              {isExpanded ? "▼" : "▶"}
                            </button>
                          ) : (
                            <span className="w-7 flex-shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setBranchRoot(node.id);
                              setBranchOpen(false);
                              setBranchSearch("");
                            }}
                            className="flex-1 flex items-center gap-3 text-right min-w-0"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5438DC] to-[#7C3AED] text-white flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                              {node.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={node.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                node.name?.[0] ?? "؟"
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-[#0F172A] truncate">
                                {node.name} {node.is_deceased && <span className="text-xs">🕊️</span>}
                              </div>
                              <div className="text-[10px] text-[#64748B]">
                                {node.totalCount} عضو في الفرع
                              </div>
                            </div>
                          </button>
                        </div>

                        {/* الأحفاد */}
                        {isExpanded && node.children.length > 0 && (
                          <div className="bg-[#F8FAFC] divide-y divide-[#E2E8F0]">
                            {node.children.map((child) => {
                              const childExpanded = branchExpanded.has(child.id);
                              const childCanExpand = child.children.length > 0;
                              return (
                                <div key={child.id}>
                                  <div className="flex items-center gap-2 pr-12 pl-3 py-2 hover:bg-white">
                                    {childCanExpand ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = new Set(branchExpanded);
                                          if (next.has(child.id)) next.delete(child.id);
                                          else next.add(child.id);
                                          setBranchExpanded(next);
                                        }}
                                        className="w-6 h-6 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] text-[10px] font-bold flex-shrink-0"
                                      >
                                        {childExpanded ? "▼" : "▶"}
                                      </button>
                                    ) : (
                                      <span className="w-6 flex-shrink-0" />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBranchRoot(child.id);
                                        setBranchOpen(false);
                                        setBranchSearch("");
                                      }}
                                      className="flex-1 flex items-center gap-3 text-right min-w-0"
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
                                        {child.avatar_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={child.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          child.name?.[0] ?? "؟"
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-xs text-[#0F172A] truncate">
                                          {child.name} {child.is_deceased && <span className="text-[10px]">🕊️</span>}
                                        </div>
                                        <div className="text-[10px] text-[#64748B]">{child.totalCount} عضو</div>
                                      </div>
                                    </button>
                                  </div>

                                  {/* أبناء الأحفاد (المستوى 3) */}
                                  {childExpanded && child.children.length > 0 && (
                                    <div className="bg-white divide-y divide-[#E2E8F0]">
                                      {child.children.map((gg) => (
                                        <button
                                          key={gg.id}
                                          type="button"
                                          onClick={() => {
                                            setBranchRoot(gg.id);
                                            setBranchOpen(false);
                                            setBranchSearch("");
                                          }}
                                          className="w-full flex items-center gap-3 pr-20 pl-4 py-2 hover:bg-[#F8FAFC] text-right"
                                        >
                                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
                                            {gg.avatar_url ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img src={gg.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              gg.name?.[0] ?? "؟"
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-bold text-[11px] text-[#0F172A] truncate">
                                              {gg.name} {gg.is_deceased && <span className="text-[9px]">🕊️</span>}
                                            </div>
                                            <div className="text-[9px] text-[#64748B]">{gg.totalCount} عضو</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {branchSearchResults.length === 0 && (
                    <p className="p-8 text-center text-sm text-[#64748B]">لا نتائج</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === القسم 2: من يشمل التقرير === */}
          <SettingsSection icon="🎯" title="من يشمل التقرير" trailing={`${filtered.length} عضو`}>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === f.key
                      ? "bg-[#357DED] text-white shadow-sm"
                      : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </SettingsSection>

          {/* === القسم 3: الحقول === */}
          <SettingsSection icon="📋" title="الحقول المعروضة" trailing={`${selected.size} مختارة`}>
            <div className="flex flex-wrap gap-1.5">
              {FIELDS.map((f) => {
                const active = selected.has(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleField(f.key)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                      active
                        ? "bg-[#357DED] text-white border-[#357DED]"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#357DED]/50"
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                    {active && <span className="text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* === الأزرار === */}
          <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              onClick={() => setGenerated(true)}
              disabled={selected.size === 0}
              className="flex-1 bg-[#357DED] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
            >
              🔍 معاينة التقرير
            </button>
            <button
              onClick={downloadStyledXLSX}
              disabled={selected.size === 0 || !generated}
              className="px-5 bg-[#10B981] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
            >
              📊 Excel
            </button>
            <button
              onClick={() => {
                const original = document.title;
                document.title = fileBaseName();
                setTimeout(() => {
                  window.print();
                  setTimeout(() => { document.title = original; }, 500);
                }, 50);
              }}
              disabled={selected.size === 0 || !generated}
              className="px-5 bg-[#EF4444] text-white py-3 rounded-2xl font-bold shadow-md disabled:opacity-50"
            >
              📄 PDF
            </button>
          </div>
        </div>
      </div>

      {/* المعاينة / التقرير */}
      {generated && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden print-area" dir="rtl">
          {/* رأس احترافي للتقرير */}
          <header className="report-header px-6 py-5 print:py-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.3em] text-[#94A3B8] font-bold uppercase mb-1">
                  AlMohammadAli Family
                </div>
                <h1 className="text-2xl print:text-xl font-black text-[#0F172A] leading-tight">
                  {reportTitle}
                </h1>
                {branchMember && (
                  <div className="text-xs text-[#5438DC] font-bold mt-1">
                    🌳 فرع {branchMember.full_name}
                  </div>
                )}
              </div>
              <div className="text-left text-[10px] text-[#64748B] print:text-black flex-shrink-0">
                <div className="font-bold text-[#0F172A]">{reportDate}</div>
                <div>تقرير #{Date.now().toString().slice(-6)}</div>
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#475569] print:text-black">
              <span><strong>👥 العدد:</strong> {filtered.length} عضو</span>
              <span><strong>🏷️ الفلتر:</strong> {FILTERS.find((f) => f.key === filter)?.label}</span>
              <span><strong>📋 الحقول:</strong> {visibleFields.map((f) => f.label).join(" • ")}</span>
            </div>
          </header>

          {/* الجدول */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F1F5F9] sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right font-black text-[#0F172A] w-12">#</th>
                  {visibleFields.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-right font-black text-[#0F172A]">
                      {f.icon} {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr
                    key={m.id}
                    className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition"
                  >
                    <td className="px-3 py-2 text-[#64748B] font-bold">{i + 1}</td>
                    {visibleFields.map((f) => (
                      <td
                        key={f.key}
                        className="px-3 py-2 text-[#0F172A]"
                        dir={f.key === "phone" ? "ltr" : undefined}
                      >
                        {/* الاسم الكامل أو الأول → رابط لصفحة الإدارة */}
                        {f.key === "name" || f.key === "first_name" ? (
                          <Link
                            href={`/admin/profiles/${m.id}`}
                            className="text-[#0F172A] hover:text-[#357DED] hover:underline font-medium print:no-underline print:text-[#0F172A]"
                          >
                            {valueOf(m, f.key)}
                          </Link>
                        ) : f.key === "phone" && !m.phone_number ? (
                          /* بدون هاتف → زر "+ إضافة" */
                          <Link
                            href={`/admin/profiles/${m.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F59E0B]/15 text-[#F59E0B] rounded text-xs font-bold hover:bg-[#F59E0B] hover:text-white print:hidden"
                          >
                            <span>+</span>
                            <span>إضافة</span>
                          </Link>
                        ) : (
                          valueOf(m, f.key)
                        )}
                        {f.key === "phone" && !m.phone_number && (
                          <span className="hidden print:inline">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  trailing,
  children,
}: {
  icon: string;
  title: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/30 p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        {trailing && (
          <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-[#64748B] border border-[#E2E8F0]">
            {trailing}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
