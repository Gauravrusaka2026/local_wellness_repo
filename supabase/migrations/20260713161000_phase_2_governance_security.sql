create function governance.reject_historical_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I records are retained as history and cannot be deleted.', tg_table_schema, tg_table_name);
end;
$$;

create function governance.guard_import_batch_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array[
        'status',
        'validation_summary',
        'completed_at',
        'generated_seed_sha256'
      ]
  ) is distinct from (
    to_jsonb(old)
      - array[
        'status',
        'validation_summary',
        'completed_at',
        'generated_seed_sha256'
      ]
  ) then
    raise exception using
      errcode = '55000',
      message = 'Import batch identity and canonical source hashes are immutable.';
  end if;

  if old.status <> new.status and not (
    (old.status = 'pending' and new.status in ('validated', 'failed'))
    or (old.status = 'validated' and new.status in ('imported', 'failed'))
  ) then
    raise exception using
      errcode = '55000',
      message = 'Import batch status transitions are monotonic.';
  end if;

  if old.status in ('imported', 'failed') and (
    new.status is distinct from old.status
    or new.validation_summary is distinct from old.validation_summary
    or new.completed_at is distinct from old.completed_at
  ) then
    raise exception using
      errcode = '55000',
      message = 'Completed import batches are immutable.';
  end if;

  if old.generated_seed_sha256 is not null
    and new.generated_seed_sha256 is distinct from old.generated_seed_sha256 then
    raise exception using
      errcode = '55000',
      message = 'The generated seed hash can only be recorded once.';
  end if;

  return new;
end;
$$;

create function governance.reject_import_ledger_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I.%I import ledger records are immutable.', tg_table_schema, tg_table_name);
end;
$$;

create function governance.guard_version_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    to_jsonb(new)
      - array['status', 'effective_to', 'is_routing_eligible', 'updated_at']
  ) is distinct from (
    to_jsonb(old)
      - array['status', 'effective_to', 'is_routing_eligible', 'updated_at']
  ) then
    raise exception using
      errcode = '55000',
      message = format(
        '%I.%I version content is immutable; close the version and append a new row.',
        tg_table_schema,
        tg_table_name
      );
  end if;

  if old.effective_to is not null
    and new.effective_to is distinct from old.effective_to then
    raise exception using
      errcode = '55000',
      message = 'A closed version cannot be reopened or re-dated.';
  end if;

  if old.status <> new.status and not (
    (old.status = 'draft' and new.status = 'active')
    or (
      old.status not in ('inactive', 'superseded')
      and new.status in ('inactive', 'superseded')
      and new.effective_to is not null
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Version status transitions are monotonic.';
  end if;

  if (to_jsonb(new) ->> 'is_routing_eligible')
    is distinct from (to_jsonb(old) ->> 'is_routing_eligible')
    and not (
      (
        (to_jsonb(old) ->> 'is_routing_eligible') = 'false'
        and (to_jsonb(new) ->> 'is_routing_eligible') = 'true'
        and old.status = 'draft'
        and new.status = 'active'
      )
      or (
        (to_jsonb(old) ->> 'is_routing_eligible') = 'true'
        and (to_jsonb(new) ->> 'is_routing_eligible') = 'false'
        and new.effective_to is not null
      )
    ) then
    raise exception using
      errcode = '55000',
      message = 'Routing eligibility changes are allowed only during activation or closure.';
  end if;

  return new;
end;
$$;

create function governance.validate_authority_subtype()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.authorities as authority
    where authority.id = new.authority_id
      and authority.authority_type = tg_argv[0]
  ) then
    raise exception using
      errcode = '23514',
      message = format(
        'Authority %s must have authority_type %s for %I.%I.',
        new.authority_id,
        tg_argv[0],
        tg_table_schema,
        tg_table_name
      );
  end if;

  return new;
end;
$$;

create function governance.validate_office_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.taluka_id is not null and not exists (
    select 1 from governance.talukas as taluka
    where taluka.id = new.taluka_id and taluka.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office taluka must belong to its district.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must cover its taluka district.';
  end if;

  if new.authority_department_id is not null and not exists (
    select 1
    from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Office department must belong to its authority.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1
    from governance.local_bodies as local_body
    where local_body.id = new.local_body_id
      and local_body.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Office local body must match its authority.';
  end if;

  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.ward_id
      and local_body.authority_id = new.authority_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'Office ward must belong to its authority and local body.';
  end if;

  if new.district_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_body_districts as coverage
      on coverage.local_body_id = ward.local_body_id
    where ward.id = new.ward_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Office ward must fall within its district.';
  end if;

  if new.taluka_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    inner join governance.wards as ward on ward.local_body_id = coverage.local_body_id
    where taluka.id = new.taluka_id and ward.id = new.ward_id
  ) then
    raise exception using errcode = '23514', message = 'Office ward must fall within its taluka district.';
  end if;

  return new;
end;
$$;

create function governance.validate_officer_assignment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and new.taluka_id is not null and not exists (
    select 1 from governance.talukas as taluka
    where taluka.id = new.taluka_id and taluka.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment taluka must belong to its district.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must cover its taluka district.';
  end if;

  if new.office_id is not null and not exists (
    select 1 from governance.offices as office
    where office.id = new.office_id and office.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment office must belong to its authority.';
  end if;

  if new.authority_department_id is not null and not exists (
    select 1 from governance.authority_departments as authority_department
    where authority_department.id = new.authority_department_id
      and authority_department.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment department must belong to its authority.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.authority_id = new.authority_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment local body must match its authority.';
  end if;

  if new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body on local_body.id = ward.local_body_id
    where ward.id = new.ward_id
      and local_body.authority_id = new.authority_id
      and (new.local_body_id is null or ward.local_body_id = new.local_body_id)
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must belong to its authority and local body.';
  end if;

  if new.district_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.wards as ward
    inner join governance.local_body_districts as coverage
      on coverage.local_body_id = ward.local_body_id
    where ward.id = new.ward_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must fall within its district.';
  end if;

  if new.taluka_id is not null and new.ward_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    inner join governance.wards as ward on ward.local_body_id = coverage.local_body_id
    where taluka.id = new.taluka_id and ward.id = new.ward_id
  ) then
    raise exception using errcode = '23514', message = 'Assignment ward must fall within its taluka district.';
  end if;

  return new;
end;
$$;

create function governance.validate_local_body_district_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from governance.local_bodies as local_body
    inner join governance.districts as district on district.id = new.district_id
    where local_body.id = new.local_body_id and local_body.state_id = district.state_id
  ) then
    raise exception using errcode = '23514', message = 'Local body and district must belong to the same state.';
  end if;

  return new;
end;
$$;

create function governance.validate_administrative_unit_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.district_id is not null and not exists (
    select 1 from governance.districts as district
    where district.id = new.district_id and district.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit district must belong to its state.';
  end if;

  if new.taluka_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.districts as district on district.id = taluka.district_id
    where taluka.id = new.taluka_id
      and district.state_id = new.state_id
      and (new.district_id is null or taluka.district_id = new.district_id)
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit taluka conflicts with its state or district.';
  end if;

  if new.local_body_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must belong to its state.';
  end if;

  if new.district_id is not null and new.local_body_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must cover its district.';
  end if;

  if new.taluka_id is not null and new.local_body_id is not null and not exists (
    select 1
    from governance.talukas as taluka
    inner join governance.local_body_districts as coverage
      on coverage.district_id = taluka.district_id
    where taluka.id = new.taluka_id and coverage.local_body_id = new.local_body_id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit local body must cover its taluka district.';
  end if;

  if new.parent_unit_id is not null and not exists (
    select 1 from governance.administrative_units as parent
    where parent.id = new.parent_unit_id
      and parent.state_id = new.state_id
      and (
        parent.district_id is null
        or parent.district_id = new.district_id
      )
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit parent conflicts with its state or district.';
  end if;

  if new.parent_unit_id is not null and exists (
    with recursive ancestors as (
      select parent.id, parent.parent_unit_id
      from governance.administrative_units as parent
      where parent.id = new.parent_unit_id
      union all
      select parent.id, parent.parent_unit_id
      from governance.administrative_units as parent
      inner join ancestors on ancestors.parent_unit_id = parent.id
    )
    select 1 from ancestors where ancestors.id = new.id
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit parent relationships cannot contain a cycle.';
  end if;

  if exists (
    select 1 from governance.administrative_units as child
    where child.parent_unit_id = new.id
      and (
        child.state_id <> new.state_id
        or (new.district_id is not null and child.district_id is distinct from new.district_id)
      )
  ) then
    raise exception using errcode = '23514', message = 'Administrative unit scope changes cannot invalidate existing children.';
  end if;

  return new;
end;
$$;

create function governance.validate_emergency_contact_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jurisdiction_authority_id uuid;
begin
  if new.district_id is not null and new.state_id is not null and not exists (
    select 1 from governance.districts as district
    where district.id = new.district_id and district.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact district must belong to its state.';
  end if;

  if new.local_body_id is not null and new.state_id is not null and not exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = new.local_body_id and local_body.state_id = new.state_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact local body must belong to its state.';
  end if;

  if new.local_body_id is not null and new.district_id is not null and not exists (
    select 1 from governance.local_body_districts as coverage
    where coverage.local_body_id = new.local_body_id and coverage.district_id = new.district_id
  ) then
    raise exception using errcode = '23514', message = 'Emergency contact local body must cover its district.';
  end if;

  if new.authority_id is not null then
    if new.local_body_id is not null then
      select local_body.authority_id into jurisdiction_authority_id
      from governance.local_bodies as local_body where local_body.id = new.local_body_id;
    elsif new.district_id is not null then
      select district.authority_id into jurisdiction_authority_id
      from governance.districts as district where district.id = new.district_id;
    elsif new.state_id is not null then
      select state.authority_id into jurisdiction_authority_id
      from governance.states as state where state.id = new.state_id;
    end if;

    if jurisdiction_authority_id is not null and not exists (
      select 1 from governance.authorities as authority
      where authority.id = new.authority_id
        and (
          authority.id = jurisdiction_authority_id
          or authority.parent_authority_id = jurisdiction_authority_id
        )
    ) then
      raise exception using errcode = '23514', message = 'Emergency contact authority must own or be a direct child of its jurisdiction.';
    end if;
  end if;

  return new;
end;
$$;

create function private.is_verified_governance_authority(target_authority_id uuid)
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
  );
$$;

create trigger import_batches_guard_update
before update on governance.import_batches
for each row execute function governance.guard_import_batch_update();

create trigger import_batches_reject_delete
before delete on governance.import_batches
for each row execute function governance.reject_historical_delete();

create trigger import_files_reject_update
before update on governance.import_files
for each row execute function governance.reject_import_ledger_update();

create trigger import_files_reject_delete
before delete on governance.import_files
for each row execute function governance.reject_historical_delete();

create trigger import_records_reject_update
before update on governance.import_records
for each row execute function governance.reject_import_ledger_update();

create trigger import_records_reject_delete
before delete on governance.import_records
for each row execute function governance.reject_historical_delete();

create trigger officer_assignments_guard_update
before update on governance.officer_assignments
for each row execute function governance.guard_version_update();

create trigger officer_assignments_reject_delete
before delete on governance.officer_assignments
for each row execute function governance.reject_historical_delete();

create trigger jurisdiction_boundaries_guard_update
before update on governance.jurisdiction_boundary_versions
for each row execute function governance.guard_version_update();

create trigger jurisdiction_boundaries_reject_delete
before delete on governance.jurisdiction_boundary_versions
for each row execute function governance.reject_historical_delete();

create trigger complaint_routing_references_guard_update
before update on governance.complaint_routing_references
for each row execute function governance.guard_version_update();

create trigger complaint_routing_references_reject_delete
before delete on governance.complaint_routing_references
for each row execute function governance.reject_historical_delete();

create trigger states_validate_authority_subtype
before insert or update of authority_id on governance.states
for each row execute function governance.validate_authority_subtype('state');

create trigger districts_validate_authority_subtype
before insert or update of authority_id on governance.districts
for each row execute function governance.validate_authority_subtype('district');

create trigger local_bodies_validate_authority_subtype
before insert or update of authority_id on governance.local_bodies
for each row execute function governance.validate_authority_subtype('local_body');

create trigger utilities_validate_authority_subtype
before insert or update of authority_id on governance.utilities
for each row execute function governance.validate_authority_subtype('utility');

create trigger offices_validate_scope
before insert or update of
  authority_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.offices
for each row execute function governance.validate_office_scope();

create trigger officer_assignments_validate_scope
before insert or update of
  authority_id,
  office_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id
on governance.officer_assignments
for each row execute function governance.validate_officer_assignment_scope();

create trigger local_body_districts_validate_scope
before insert or update of local_body_id, district_id
on governance.local_body_districts
for each row execute function governance.validate_local_body_district_scope();

create trigger administrative_units_validate_scope
before insert or update of parent_unit_id, state_id, district_id, taluka_id, local_body_id
on governance.administrative_units
for each row execute function governance.validate_administrative_unit_scope();

create trigger emergency_contacts_validate_scope
before insert or update of authority_id, state_id, district_id, local_body_id
on governance.emergency_contacts
for each row execute function governance.validate_emergency_contact_scope();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'reference_sources',
    'import_batches',
    'import_files',
    'import_records',
    'authorities',
    'states',
    'districts',
    'talukas',
    'local_bodies',
    'local_body_districts',
    'administrative_units',
    'wards',
    'departments',
    'authority_departments',
    'offices',
    'officer_roles',
    'officers',
    'officer_assignments',
    'utilities',
    'emergency_contacts',
    'jurisdiction_boundary_versions',
    'complaint_routing_references'
  ]
  loop
    execute format('alter table governance.%I enable row level security', table_name);
    execute format('alter table governance.%I force row level security', table_name);
  end loop;
end;
$$;

create policy reference_sources_select_active
on governance.reference_sources for select to authenticated
using (
  status = 'active'
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy import_batches_select_platform_admin
on governance.import_batches for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy import_files_select_platform_admin
on governance.import_files for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy import_records_select_platform_admin
on governance.import_records for select to authenticated
using ((select private.has_active_role('platform_admin', 'global', null)));

create policy authorities_select_verified_or_managed
on governance.authorities for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(id))
);

create policy states_select_verified_or_managed
on governance.states for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy districts_select_verified_or_managed
on governance.districts for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy talukas_select_verified_or_managed
on governance.talukas for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and exists (
      select 1 from governance.districts as public_district
      where public_district.id = talukas.district_id
        and (select private.is_verified_governance_authority(public_district.authority_id))
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.districts as district
    where district.id = talukas.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy local_bodies_select_verified_or_managed
on governance.local_bodies for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy local_body_districts_select_visible_or_managed
on governance.local_body_districts for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or
  exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = local_body_districts.local_body_id
      and (
        (
          local_body.status = 'active'
          and local_body.verification_status = 'verified'
          and not local_body.is_placeholder
          and (select private.is_verified_governance_authority(local_body.authority_id))
        )
        or (select private.can_manage_authority(local_body.authority_id))
      )
  )
);

create policy administrative_units_select_verified_or_managed
on governance.administrative_units for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (
      exists (
        select 1 from governance.local_bodies as public_local_body
        where public_local_body.id = administrative_units.local_body_id
          and (select private.is_verified_governance_authority(public_local_body.authority_id))
      )
      or exists (
        select 1 from governance.districts as public_district
        where public_district.id = administrative_units.district_id
          and (select private.is_verified_governance_authority(public_district.authority_id))
      )
      or (
        administrative_units.local_body_id is null
        and administrative_units.district_id is null
        and exists (
          select 1 from governance.states as public_state
          where public_state.id = administrative_units.state_id
            and (select private.is_verified_governance_authority(public_state.authority_id))
        )
      )
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = administrative_units.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
  or exists (
    select 1 from governance.districts as district
    where district.id = administrative_units.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy wards_select_verified_or_managed
on governance.wards for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and exists (
      select 1 from governance.local_bodies as public_local_body
      where public_local_body.id = wards.local_body_id
        and (select private.is_verified_governance_authority(public_local_body.authority_id))
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.local_bodies as local_body
    where local_body.id = wards.local_body_id
      and (select private.can_manage_authority(local_body.authority_id))
  )
);

create policy departments_select_verified_or_platform_admin
on governance.departments for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy authority_departments_select_verified_or_managed
on governance.authority_departments for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy offices_select_verified_or_managed
on governance.offices for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy officer_roles_select_verified_or_platform_admin
on governance.officer_roles for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy officers_select_managed
on governance.officers for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1 from governance.officer_assignments as assignment
    where assignment.officer_id = officers.id
      and (select private.can_manage_authority(assignment.authority_id))
  )
);

create policy officer_assignments_select_managed
on governance.officer_assignments for select to authenticated
using (
  (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy utilities_select_verified_or_managed
on governance.utilities for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and (select private.is_verified_governance_authority(authority_id))
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or (select private.can_manage_authority(authority_id))
);

create policy emergency_contacts_select_verified_or_managed
on governance.emergency_contacts for select to authenticated
using (
  (status = 'active' and verification_status = 'verified' and not is_placeholder)
  or (authority_id is not null and (select private.can_manage_authority(authority_id)))
  or (select private.has_active_role('platform_admin', 'global', null))
);

create policy jurisdiction_boundaries_select_current_or_managed
on governance.jurisdiction_boundary_versions for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
  )
  or (select private.has_active_role('platform_admin', 'global', null))
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
  or exists (
    select 1 from governance.districts as district
    where district.id = jurisdiction_boundary_versions.district_id
      and (select private.can_manage_authority(district.authority_id))
  )
);

create policy complaint_routing_references_select_verified_or_platform_admin
on governance.complaint_routing_references for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
  )
  or (select private.has_active_role('platform_admin', 'global', null))
);

revoke all privileges on schema governance from public, anon, authenticated, service_role;
revoke all privileges on all tables in schema governance from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema governance from public, anon, authenticated, service_role;

grant usage on schema governance to authenticated, service_role;

grant select on governance.reference_sources to authenticated;
grant select on governance.import_batches to authenticated;
grant select on governance.import_files to authenticated;
grant select on governance.import_records to authenticated;
grant select on governance.authorities to authenticated;
grant select on governance.states to authenticated;
grant select on governance.districts to authenticated;
grant select on governance.talukas to authenticated;
grant select on governance.local_bodies to authenticated;
grant select on governance.local_body_districts to authenticated;
grant select on governance.administrative_units to authenticated;
grant select on governance.wards to authenticated;
grant select on governance.departments to authenticated;
grant select on governance.authority_departments to authenticated;
grant select on governance.offices to authenticated;
grant select on governance.officer_roles to authenticated;
grant select on governance.officers to authenticated;
grant select on governance.officer_assignments to authenticated;
grant select on governance.utilities to authenticated;
grant select on governance.emergency_contacts to authenticated;
grant select on governance.jurisdiction_boundary_versions to authenticated;
grant select on governance.complaint_routing_references to authenticated;

grant select, insert, update on all tables in schema governance to service_role;

alter default privileges in schema governance revoke all on tables from public, anon, authenticated;
alter default privileges in schema governance revoke all on functions from public, anon, authenticated;

comment on function governance.reject_historical_delete() is
  'Rejects hard deletion of import ledgers and versioned governance history.';
comment on function governance.guard_version_update() is
  'Allows a version row to be closed or superseded without permitting in-place history rewrites.';
