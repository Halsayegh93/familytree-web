-- طبقة العلاقات الخاصة بالموقع (web-only) — التطبيقات (iOS/Android) لا تقرأ هذا الجدول.
-- تُخزَّن هنا: الزوجات، البنات، ربط الأم للأبناء، وربط الزوج (من العائلة أو خارجها).
create table if not exists public.web_relatives (
  id uuid primary key default gen_random_uuid(),
  man_id uuid not null references public.profiles(id) on delete cascade, -- العضو (الأب/الزوج)
  kind text not null check (kind in ('wife', 'daughter', 'son')),
  name text,                       -- اسم العرض (للزوجة/البنت)
  child_profile_id uuid references public.profiles(id) on delete cascade, -- ابن حقيقي (kind='son') لربط الأم فقط
  mother_rel_id uuid references public.web_relatives(id) on delete set null, -- الأم = صف زوجة (ويب)
  mother_name text,                -- اسم الأم (denormalized — يدعم زوجات women_members أيضاً)
  is_deceased boolean not null default false,
  -- الزوج (للبنت)
  husband_type text check (husband_type in ('family', 'external')),
  husband_profile_id uuid references public.profiles(id) on delete set null, -- زوج من العائلة
  husband_name text,               -- زوج خارجي
  husband_family text,
  husband_nationality text,
  husband_deceased boolean not null default false,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_web_relatives_man on public.web_relatives(man_id);
create index if not exists idx_web_relatives_child on public.web_relatives(child_profile_id);

alter table public.web_relatives enable row level security;

-- قراءة: كل فريق الإدارة
drop policy if exists "web_relatives_select" on public.web_relatives;
create policy "web_relatives_select"
  on public.web_relatives for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  );

-- كتابة: owner/admin/monitor فقط
drop policy if exists "web_relatives_write" on public.web_relatives;
create policy "web_relatives_write"
  on public.web_relatives for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor')
    )
  );

-- ربط زوجة من العائلة (سجل women_members) بصف web_relatives — يبقى خاص بالموقع.
alter table public.web_relatives
  add column if not exists linked_woman_id uuid references public.women_members(id) on delete set null;

-- دعم أبناء الإناث المتزوجات (خاص بالموقع فقط):
-- طفل الأنثى = صف web_relatives بأب = صف أنثى (web daughter) أو سجل women_members.
alter table public.web_relatives alter column man_id drop not null;
alter table public.web_relatives
  add column if not exists parent_rel_id uuid references public.web_relatives(id) on delete cascade;
alter table public.web_relatives
  add column if not exists parent_woman_id uuid references public.women_members(id) on delete cascade;
create index if not exists idx_web_relatives_parent_rel on public.web_relatives(parent_rel_id);
create index if not exists idx_web_relatives_parent_woman on public.web_relatives(parent_woman_id);

-- حالة زواج البنت (طبقة الويب) — لإخفاء الأبناء إن كانت غير متزوجة.
alter table public.web_relatives add column if not exists is_married boolean;
