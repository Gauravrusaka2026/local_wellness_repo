with legacy_authority_ids as (
  select authority_id
  from public.authority_memberships
  union
  select authority_id
  from public.user_roles
  where authority_id is not null
  union
  select authority_id
  from public.auth_audit_events
  where authority_id is not null
)
insert into governance.authorities (
  id,
  code,
  name,
  authority_type,
  status,
  verification_status,
  verification_notes,
  is_placeholder,
  is_routing_eligible
)
select
  legacy.authority_id,
  'LEGACY_' || upper(replace(legacy.authority_id::text, '-', '_')),
  'Legacy authority ' || legacy.authority_id::text,
  'other',
  'active',
  'placeholder',
  'Created by the Phase 2 forward fix. Reconcile this identifier with verified governance data.',
  true,
  false
from legacy_authority_ids as legacy
where legacy.authority_id is not null
on conflict (id) do nothing;

alter table public.authority_memberships
  add constraint authority_memberships_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

alter table public.user_roles
  add constraint user_roles_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

alter table public.auth_audit_events
  add constraint auth_audit_events_authority_id_fkey
  foreign key (authority_id)
  references governance.authorities (id)
  on delete restrict;

create or replace function private.user_has_active_role(
  candidate_user_id uuid,
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
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.roles as role on role.id = user_role.role_id
    inner join public.profiles as profile on profile.id = user_role.user_id
    where user_role.user_id = candidate_user_id
      and profile.status = 'active'
      and role.code = required_role_code
      and user_role.status = 'active'
      and user_role.effective_from <= current_timestamp
      and (
        user_role.effective_until is null
        or user_role.effective_until > current_timestamp
      )
      and (
        required_scope_type is null
        or (
          user_role.scope_type = required_scope_type
          and user_role.scope_id is not distinct from required_scope_id
        )
      )
      and (
        user_role.scope_type = 'global'
        or (
          exists (
            select 1
            from governance.authorities as authority
            where authority.id = user_role.authority_id
              and authority.status = 'active'
          )
          and exists (
            select 1
            from public.authority_memberships as membership
            where membership.user_id = user_role.user_id
              and membership.authority_id = user_role.authority_id
              and membership.status = 'active'
              and membership.effective_from <= current_timestamp
              and (
                membership.effective_until is null
                or membership.effective_until > current_timestamp
              )
          )
        )
      )
  );
$$;

create or replace function private.user_can_manage_authority(
  candidate_user_id uuid,
  target_authority_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from governance.authorities as authority
      where authority.id = target_authority_id
        and authority.status = 'active'
    )
    and (
      private.user_has_active_role(
        candidate_user_id,
        'platform_admin',
        'global',
        null
      )
      or private.user_has_active_role(
        candidate_user_id,
        'municipal_admin',
        'authority',
        target_authority_id
      )
    );
$$;

create function private.validate_governance_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope_type = 'global' then
    return new;
  end if;

  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_NOT_FOUND';
  end if;

  if new.scope_type = 'authority' and new.scope_id <> new.authority_id then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_MISMATCH';
  end if;

  if new.scope_type = 'ward' and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.scope_id
      and local_body.authority_id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_WARD_MISMATCH';
  end if;

  if new.scope_type = 'department' and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.scope_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_DEPARTMENT_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger user_roles_validate_governance_scope
before insert or update of authority_id, scope_type, scope_id
on public.user_roles
for each row execute function private.validate_governance_role_scope();

revoke all on function private.validate_governance_role_scope() from public, anon, authenticated;

comment on column public.authority_memberships.authority_id is
  'Canonical authority reference enforced by the Phase 2 governance registry.';
comment on column public.user_roles.authority_id is
  'Canonical authority reference enforced by the Phase 2 governance registry.';
comment on column public.auth_audit_events.authority_id is
  'Canonical retained authority reference for an immutable authentication audit event.';
comment on function private.validate_governance_role_scope() is
  'Validates authority, ward, and authority-department ownership for scoped role assignments.';
