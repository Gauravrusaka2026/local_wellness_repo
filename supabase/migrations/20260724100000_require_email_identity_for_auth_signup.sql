create function public.hook_require_email_identity(event jsonb)
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
