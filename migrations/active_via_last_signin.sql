-- يجلب tarikh آخر دخول لكل عضو من auth.users
-- متاح فقط لفريق الإدارة (owner/admin/monitor/supervisor)
-- مشروع: FamilyTreeV2

create or replace function public.get_members_last_signin()
returns table (
  member_id uuid,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  -- نتأكد إن المستدعي من فريق الإدارة
  select u.id as member_id, u.last_sign_in_at
  from auth.users u
  where exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('owner', 'admin', 'monitor', 'supervisor')
  );
$$;

revoke all on function public.get_members_last_signin() from public;
grant execute on function public.get_members_last_signin() to authenticated;
