-- توسيع سياسة الكتابة على women_members لتدعم المدراء الداخلين بـ username/password
-- (حيث auth.uid() != profile.id، فنحلّ profile_id من user_metadata) — مطابق لبقية الجداول.
-- يُستخدم لإضافة/تعديل/حذف الزوجات من لوحة العلاقات في الويب.
drop policy if exists "women_members_write" on public.women_members;
create policy "women_members_write"
  on public.women_members for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin', 'monitor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin', 'monitor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'admin', 'monitor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = ((select raw_user_meta_data ->> 'profile_id' from auth.users where id = auth.uid())::uuid)
        and p.role in ('owner', 'admin', 'monitor')
    )
  );
