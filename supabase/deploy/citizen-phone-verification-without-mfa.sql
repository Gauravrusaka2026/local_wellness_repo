-- JagrukSetu citizen phone verification without Advanced Phone MFA
--
-- Paste this complete file into the hosted Supabase SQL Editor after all
-- migrations through 20260723120000_jagruksetu_complaint_taxonomy.sql.
-- It contains migrations 20260723130000 and 20260724100000.
--
-- After this succeeds, enable the ordinary Phone provider and activate
-- public.hook_require_email_identity as the Before User Created Auth Hook.

begin;

create or replace function public.user_has_verified_phone(p_user_id uuid)
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

create or replace function public.hook_require_email_identity(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  candidate_email text;
begin
  candidate_email := nullif(btrim(event #>> '{user,email}'), '');

  if candidate_email is null then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'code',
        'email_required',
        'http_code',
        403,
        'message',
        'Create this account with an email address before linking a phone.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_require_email_identity(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.hook_require_email_identity(jsonb)
  to supabase_auth_admin;

comment on function public.hook_require_email_identity(jsonb) is
  'Before User Created Auth Hook that rejects phone-only users while ordinary Phone Auth remains enabled for OTP sign-in to existing email accounts.';

commit;

select pg_catalog.pg_notify('pgrst', 'reload schema');

select
  pg_catalog.to_regprocedure('public.user_has_verified_phone(uuid)') is not null
    as verified_phone_function_installed,
  pg_catalog.has_function_privilege(
    'service_role',
    'public.user_has_verified_phone(uuid)',
    'execute'
  ) as service_role_can_check_verified_phone,
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.user_has_verified_phone(uuid)',
    'execute'
  ) as authenticated_cannot_check_verified_phone,
  pg_catalog.to_regprocedure('public.hook_require_email_identity(jsonb)') is not null
    as email_identity_hook_installed,
  pg_catalog.has_function_privilege(
    'supabase_auth_admin',
    'public.hook_require_email_identity(jsonb)',
    'execute'
  ) as auth_admin_can_run_email_identity_hook;
