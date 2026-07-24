create function public.user_has_verified_phone(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = p_user_id
      and nullif(btrim(auth_user.phone), '') is not null
      and auth_user.phone_confirmed_at is not null
      and auth_user.deleted_at is null
  );
$$;

revoke all on function public.user_has_verified_phone(uuid)
  from public, anon, authenticated;
grant execute on function public.user_has_verified_phone(uuid)
  to service_role;

comment on function public.user_has_verified_phone(uuid) is
  'Service-only confirmed-phone check used for citizen verification without requiring an MFA factor or AAL2 session.';
