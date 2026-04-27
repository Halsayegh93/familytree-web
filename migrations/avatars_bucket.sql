-- إنشاء bucket للصور الشخصية + سياسات التحكم
-- شغّل هذا الـ SQL في Supabase SQL Editor

-- 1) إنشاء الـ bucket (عام للقراءة)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2) سياسات: أي مستخدم مسجّل يقدر يرفع/يحدّث/يحذف ملفاته
-- (نخلّي الكل يقرأ لأن الـ bucket عام)

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_insert" on storage.objects;
create policy "avatars_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_update" on storage.objects;
create policy "avatars_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_delete" on storage.objects;
create policy "avatars_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
