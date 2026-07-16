create function public.user_has_verified_phone_mfa(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.mfa_factors as factor
    where factor.user_id = p_user_id
      and factor.factor_type::text = 'phone'
      and factor.status::text = 'verified'
  );
$$;

revoke all on function public.user_has_verified_phone_mfa(uuid)
  from public, anon, authenticated;
grant execute on function public.user_has_verified_phone_mfa(uuid)
  to service_role;

comment on function public.user_has_verified_phone_mfa(uuid) is
  'Service-only phone-factor check used to enforce citizen phone verification without exposing factor details.';
