create table governance.ward_administrative_zone_membership_versions (
  id uuid primary key default gen_random_uuid(),
  operational_ward_id uuid not null
    references governance.wards (id) on delete restrict,
  administrative_zone_id uuid not null
    references governance.administrative_units (id) on delete restrict,
  version integer not null,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid
    references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_zone_membership_version_check check (version >= 1),
  constraint ward_zone_membership_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint ward_zone_membership_verification_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint ward_zone_membership_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint ward_zone_membership_routing_check check (
    not is_routing_eligible
    or (status = 'active' and verification_status = 'verified' and not is_placeholder)
  ),
  constraint ward_zone_membership_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint ward_zone_membership_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint ward_zone_membership_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint ward_zone_membership_ward_version_unique unique (
    operational_ward_id,
    version
  )
);

create table governance.ward_boundary_crosswalk_versions (
  id uuid primary key default gen_random_uuid(),
  operational_ward_id uuid not null
    references governance.wards (id) on delete restrict,
  official_boundary_version_id uuid not null
    references governance.jurisdiction_boundary_versions (id) on delete restrict,
  version integer not null,
  relationship_type text not null,
  routing_instruction text not null,
  auto_route_allowed boolean not null default false,
  notes text,
  status text not null default 'draft',
  verification_status text not null default 'unverified',
  verification_notes text,
  is_placeholder boolean not null default false,
  is_routing_eligible boolean not null default false,
  effective_from timestamptz not null,
  effective_to timestamptz,
  last_verified_on date,
  reference_source_id uuid
    references governance.reference_sources (id) on delete restrict,
  import_record_id uuid references governance.import_records (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ward_boundary_crosswalk_version_check check (version >= 1),
  constraint ward_boundary_crosswalk_relationship_check check (
    relationship_type in ('one_to_one', 'one_to_many_child')
  ),
  constraint ward_boundary_crosswalk_instruction_check check (
    routing_instruction = btrim(routing_instruction)
    and char_length(routing_instruction) between 1 and 1000
  ),
  constraint ward_boundary_crosswalk_notes_check check (
    notes is null
    or (notes = btrim(notes) and char_length(notes) between 1 and 2000)
  ),
  constraint ward_boundary_crosswalk_auto_route_check check (
    not auto_route_allowed or relationship_type = 'one_to_one'
  ),
  constraint ward_boundary_crosswalk_status_check check (
    status in ('draft', 'active', 'inactive', 'superseded')
  ),
  constraint ward_boundary_crosswalk_verification_check check (
    verification_status in ('verified', 'partially_verified', 'unverified', 'placeholder')
  ),
  constraint ward_boundary_crosswalk_placeholder_check check (
    not is_placeholder or verification_status <> 'verified'
  ),
  constraint ward_boundary_crosswalk_routing_check check (
    not is_routing_eligible
    or (
      status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and auto_route_allowed
    )
  ),
  constraint ward_boundary_crosswalk_period_check check (
    effective_to is null or effective_to > effective_from
  ),
  constraint ward_boundary_crosswalk_closed_status_check check (
    status not in ('inactive', 'superseded') or effective_to is not null
  ),
  constraint ward_boundary_crosswalk_verified_provenance_check check (
    verification_status <> 'verified'
    or (last_verified_on is not null and reference_source_id is not null)
  ),
  constraint ward_boundary_crosswalk_ward_version_unique unique (
    operational_ward_id,
    version
  )
);

alter table governance.ward_administrative_zone_membership_versions
  add constraint ward_zone_membership_no_effective_overlap
  exclude using gist (
    operational_ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

alter table governance.ward_boundary_crosswalk_versions
  add constraint ward_boundary_crosswalk_no_effective_overlap
  exclude using gist (
    operational_ward_id with =,
    tstzrange(effective_from, effective_to, '[)') with &&
  ) where (status <> 'draft');

create unique index ward_zone_membership_one_current_idx
  on governance.ward_administrative_zone_membership_versions (operational_ward_id)
  where effective_to is null and status = 'active';
create index ward_zone_membership_zone_effective_idx
  on governance.ward_administrative_zone_membership_versions (
    administrative_zone_id,
    status,
    effective_from,
    effective_to
  );
create index ward_zone_membership_routing_idx
  on governance.ward_administrative_zone_membership_versions (
    operational_ward_id,
    status,
    is_routing_eligible,
    effective_from,
    effective_to
  );

create unique index ward_boundary_crosswalk_one_current_idx
  on governance.ward_boundary_crosswalk_versions (operational_ward_id)
  where effective_to is null and status = 'active';
create index ward_boundary_crosswalk_boundary_effective_idx
  on governance.ward_boundary_crosswalk_versions (
    official_boundary_version_id,
    status,
    effective_from,
    effective_to
  );
create index ward_boundary_crosswalk_routing_idx
  on governance.ward_boundary_crosswalk_versions (
    operational_ward_id,
    status,
    is_routing_eligible,
    auto_route_allowed,
    effective_from,
    effective_to
  );

create function governance.validate_ward_zone_membership_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operational_ward governance.wards%rowtype;
  administrative_zone governance.administrative_units%rowtype;
begin
  select ward.* into operational_ward
  from governance.wards as ward
  where ward.id = new.operational_ward_id;

  select administrative_unit.* into administrative_zone
  from governance.administrative_units as administrative_unit
  where administrative_unit.id = new.administrative_zone_id;

  if operational_ward.id is null
    or administrative_zone.id is null
    or administrative_zone.unit_type <> 'zone'
    or administrative_zone.local_body_id is null
    or administrative_zone.local_body_id <> operational_ward.local_body_id then
    raise exception using
      errcode = '23514',
      message = 'WARD_ZONE_MEMBERSHIP_SCOPE_INVALID';
  end if;

  if new.is_routing_eligible and (
    operational_ward.status <> 'active'
    or operational_ward.verification_status <> 'verified'
    or operational_ward.is_placeholder
    or not operational_ward.is_routing_eligible
    or administrative_zone.status <> 'active'
    or administrative_zone.verification_status <> 'verified'
    or administrative_zone.is_placeholder
    or not administrative_zone.is_routing_eligible
    or not exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.id = operational_ward.local_body_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'WARD_ZONE_MEMBERSHIP_ROUTING_SCOPE_UNVERIFIED';
  end if;

  return new;
end;
$$;

create function governance.validate_ward_boundary_crosswalk_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operational_ward governance.wards%rowtype;
  official_boundary governance.jurisdiction_boundary_versions%rowtype;
  boundary_ward governance.wards%rowtype;
begin
  select ward.* into operational_ward
  from governance.wards as ward
  where ward.id = new.operational_ward_id;

  select boundary_version.* into official_boundary
  from governance.jurisdiction_boundary_versions as boundary_version
  where boundary_version.id = new.official_boundary_version_id;

  if official_boundary.ward_id is not null then
    select ward.* into boundary_ward
    from governance.wards as ward
    where ward.id = official_boundary.ward_id;
  end if;

  if operational_ward.id is null
    or official_boundary.id is null
    or official_boundary.ward_id is null
    or boundary_ward.id is null
    or boundary_ward.local_body_id <> operational_ward.local_body_id then
    raise exception using
      errcode = '23514',
      message = 'WARD_BOUNDARY_CROSSWALK_SCOPE_INVALID';
  end if;

  if new.is_routing_eligible and (
    not new.auto_route_allowed
    or new.relationship_type <> 'one_to_one'
    or operational_ward.status <> 'active'
    or operational_ward.verification_status <> 'verified'
    or operational_ward.is_placeholder
    or not operational_ward.is_routing_eligible
    or boundary_ward.status <> 'active'
    or boundary_ward.verification_status <> 'verified'
    or boundary_ward.is_placeholder
    or not boundary_ward.is_routing_eligible
    or official_boundary.status <> 'active'
    or official_boundary.verification_status <> 'verified'
    or official_boundary.is_placeholder
    or not official_boundary.is_routing_eligible
    or official_boundary.effective_from > new.effective_from
    or (
      official_boundary.effective_to is not null
      and official_boundary.effective_to <= new.effective_from
    )
    or not exists (
      select 1
      from governance.local_bodies as local_body
      inner join governance.authorities as authority
        on authority.id = local_body.authority_id
      where local_body.id = operational_ward.local_body_id
        and local_body.status = 'active'
        and local_body.verification_status = 'verified'
        and not local_body.is_placeholder
        and local_body.is_routing_eligible
        and authority.status = 'active'
        and authority.verification_status = 'verified'
        and not authority.is_placeholder
        and authority.is_routing_eligible
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'WARD_BOUNDARY_CROSSWALK_ROUTING_SCOPE_UNVERIFIED';
  end if;

  return new;
end;
$$;

create trigger ward_zone_membership_versions_guard_update
before update on governance.ward_administrative_zone_membership_versions
for each row execute function governance.guard_version_update();
create trigger ward_zone_membership_versions_reject_delete
before delete on governance.ward_administrative_zone_membership_versions
for each row execute function governance.reject_historical_delete();
create trigger ward_zone_membership_versions_set_updated_at
before update on governance.ward_administrative_zone_membership_versions
for each row execute function private.set_updated_at();
create trigger ward_zone_membership_versions_validate
before insert or update on governance.ward_administrative_zone_membership_versions
for each row execute function governance.validate_ward_zone_membership_version();

create trigger ward_boundary_crosswalk_versions_guard_update
before update on governance.ward_boundary_crosswalk_versions
for each row execute function governance.guard_version_update();
create trigger ward_boundary_crosswalk_versions_reject_delete
before delete on governance.ward_boundary_crosswalk_versions
for each row execute function governance.reject_historical_delete();
create trigger ward_boundary_crosswalk_versions_set_updated_at
before update on governance.ward_boundary_crosswalk_versions
for each row execute function private.set_updated_at();
create trigger ward_boundary_crosswalk_versions_validate
before insert or update on governance.ward_boundary_crosswalk_versions
for each row execute function governance.validate_ward_boundary_crosswalk_version();

alter table governance.ward_administrative_zone_membership_versions
  enable row level security;
alter table governance.ward_administrative_zone_membership_versions
  force row level security;
alter table governance.ward_boundary_crosswalk_versions enable row level security;
alter table governance.ward_boundary_crosswalk_versions force row level security;

create policy ward_zone_membership_select_current_or_managed
on governance.ward_administrative_zone_membership_versions
for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and exists (
      select 1
      from governance.wards as ward
      inner join governance.local_bodies as local_body
        on local_body.id = ward.local_body_id
      where ward.id = operational_ward_id
        and private.is_verified_governance_authority(local_body.authority_id)
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body
      on local_body.id = ward.local_body_id
    where ward.id = operational_ward_id
      and private.can_manage_authority(local_body.authority_id)
  )
);

create policy ward_boundary_crosswalk_select_current_or_managed
on governance.ward_boundary_crosswalk_versions
for select to authenticated
using (
  (
    status = 'active'
    and verification_status = 'verified'
    and not is_placeholder
    and effective_from <= current_timestamp
    and (effective_to is null or effective_to > current_timestamp)
    and exists (
      select 1
      from governance.wards as ward
      inner join governance.local_bodies as local_body
        on local_body.id = ward.local_body_id
      where ward.id = operational_ward_id
        and private.is_verified_governance_authority(local_body.authority_id)
    )
  )
  or (select private.has_active_role('platform_admin', 'global', null))
  or exists (
    select 1
    from governance.wards as ward
    inner join governance.local_bodies as local_body
      on local_body.id = ward.local_body_id
    where ward.id = operational_ward_id
      and private.can_manage_authority(local_body.authority_id)
  )
);

revoke all on governance.ward_administrative_zone_membership_versions
from public, anon, authenticated, service_role;
revoke all on governance.ward_boundary_crosswalk_versions
from public, anon, authenticated, service_role;
grant select on governance.ward_administrative_zone_membership_versions
to authenticated;
grant select on governance.ward_boundary_crosswalk_versions to authenticated;
grant select, insert, update
on governance.ward_administrative_zone_membership_versions to service_role;
grant select, insert, update
on governance.ward_boundary_crosswalk_versions to service_role;

revoke all on function governance.validate_ward_zone_membership_version()
from public, anon, authenticated, service_role;
revoke all on function governance.validate_ward_boundary_crosswalk_version()
from public, anon, authenticated, service_role;

comment on table governance.ward_administrative_zone_membership_versions is
  'Append-only effective-dated membership of an operational municipal ward in one normalized administrative zone.';
comment on column governance.ward_administrative_zone_membership_versions.administrative_zone_id is
  'References an administrative_units row whose unit_type is zone and whose local body matches the operational ward.';
comment on table governance.ward_boundary_crosswalk_versions is
  'Append-only effective-dated crosswalk from an operational ward to the exact official ward-boundary feature version used for location resolution.';
comment on column governance.ward_boundary_crosswalk_versions.official_boundary_version_id is
  'References the immutable jurisdiction_boundary_versions row containing the official source geometry feature.';
comment on column governance.ward_boundary_crosswalk_versions.auto_route_allowed is
  'Explicit source-reviewed gate for automatic routing. Split legacy polygons remain false until a distinct approved child boundary exists.';
comment on function governance.validate_ward_zone_membership_version() is
  'Requires ward and administrative-zone scopes to belong to the same local body and verifies routing dependencies before activation.';
comment on function governance.validate_ward_boundary_crosswalk_version() is
  'Requires a same-local-body ward boundary feature and blocks routing activation unless the mapping is verified one-to-one and explicitly approved.';
