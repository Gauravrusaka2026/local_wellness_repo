create function governance.reject_scope_key_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  argument_index integer;
  column_name text;
begin
  for argument_index in 0..tg_nargs - 1 loop
    column_name := tg_argv[argument_index];

    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception using
        errcode = '55000',
        message = format(
          '%I.%I scope key %I is immutable; create or supersede a record instead.',
          tg_table_schema,
          tg_table_name,
          column_name
        );
    end if;
  end loop;

  return new;
end;
$$;

create function governance.validate_authority_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_authority_id is null then
    return new;
  end if;

  if exists (
    with recursive ancestors as (
      select authority.id, authority.parent_authority_id
      from governance.authorities as authority
      where authority.id = new.parent_authority_id

      union all

      select authority.id, authority.parent_authority_id
      from governance.authorities as authority
      inner join ancestors on ancestors.parent_authority_id = authority.id
    )
    select 1 from ancestors where ancestors.id = new.id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent relationships cannot contain a cycle.';
  end if;

  return new;
end;
$$;

create function governance.reject_authority_cycles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    with recursive authority_paths as (
      select
        authority.id as origin_id,
        authority.parent_authority_id as next_id,
        array[authority.id]::uuid[] as visited_ids,
        false as has_cycle
      from governance.authorities as authority

      union all

      select
        path.origin_id,
        parent.parent_authority_id,
        path.visited_ids || parent.id,
        parent.id = any(path.visited_ids)
      from authority_paths as path
      inner join governance.authorities as parent on parent.id = path.next_id
      where not path.has_cycle
    )
    select 1 from authority_paths where has_cycle
  ) then
    raise exception using
      errcode = '23514',
      message = 'Authority parent relationships cannot contain a cycle.';
  end if;

  return null;
end;
$$;

create function private.is_active_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id and state.status = 'active'
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id and district.status = 'active'
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id and local_body.status = 'active'
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id and utility.status = 'active'
        )
        else true
      end
  );
$$;

create or replace function private.is_verified_governance_authority(target_authority_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from governance.authorities as authority
    where authority.id = target_authority_id
      and authority.status = 'active'
      and authority.verification_status = 'verified'
      and not authority.is_placeholder
      and case authority.authority_type
        when 'state' then exists (
          select 1 from governance.states as state
          where state.authority_id = authority.id
            and state.status = 'active'
            and state.verification_status = 'verified'
            and not state.is_placeholder
        )
        when 'district' then exists (
          select 1 from governance.districts as district
          where district.authority_id = authority.id
            and district.status = 'active'
            and district.verification_status = 'verified'
            and not district.is_placeholder
        )
        when 'local_body' then exists (
          select 1 from governance.local_bodies as local_body
          where local_body.authority_id = authority.id
            and local_body.status = 'active'
            and local_body.verification_status = 'verified'
            and not local_body.is_placeholder
        )
        when 'utility' then exists (
          select 1 from governance.utilities as utility
          where utility.authority_id = authority.id
            and utility.status = 'active'
            and utility.verification_status = 'verified'
            and not utility.is_placeholder
        )
        else true
      end
  );
$$;

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
          user_role.authority_id is not null
          and private.is_active_governance_authority(user_role.authority_id)
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
          and (
            (
              user_role.scope_type = 'authority'
              and user_role.scope_id = user_role.authority_id
            )
            or (
              user_role.scope_type = 'ward'
              and exists (
                select 1
                from governance.wards as ward
                inner join governance.local_bodies as local_body
                  on local_body.id = ward.local_body_id
                where ward.id = user_role.scope_id
                  and ward.status = 'active'
                  and not ward.is_placeholder
                  and local_body.authority_id = user_role.authority_id
                  and local_body.status = 'active'
              )
            )
            or (
              user_role.scope_type = 'department'
              and exists (
                select 1
                from governance.authority_departments as authority_department
                inner join governance.departments as department
                  on department.id = authority_department.department_id
                where authority_department.id = user_role.scope_id
                  and authority_department.authority_id = user_role.authority_id
                  and authority_department.status = 'active'
                  and not authority_department.is_placeholder
                  and department.status = 'active'
                  and not department.is_placeholder
              )
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
    private.is_active_governance_authority(target_authority_id)
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

create or replace function private.validate_governance_role_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope_type = 'global' then
    return new;
  end if;

  if not private.is_active_governance_authority(new.authority_id) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_AUTHORITY_NOT_ACTIVE';
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
      and ward.status = 'active'
      and not ward.is_placeholder
      and local_body.authority_id = new.authority_id
      and local_body.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_WARD_MISMATCH';
  end if;

  if new.scope_type = 'department' and not exists (
    select 1
    from governance.authority_departments as authority_department
    inner join governance.departments as department
      on department.id = authority_department.department_id
    where authority_department.id = new.scope_id
      and authority_department.authority_id = new.authority_id
      and authority_department.status = 'active'
      and not authority_department.is_placeholder
      and department.status = 'active'
      and not department.is_placeholder
  ) then
    raise exception using
      errcode = '23514',
      message = 'ROLE_SCOPE_DEPARTMENT_MISMATCH';
  end if;

  return new;
end;
$$;

create function public.get_active_authority_memberships(
  p_user_id uuid,
  p_at timestamptz
)
returns setof public.authority_memberships
language sql
stable
security definer
set search_path = ''
as $$
  select membership.*
  from public.authority_memberships as membership
  inner join public.profiles as profile on profile.id = membership.user_id
  where membership.user_id = p_user_id
    and profile.status = 'active'
    and membership.status = 'active'
    and membership.effective_from <= p_at
    and (membership.effective_until is null or membership.effective_until > p_at)
    and private.is_active_governance_authority(membership.authority_id)
  order by membership.effective_from, membership.id;
$$;

create function public.get_active_user_roles(
  p_user_id uuid,
  p_at timestamptz
)
returns setof public.user_roles
language sql
stable
security definer
set search_path = ''
as $$
  select user_role.*
  from public.user_roles as user_role
  inner join public.profiles as profile on profile.id = user_role.user_id
  where user_role.user_id = p_user_id
    and profile.status = 'active'
    and user_role.status = 'active'
    and user_role.effective_from <= p_at
    and (user_role.effective_until is null or user_role.effective_until > p_at)
    and (
      user_role.scope_type = 'global'
      or (
        user_role.authority_id is not null
        and private.is_active_governance_authority(user_role.authority_id)
        and exists (
          select 1
          from public.authority_memberships as membership
          where membership.user_id = user_role.user_id
            and membership.authority_id = user_role.authority_id
            and membership.status = 'active'
            and membership.effective_from <= p_at
            and (membership.effective_until is null or membership.effective_until > p_at)
        )
        and (
          (
            user_role.scope_type = 'authority'
            and user_role.scope_id = user_role.authority_id
          )
          or (
            user_role.scope_type = 'ward'
            and exists (
              select 1
              from governance.wards as ward
              inner join governance.local_bodies as local_body
                on local_body.id = ward.local_body_id
              where ward.id = user_role.scope_id
                and ward.status = 'active'
                and not ward.is_placeholder
                and local_body.authority_id = user_role.authority_id
                and local_body.status = 'active'
            )
          )
          or (
            user_role.scope_type = 'department'
            and exists (
              select 1
              from governance.authority_departments as authority_department
              inner join governance.departments as department
                on department.id = authority_department.department_id
              where authority_department.id = user_role.scope_id
                and authority_department.authority_id = user_role.authority_id
                and authority_department.status = 'active'
                and not authority_department.is_placeholder
                and department.status = 'active'
                and not department.is_placeholder
            )
          )
        )
      )
    )
  order by user_role.effective_from, user_role.id;
$$;

alter table governance.officer_assignments
  add constraint officer_assignments_status_officer_check check (
    (status = 'role_only' and officer_id is null)
    or (status in ('active', 'incumbent_unverified') and officer_id is not null)
    or status in ('inactive', 'superseded')
  ) not valid;

alter table governance.officer_assignments
  validate constraint officer_assignments_status_officer_check;

create trigger authorities_validate_hierarchy
before insert or update of parent_authority_id
on governance.authorities
for each row execute function governance.validate_authority_hierarchy();

create constraint trigger authorities_reject_hierarchy_cycles
after insert or update of parent_authority_id
on governance.authorities
deferrable initially immediate
for each row execute function governance.reject_authority_cycles();

create trigger authorities_reject_scope_key_update
before update of parent_authority_id, authority_type
on governance.authorities
for each row execute function governance.reject_scope_key_update(
  'parent_authority_id',
  'authority_type'
);

create trigger states_reject_scope_key_update
before update of authority_id on governance.states
for each row execute function governance.reject_scope_key_update('authority_id');

create trigger districts_reject_scope_key_update
before update of authority_id, state_id on governance.districts
for each row execute function governance.reject_scope_key_update('authority_id', 'state_id');

create trigger talukas_reject_scope_key_update
before update of district_id on governance.talukas
for each row execute function governance.reject_scope_key_update('district_id');

create trigger local_bodies_reject_scope_key_update
before update of authority_id, state_id on governance.local_bodies
for each row execute function governance.reject_scope_key_update('authority_id', 'state_id');

create trigger local_body_districts_reject_scope_key_update
before update of local_body_id, district_id on governance.local_body_districts
for each row execute function governance.reject_scope_key_update('local_body_id', 'district_id');

create trigger wards_reject_scope_key_update
before update of local_body_id on governance.wards
for each row execute function governance.reject_scope_key_update('local_body_id');

create trigger authority_departments_reject_scope_key_update
before update of authority_id, department_id on governance.authority_departments
for each row execute function governance.reject_scope_key_update('authority_id', 'department_id');

create trigger offices_reject_scope_key_update
before update of
  authority_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.offices
for each row execute function governance.reject_scope_key_update(
  'authority_id',
  'authority_department_id',
  'district_id',
  'taluka_id',
  'local_body_id',
  'ward_id'
);

create trigger utilities_reject_scope_key_update
before update of authority_id on governance.utilities
for each row execute function governance.reject_scope_key_update('authority_id');

drop policy authorities_select_verified_or_managed on governance.authorities;
create policy authorities_select_verified_or_managed
on governance.authorities for select to authenticated
using (
  (select private.is_verified_governance_authority(id))
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(id))
);

drop policy local_body_districts_select_visible_or_managed on governance.local_body_districts;
create policy local_body_districts_select_visible_or_managed
on governance.local_body_districts for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or (
    exists (
      select 1
      from governance.local_bodies as local_body
      where local_body.id = local_body_districts.local_body_id
        and (select private.is_verified_governance_authority(local_body.authority_id))
    )
    and exists (
      select 1
      from governance.districts as district
      where district.id = local_body_districts.district_id
        and (select private.is_verified_governance_authority(district.authority_id))
    )
  )
  or exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = local_body_districts.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

drop policy emergency_contacts_select_verified_or_managed on governance.emergency_contacts;
create policy emergency_contacts_select_verified_or_managed
on governance.emergency_contacts for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (
      authority_id is null
      or (select private.is_verified_governance_authority(authority_id))
    )
    and (
      state_id is null
      or exists (
        select 1 from governance.states as state
        where state.id = emergency_contacts.state_id
          and (select private.is_verified_governance_authority(state.authority_id))
      )
    )
    and (
      district_id is null
      or exists (
        select 1 from governance.districts as district
        where district.id = emergency_contacts.district_id
          and (select private.is_verified_governance_authority(district.authority_id))
      )
    )
    and (
      local_body_id is null
      or exists (
        select 1 from governance.local_bodies as local_body
        where local_body.id = emergency_contacts.local_body_id
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (
    authority_id is not null
    and (select private.can_manage_authority(authority_id))
  )
  or exists (
    select 1 from governance.states as state
    where state.id = emergency_contacts.state_id
      and (select private.can_manage_authority(state.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = emergency_contacts.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = emergency_contacts.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

drop policy jurisdiction_boundaries_select_current_or_managed
  on governance.jurisdiction_boundary_versions;
create policy jurisdiction_boundaries_select_current_or_managed
on governance.jurisdiction_boundary_versions for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and (
      exists (
        select 1 from governance.states as state
        where state.id = jurisdiction_boundary_versions.state_id
          and (select private.is_verified_governance_authority(state.authority_id))
      )
      or exists (
        select 1 from governance.districts as district
        where district.id = jurisdiction_boundary_versions.district_id
          and (select private.is_verified_governance_authority(district.authority_id))
      )
      or exists (
        select 1
        from governance.talukas as taluka
        inner join governance.districts as district on district.id = taluka.district_id
        where taluka.id = jurisdiction_boundary_versions.taluka_id
          and taluka.status = 'active'
          and taluka.verification_status = 'verified'
          and not taluka.is_placeholder
          and (select private.is_verified_governance_authority(district.authority_id))
      )
      or exists (
        select 1 from governance.local_bodies as local_body
        where local_body.id = jurisdiction_boundary_versions.local_body_id
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
      or exists (
        select 1
        from governance.wards as ward
        inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
        where ward.id = jurisdiction_boundary_versions.ward_id
          and ward.status = 'active'
          and ward.verification_status = 'verified'
          and not ward.is_placeholder
          and (select private.is_verified_governance_authority(local_body.authority_id))
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.states as state
    where state.id = jurisdiction_boundary_versions.state_id
      and (select private.can_manage_authority(state.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = jurisdiction_boundary_versions.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1
    from governance.talukas as taluka
    inner join governance.districts as district on district.id = taluka.district_id
    where taluka.id = jurisdiction_boundary_versions.taluka_id
      and (select private.can_manage_authority(district.authority_id))
  )
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = jurisdiction_boundary_versions.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = jurisdiction_boundary_versions.ward_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

revoke all on function governance.reject_scope_key_update() from public, anon, authenticated;
revoke all on function governance.validate_authority_hierarchy() from public, anon, authenticated;
revoke all on function governance.reject_authority_cycles() from public, anon, authenticated;
revoke all on function private.is_active_governance_authority(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.is_verified_governance_authority(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.is_verified_governance_authority(uuid)
  to authenticated, service_role;
revoke all on function private.validate_governance_role_scope()
  from public, anon, authenticated;
revoke all on function public.get_active_authority_memberships(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.get_active_user_roles(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_active_authority_memberships(uuid, timestamptz)
  to service_role;
grant execute on function public.get_active_user_roles(uuid, timestamptz)
  to service_role;

comment on function private.is_active_governance_authority(uuid) is
  'Checks the current canonical authority and typed governance entity lifecycle for trusted authorization paths.';
comment on function public.get_active_authority_memberships(uuid, timestamptz) is
  'Service-only effective membership read constrained by canonical governance authority lifecycle.';
comment on function public.get_active_user_roles(uuid, timestamptz) is
  'Service-only effective role read constrained by membership and canonical authority, ward, or department ownership.';
