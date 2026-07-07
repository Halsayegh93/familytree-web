-- الأزواج من خارج العائلة (ميزة خاصة بالويب — لوحة العلاقات في الشجرة)
-- كل صف = زوج خارجي مرتبط بامرأة من العائلة (women_members).
-- تُستخدم عندما تتزوج امرأة من العائلة رجلاً ليس عضواً في الشجرة،
-- فلا يوجد له سجل في profiles/women_members ونحتاج تسجيل بياناته يدوياً.

create table if not exists public.external_spouses (
  id uuid primary key default gen_random_uuid(),
  woman_id uuid not null references public.women_members(id) on delete cascade,
  first_name text not null,
  full_name text,
  family_name text,
  nationality text,
  is_deceased boolean not null default false,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_external_spouses_woman on public.external_spouses(woman_id);

-- RLS — القراءة والكتابة لفريق الإدارة فقط (التاب مخصص للمدراء)
alter table public.external_spouses enable row level security;

drop policy if exists "external_spouses_select_mods" on public.external_spouses;
create policy "external_spouses_select_mods"
  on public.external_spouses for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  );

drop policy if exists "external_spouses_write_mods" on public.external_spouses;
create policy "external_spouses_write_mods"
  on public.external_spouses for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  );
