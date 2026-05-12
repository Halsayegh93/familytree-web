-- جدول المشرفين على الفروع
-- كل صف = (فرع → مشرف مسؤول)
-- branch_root_id = id العضو الذي يمثّل الفرع (الجيل 3 أو 4)

create table if not exists public.branch_supervisors (
  id bigint generated always as identity primary key,
  branch_root_id uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_root_id)
);

create index if not exists idx_branch_supervisors_branch on public.branch_supervisors(branch_root_id);
create index if not exists idx_branch_supervisors_supervisor on public.branch_supervisors(supervisor_id);

-- RLS
alter table public.branch_supervisors enable row level security;

drop policy if exists "branch_supervisors_select_admin" on public.branch_supervisors;
create policy "branch_supervisors_select_admin"
  on public.branch_supervisors for select
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

drop policy if exists "branch_supervisors_write_owner_admin" on public.branch_supervisors;
create policy "branch_supervisors_write_owner_admin"
  on public.branch_supervisors for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin')
    )
  );
