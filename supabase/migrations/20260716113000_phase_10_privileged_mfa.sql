create function private.jwt_has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

revoke all on function private.jwt_has_aal2() from public;
grant execute on function private.jwt_has_aal2() to authenticated, service_role;

comment on function private.jwt_has_aal2() is
  'Returns true only for a verified authenticated JWT carrying Supabase Auth AAL2.';

create or replace function private.has_active_role(
  required_role_code text,
  required_scope_type text default null,
  required_scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.jwt_has_aal2()
    and private.user_has_active_role(
      (select auth.uid()),
      required_role_code,
      required_scope_type,
      required_scope_id
    );
$$;

create or replace function private.can_manage_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.jwt_has_aal2()
    and private.user_can_manage_authority(
      (select auth.uid()),
      target_authority_id
    );
$$;

comment on function private.has_active_role(text, text, uuid) is
  'AAL2-gated current-session role check used by privileged direct RLS policies.';
comment on function private.can_manage_authority(uuid) is
  'AAL2-gated current-session authority-management check used by privileged direct RLS policies.';

create function public.user_requires_privileged_mfa(
  p_user_id uuid,
  p_at timestamptz default current_timestamp
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = p_user_id
      and profile.status = 'active'
      and (role.is_government or role.is_privileged)
      and user_role.status = 'active'
      and user_role.effective_from <= p_at
      and (user_role.effective_until is null or user_role.effective_until > p_at)
      and (
        user_role.scope_type = 'global'
        or exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= p_at
            and (membership.effective_until is null or membership.effective_until > p_at)
        )
      )
  );
$$;

revoke all on function public.user_requires_privileged_mfa(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.user_requires_privileged_mfa(uuid, timestamptz)
  to service_role;

comment on function public.user_requires_privileged_mfa(uuid, timestamptz) is
  'Service-only decision for whether current government or privileged access requires AAL2.';
