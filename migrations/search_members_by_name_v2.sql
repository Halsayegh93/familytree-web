-- ────────────────────────────────────────────────────────────────────────
-- search_members_by_name v2 — مطابقة أذكى لطلبات الانضمام
-- ────────────────────────────────────────────────────────────────────────
-- التحسينات على v1:
--   1) Exact word match — لا يحسب substrings (مثلاً "محمد" داخل "أحمد")
--   2) محصور بأول 4 أجزاء من اسم العضو (الشخص + الأب + الجد + والد الجد)
--      — لأن باقي السلسلة (8 أجداد فوق) لا يفيد للهوية
--   3) Threshold ديناميكي 75% — يحتاج 75% من أجزاء اسم المتقدم تتطابق
--      مع حد أدنى 2 أجزاء، عشان النتائج تكون فعلاً متعلقة
--   4) يزيل الأقواس من الأسماء قبل المقارنة (مثل "(العطار)" أو "(أبو فلان)")
--   5) ينقّي query_parts من التكرار (distinct)
--
-- مثال:
--   المتقدم: "عبدالله محمد مصطفى" (3 أجزاء، threshold = 3 = 75%)
--   - "عبدالله محمد طاهر محمد حسن ابراهيم (العطار) ..." → score = 2 (مصطفى مفقود) → مرفوض
--   - "عبدالله محمد مصطفى الكندري" → score = 3 → مقبول ✅
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.search_members_by_name(p_query text)
returns table (member_id uuid, full_name text, match_score bigint)
language sql
security definer
stable
set search_path = public
as $$
  with query_parts as (
    -- تقسيم اسم المتقدم لأجزاء، إزالة الأقواس + المسافات الزائدة، استبعاد الأجزاء القصيرة
    select distinct trim(part) as part
    from unnest(
      string_to_array(
        regexp_replace(trim(p_query), '\(.*?\)|\s+', ' ', 'g'),
        ' '
      )
    ) as part
    where length(trim(part)) >= 2
  ),
  total as (
    select count(*)::int as cnt from query_parts
  ),
  member_top_parts as (
    -- أول 4 أجزاء من اسم كل عضو (الشخص + الأب + الجد + والد الجد)
    -- نزيل الأقواس والمسافات الزائدة لتطابق أنظف
    select
      p.id as mid,
      p.full_name as fname,
      (
        string_to_array(
          regexp_replace(trim(p.full_name), '\(.*?\)|\s+', ' ', 'g'),
          ' '
        )
      )[1:4] as top_parts
    from public.profiles p
    where p.role not in ('pending')
      and p.full_name is not null
      and length(trim(p.full_name)) > 0
  ),
  matches as (
    -- exact word match داخل أول 4 أجزاء من اسم العضو
    select
      mtp.mid,
      mtp.fname,
      count(distinct qp.part)::bigint as score
    from member_top_parts mtp
    cross join query_parts qp
    where qp.part = any(mtp.top_parts)
    group by mtp.mid, mtp.fname
  )
  select
    m.mid as member_id,
    m.fname as full_name,
    m.score as match_score
  from matches m, total t
  where m.score >= greatest(2, ceil(t.cnt::numeric * 0.75)::int)
  order by m.score desc, m.fname asc
  limit 10;
$$;

grant execute on function public.search_members_by_name(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- ملاحظة للتطبيق:
-- شغّل هذا الملف يدوياً على Supabase SQL Editor (لأن CI لا يطبق migrations تلقائياً)
-- ────────────────────────────────────────────────────────────────────────
