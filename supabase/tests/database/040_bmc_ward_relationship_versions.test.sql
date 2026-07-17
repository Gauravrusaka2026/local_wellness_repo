begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(39);

select has_table(
  'governance',
  'ward_administrative_zone_membership_versions',
  'ward-to-zone memberships are normalized and versioned'
);
select has_table(
  'governance',
  'ward_boundary_crosswalk_versions',
  'operational-ward boundary crosswalks are normalized and versioned'
);
select has_column(
  'governance',
  'ward_administrative_zone_membership_versions',
  'operational_ward_id',
  'ward-zone versions identify the operational ward'
);
select has_column(
  'governance',
  'ward_administrative_zone_membership_versions',
  'administrative_zone_id',
  'ward-zone versions reference a normalized administrative zone'
);
select has_column(
  'governance',
  'ward_administrative_zone_membership_versions',
  'version',
  'ward-zone versions carry a monotonic version number'
);
select has_column(
  'governance',
  'ward_administrative_zone_membership_versions',
  'is_routing_eligible',
  'ward-zone versions carry the standard routing activation gate'
);
select has_column(
  'governance',
  'ward_boundary_crosswalk_versions',
  'operational_ward_id',
  'crosswalk versions identify the operational ward'
);
select has_column(
  'governance',
  'ward_boundary_crosswalk_versions',
  'official_boundary_version_id',
  'crosswalk versions reference the exact official boundary feature version'
);
select has_column(
  'governance',
  'ward_boundary_crosswalk_versions',
  'relationship_type',
  'crosswalk versions preserve one-to-one versus split semantics'
);
select has_column(
  'governance',
  'ward_boundary_crosswalk_versions',
  'auto_route_allowed',
  'crosswalk versions explicitly gate automatic routing'
);
select col_type_is(
  'governance',
  'ward_boundary_crosswalk_versions',
  'auto_route_allowed',
  'boolean',
  'the automatic routing gate is boolean'
);
select has_index(
  'governance',
  'ward_administrative_zone_membership_versions',
  'ward_zone_membership_one_current_idx',
  'only one current active zone membership can exist per operational ward'
);
select has_index(
  'governance',
  'ward_boundary_crosswalk_versions',
  'ward_boundary_crosswalk_one_current_idx',
  'only one current active boundary crosswalk can exist per operational ward'
);
select ok(
  not exists (
    select 1
    from pg_class as relation
    inner join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'governance'
      and relation.relname in (
        'ward_administrative_zone_membership_versions',
        'ward_boundary_crosswalk_versions'
      )
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ),
  'both relationship tables enforce RLS'
);
select ok(not has_table_privilege(
  'anon',
  'governance.ward_administrative_zone_membership_versions',
  'select'
));
select ok(not has_table_privilege(
  'anon',
  'governance.ward_boundary_crosswalk_versions',
  'select'
));
select ok(has_table_privilege(
  'authenticated',
  'governance.ward_administrative_zone_membership_versions',
  'select'
));
select ok(has_table_privilege(
  'authenticated',
  'governance.ward_boundary_crosswalk_versions',
  'select'
));
select ok(not has_table_privilege(
  'authenticated',
  'governance.ward_administrative_zone_membership_versions',
  'insert'
));
select ok(not has_table_privilege(
  'authenticated',
  'governance.ward_boundary_crosswalk_versions',
  'insert'
));
select ok(not has_table_privilege(
  'authenticated',
  'governance.ward_administrative_zone_membership_versions',
  'update'
));
select ok(not has_table_privilege(
  'authenticated',
  'governance.ward_boundary_crosswalk_versions',
  'update'
));
select ok(
  has_table_privilege(
    'service_role',
    'governance.ward_administrative_zone_membership_versions',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'governance.ward_administrative_zone_membership_versions',
    'insert'
  )
  and has_table_privilege(
    'service_role',
    'governance.ward_administrative_zone_membership_versions',
    'update'
  )
  and not has_table_privilege(
    'service_role',
    'governance.ward_administrative_zone_membership_versions',
    'delete'
  ),
  'service role can append and close ward-zone versions but cannot delete history'
);
select ok(
  has_table_privilege(
    'service_role',
    'governance.ward_boundary_crosswalk_versions',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'governance.ward_boundary_crosswalk_versions',
    'insert'
  )
  and has_table_privilege(
    'service_role',
    'governance.ward_boundary_crosswalk_versions',
    'update'
  )
  and not has_table_privilege(
    'service_role',
    'governance.ward_boundary_crosswalk_versions',
    'delete'
  ),
  'service role can append and close crosswalk versions but cannot delete history'
);
select has_function(
  'governance',
  'validate_ward_zone_membership_version',
  array[]::text[]
);
select has_function(
  'governance',
  'validate_ward_boundary_crosswalk_version',
  array[]::text[]
);
select has_trigger(
  'governance',
  'ward_administrative_zone_membership_versions',
  'ward_zone_membership_versions_guard_update',
  'ward-zone history rejects in-place content rewrites'
);
select has_trigger(
  'governance',
  'ward_boundary_crosswalk_versions',
  'ward_boundary_crosswalk_versions_guard_update',
  'crosswalk history rejects in-place content rewrites'
);

insert into governance.reference_sources (
  id,
  title,
  url,
  source_type,
  last_checked_on
)
values (
  'f4000000-0000-4000-8000-000000000001',
  'BMC relationship pgTAP fixture',
  'https://example.test/bmc-ward-relationships',
  'official',
  date '2026-07-17'
);

insert into governance.authorities (
  id,
  parent_authority_id,
  code,
  name,
  authority_type,
  verification_status,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values
  (
    'f4000000-0000-4000-8000-000000000010',
    null,
    'BMC_REL_TEST_STATE',
    'BMC Relationship Test State',
    'state',
    'verified',
    true,
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  ),
  (
    'f4000000-0000-4000-8000-000000000011',
    'f4000000-0000-4000-8000-000000000010',
    'BMC_REL_TEST_LOCAL_BODY',
    'BMC Relationship Test Local Body',
    'local_body',
    'verified',
    true,
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id,
  authority_id,
  name,
  iso_code,
  verification_status,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000020',
  'f4000000-0000-4000-8000-000000000010',
  'BMC Relationship Test State',
  'ZX',
  'verified',
  true,
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id,
  authority_id,
  state_id,
  name,
  body_type,
  verification_status,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000030',
  'f4000000-0000-4000-8000-000000000011',
  'f4000000-0000-4000-8000-000000000020',
  'BMC Relationship Test Local Body',
  'municipal_corporation',
  'verified',
  true,
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.administrative_units (
  id,
  state_id,
  local_body_id,
  name,
  unit_type,
  verification_status,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000040',
  'f4000000-0000-4000-8000-000000000020',
  'f4000000-0000-4000-8000-000000000030',
  'BMC Relationship Test Zone I',
  'zone',
  'verified',
  true,
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.wards (
  id,
  local_body_id,
  source_ward_code,
  name,
  ward_number,
  verification_status,
  is_routing_eligible,
  last_verified_on,
  reference_source_id
)
values
  (
    'f4000000-0000-4000-8000-000000000050',
    'f4000000-0000-4000-8000-000000000030',
    'BMC-REL-OP-A',
    'BMC Relationship Operational A Ward',
    'A-OP',
    'verified',
    true,
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  ),
  (
    'f4000000-0000-4000-8000-000000000051',
    'f4000000-0000-4000-8000-000000000030',
    'BMC-REL-GEO-A',
    'BMC Relationship Official A Boundary Feature',
    'A-GEO',
    'verified',
    true,
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id,
  ward_id,
  version,
  boundary,
  status,
  verification_status,
  is_routing_eligible,
  effective_from,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000060',
  'f4000000-0000-4000-8000-000000000051',
  1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((72.80 19.00,72.81 19.00,72.81 19.01,72.80 19.01,72.80 19.00)))',
    4326
  ),
  'active',
  'verified',
  true,
  timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.ward_administrative_zone_membership_versions (
  id,
  operational_ward_id,
  administrative_zone_id,
  version,
  status,
  verification_status,
  is_routing_eligible,
  effective_from,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000070',
  'f4000000-0000-4000-8000-000000000050',
  'f4000000-0000-4000-8000-000000000040',
  1,
  'active',
  'verified',
  true,
  timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.ward_boundary_crosswalk_versions (
  id,
  operational_ward_id,
  official_boundary_version_id,
  version,
  relationship_type,
  routing_instruction,
  auto_route_allowed,
  status,
  verification_status,
  is_routing_eligible,
  effective_from,
  last_verified_on,
  reference_source_id
)
values (
  'f4000000-0000-4000-8000-000000000080',
  'f4000000-0000-4000-8000-000000000050',
  'f4000000-0000-4000-8000-000000000060',
  1,
  'one_to_one',
  'Use official A geometry and operational A ward office.',
  true,
  'active',
  'verified',
  true,
  timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-17',
  'f4000000-0000-4000-8000-000000000001'
);

insert into governance.ward_administrative_zone_membership_versions (
  id,
  operational_ward_id,
  administrative_zone_id,
  version,
  effective_from
)
values (
  'f4000000-0000-4000-8000-000000000071',
  'f4000000-0000-4000-8000-000000000050',
  'f4000000-0000-4000-8000-000000000040',
  2,
  timestamptz '2027-01-01 00:00:00+00'
);

insert into governance.ward_boundary_crosswalk_versions (
  id,
  operational_ward_id,
  official_boundary_version_id,
  version,
  relationship_type,
  routing_instruction,
  auto_route_allowed,
  effective_from
)
values (
  'f4000000-0000-4000-8000-000000000081',
  'f4000000-0000-4000-8000-000000000050',
  'f4000000-0000-4000-8000-000000000060',
  2,
  'one_to_many_child',
  'Require reviewed child geometry before selecting an operational ward.',
  false,
  timestamptz '2027-01-01 00:00:00+00'
);

select is(
  (
    select count(*)
    from governance.ward_administrative_zone_membership_versions
    where operational_ward_id = 'f4000000-0000-4000-8000-000000000050'
      and status = 'active'
      and is_routing_eligible
  ),
  1::bigint,
  'one active routing-eligible ward-zone membership is stored'
);
select is(
  (
    select count(*)
    from governance.ward_boundary_crosswalk_versions
    where operational_ward_id = 'f4000000-0000-4000-8000-000000000050'
      and status = 'active'
      and auto_route_allowed
      and is_routing_eligible
  ),
  1::bigint,
  'one reviewed one-to-one automatic crosswalk is stored'
);
select throws_ok($$
  insert into governance.ward_boundary_crosswalk_versions (
    operational_ward_id,
    official_boundary_version_id,
    version,
    relationship_type,
    routing_instruction,
    auto_route_allowed,
    effective_from
  ) values (
    'f4000000-0000-4000-8000-000000000050',
    'f4000000-0000-4000-8000-000000000060',
    3,
    'one_to_many_child',
    'Unsafe automatic child selection.',
    true,
    timestamptz '2028-01-01 00:00:00+00'
  )
$$);
select throws_ok($$
  insert into governance.ward_administrative_zone_membership_versions (
    operational_ward_id,
    administrative_zone_id,
    version,
    status,
    verification_status,
    is_routing_eligible,
    effective_from,
    last_verified_on,
    reference_source_id
  ) values (
    'f4000000-0000-4000-8000-000000000050',
    'f4000000-0000-4000-8000-000000000040',
    3,
    'active',
    'verified',
    true,
    timestamptz '2026-06-01 00:00:00+00',
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  )
$$);
select throws_ok($$
  insert into governance.ward_boundary_crosswalk_versions (
    operational_ward_id,
    official_boundary_version_id,
    version,
    relationship_type,
    routing_instruction,
    auto_route_allowed,
    status,
    verification_status,
    is_routing_eligible,
    effective_from,
    last_verified_on,
    reference_source_id
  ) values (
    'f4000000-0000-4000-8000-000000000050',
    'f4000000-0000-4000-8000-000000000060',
    3,
    'one_to_one',
    'Overlapping automatic route.',
    true,
    'active',
    'verified',
    true,
    timestamptz '2026-06-01 00:00:00+00',
    date '2026-07-17',
    'f4000000-0000-4000-8000-000000000001'
  )
$$);
select throws_ok($$
  update governance.ward_administrative_zone_membership_versions
  set verification_notes = 'In-place rewrite is forbidden.'
  where id = 'f4000000-0000-4000-8000-000000000070'
$$);
select throws_ok($$
  update governance.ward_boundary_crosswalk_versions
  set routing_instruction = 'In-place rewrite is forbidden.'
  where id = 'f4000000-0000-4000-8000-000000000080'
$$);
select throws_ok($$
  delete from governance.ward_administrative_zone_membership_versions
  where id = 'f4000000-0000-4000-8000-000000000070'
$$);
select throws_ok($$
  delete from governance.ward_boundary_crosswalk_versions
  where id = 'f4000000-0000-4000-8000-000000000080'
$$);

set local role authenticated;
select is(
  (
    select count(*)
    from governance.ward_administrative_zone_membership_versions
    where operational_ward_id = 'f4000000-0000-4000-8000-000000000050'
  ),
  1::bigint,
  'authenticated readers see the verified active membership but not its draft successor'
);
select is(
  (
    select count(*)
    from governance.ward_boundary_crosswalk_versions
    where operational_ward_id = 'f4000000-0000-4000-8000-000000000050'
  ),
  1::bigint,
  'authenticated readers see the verified active crosswalk but not its draft successor'
);
reset role;

select * from finish();
rollback;
