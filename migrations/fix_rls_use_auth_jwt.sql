-- إصلاح: سياسات RLS كانت تقرأ من auth.users مباشرة →
-- "permission denied for table users" لأن دور authenticated لا يملك صلاحية القراءة عليه.
-- الحل: قراءة profile_id من الـ JWT عبر auth.jwt() بدل الاستعلام من auth.users.
-- يشمل: women_members (كتابة) + external_spouses (قراءة/كتابة).

-- ═══ women_members ═══
drop policy if exists "women_members_write" on public.women_members;
create policy "women_members_write"
  on public.women_members for all
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

-- ═══ external_spouses ═══
drop policy if exists "external_spouses_select_mods" on public.external_spouses;
create policy "external_spouses_select_mods"
  on public.external_spouses for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  );

drop policy if exists "external_spouses_write_mods" on public.external_spouses;
create policy "external_spouses_write_mods"
  on public.external_spouses for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where (p.id = auth.uid()
             or p.id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::uuid)
        and p.role in ('owner', 'admin', 'monitor', 'supervisor')
    )
  );
