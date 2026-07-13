begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(14);

insert into governance.reference_sources (
  id,
  title,
  url,
  source_type,
  last_checked_on
)
values (
  '70000000-0000-4000-8000-000000000001',
  'Synthetic pgTAP spatial fixture',
  'https://example.test/governance-spatial-fixture',
  'repository',
  date '2026-07-13'
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
    '71000000-0000-4000-8000-000000000001',
    null,
    'TEST_SPATIAL_STATE',
    'Spatial Test State',
    'state',
    'verified',
    false,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000001',
    'TEST_SPATIAL_DISTRICT',
    'Spatial Test District',
    'district',
    'verified',
    false,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000002',
    'TEST_SPATIAL_LOCAL_BODY',
    'Spatial Test Local Body',
    'local_body',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '71000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000002',
    'TEST_HISTORIC_LOCAL_BODY',
    'Historic Test Local Body',
    'local_body',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id,
  authority_id,
  name,
  iso_code,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'Spatial Test State',
  'TS',
  'verified',
  date '2026-07-13',
  '70000000-0000-4000-8000-000000000001'
);

insert into governance.districts (
  id,
  authority_id,
  state_id,
  name,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '73000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '72000000-0000-4000-8000-000000000001',
  'Spatial Test District',
  'verified',
  date '2026-07-13',
  '70000000-0000-4000-8000-000000000001'
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
values
  (
    '74000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000003',
    '72000000-0000-4000-8000-000000000001',
    'Spatial Test Local Body',
    'municipal_corporation',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '74000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000004',
    '72000000-0000-4000-8000-000000000001',
    'Historic Test Local Body',
    'municipal_council',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  );

insert into governance.local_body_districts (local_body_id, district_id, is_primary)
values
  (
    '74000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000001',
    true
  ),
  (
    '74000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000001',
    true
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
    '75000000-0000-4000-8000-000000000001',
    '74000000-0000-4000-8000-000000000001',
    'TEST-WARD-A',
    'Test Ward A',
    'A',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '75000000-0000-4000-8000-000000000002',
    '74000000-0000-4000-8000-000000000001',
    'TEST-WARD-B',
    'Test Ward B',
    'B',
    'verified',
    true,
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id,
  local_body_id,
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
  '76000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000001',
  1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((0 0,10 0,10 10,0 10,0 0)))',
    4326
  ),
  'active',
  'verified',
  true,
  timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13',
  '70000000-0000-4000-8000-000000000001'
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
values
  (
    '76000000-0000-4000-8000-000000000002',
    '75000000-0000-4000-8000-000000000001',
    1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((0 0,5 0,5 10,0 10,0 0)))',
      4326
    ),
    'active',
    'verified',
    true,
    timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  ),
  (
    '76000000-0000-4000-8000-000000000003',
    '75000000-0000-4000-8000-000000000002',
    1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((5 0,10 0,10 10,5 10,5 0)))',
      4326
    ),
    'active',
    'verified',
    true,
    timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13',
    '70000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id,
  local_body_id,
  version,
  boundary,
  status,
  verification_status,
  is_routing_eligible,
  effective_from,
  effective_to,
  last_verified_on,
  reference_source_id
)
values (
  '76000000-0000-4000-8000-000000000004',
  '74000000-0000-4000-8000-000000000002',
  1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((20 20,25 20,25 25,20 25,20 20)))',
    4326
  ),
  'inactive',
  'verified',
  false,
  timestamptz '2024-01-01 00:00:00+00',
  timestamptz '2025-01-01 00:00:00+00',
  date '2026-07-13',
  '70000000-0000-4000-8000-000000000001'
);

select ok(
  to_regprocedure(
    'governance.resolve_jurisdiction(double precision,double precision,timestamptz)'
  ) is not null,
  'jurisdiction resolver exists'
);
select is(
  (
    select resolved.local_body_id
    from governance.resolve_jurisdiction(2, 2, timestamptz '2026-07-13 12:00:00+00') as resolved
  ),
  '74000000-0000-4000-8000-000000000001'::uuid,
  'an interior point resolves to its local body'
);
select is(
  (
    select resolved.ward_id
    from governance.resolve_jurisdiction(2, 2, timestamptz '2026-07-13 12:00:00+00') as resolved
  ),
  '75000000-0000-4000-8000-000000000001'::uuid,
  'an interior point resolves to its ward'
);
select is(
  (
    select count(*)::integer
    from governance.resolve_jurisdiction(5, 2, timestamptz '2026-07-13 12:00:00+00')
  ),
  2,
  'ST_Covers includes a point on the shared edge of both ward polygons'
);
select is(
  (
    select count(*)::integer
    from governance.resolve_jurisdiction(5, 2, timestamptz '2026-07-13 12:00:00+00')
    where ward_boundary_version_id is not null
  ),
  2,
  'edge matches preserve both explicit ward boundary version identifiers'
);
update governance.authorities
set status = 'inactive', is_routing_eligible = false
where id = '71000000-0000-4000-8000-000000000003';
select is(
  (
    select count(*)::integer
    from governance.resolve_jurisdiction(2, 2, timestamptz '2026-07-13 12:00:00+00')
  ),
  0,
  'an inactive canonical authority prevents otherwise-valid local-body routing'
);
update governance.authorities
set status = 'active', is_routing_eligible = true
where id = '71000000-0000-4000-8000-000000000003';
select is(
  (
    select count(*)::integer
    from governance.resolve_jurisdiction(40, 40, timestamptz '2026-07-13 12:00:00+00')
  ),
  0,
  'a point outside every active local-body polygon does not resolve'
);
select throws_ok(
  $$select * from governance.resolve_jurisdiction(181, 0, current_timestamp)$$,
  '22023',
  'JURISDICTION_COORDINATES_INVALID',
  'invalid longitude is rejected clearly'
);
select throws_ok(
  $$select * from governance.resolve_jurisdiction(0, -91, current_timestamp)$$,
  '22023',
  'JURISDICTION_COORDINATES_INVALID',
  'invalid latitude is rejected clearly'
);
select is(
  (
    select count(*)::integer
    from governance.resolve_jurisdiction(21, 21, timestamptz '2026-07-13 12:00:00+00')
  ),
  0,
  'inactive historic boundaries never participate in current resolution'
);
select is(
  (
    select count(*)::integer
    from governance.jurisdiction_boundary_versions
    where id = '76000000-0000-4000-8000-000000000004'
      and status = 'inactive'
      and effective_to is not null
  ),
  1,
  'inactive historic boundaries remain queryable'
);
select throws_ok(
  $$
    insert into governance.jurisdiction_boundary_versions (
      state_id,
      local_body_id,
      version,
      boundary,
      status,
      effective_from
    ) values (
      '72000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000001',
      99,
      extensions.st_geomfromtext(
        'MULTIPOLYGON(((30 30,31 30,31 31,30 31,30 30)))',
        4326
      ),
      'draft',
      current_timestamp
    )
  $$,
  '23514',
  'new row for relation "jurisdiction_boundary_versions" violates check constraint "jurisdiction_boundaries_exactly_one_scope_check"',
  'a boundary version cannot target more than one jurisdiction scope'
);
select throws_ok(
  $$
    insert into governance.jurisdiction_boundary_versions (
      local_body_id,
      version,
      boundary,
      status,
      effective_from
    ) values (
      '74000000-0000-4000-8000-000000000001',
      99,
      extensions.st_geomfromtext(
        'MULTIPOLYGON(((0 0,2 2,0 2,2 0,0 0)))',
        4326
      ),
      'draft',
      current_timestamp
    )
  $$,
  '23514',
  'new row for relation "jurisdiction_boundary_versions" violates check constraint "jurisdiction_boundaries_valid_geometry_check"',
  'an invalid self-intersecting jurisdiction geometry is rejected'
);
select throws_ok(
  $$
    insert into governance.jurisdiction_boundary_versions (
      local_body_id,
      version,
      boundary,
      status,
      effective_from
    ) values (
      '74000000-0000-4000-8000-000000000001',
      100,
      extensions.st_geomfromtext(
        'MULTIPOLYGON(((181 0,182 0,182 1,181 1,181 0)))',
        4326
      ),
      'draft',
      current_timestamp
    )
  $$,
  '23514',
  'new row for relation "jurisdiction_boundary_versions" violates check constraint "jurisdiction_boundaries_coordinate_envelope_check"',
  'a boundary outside the valid longitude envelope is rejected'
);

select * from finish();
rollback;
