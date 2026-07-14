begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(21);

select ok(
  to_regprocedure(
    'public.discover_routing_assets(uuid,double precision,double precision,double precision,timestamp with time zone,integer)'
  ) is not null,
  'service-only routing asset discovery RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.discover_routing_assets(uuid,double precision,double precision,double precision,timestamp with time zone,integer)',
    'execute'
  ),
  'anonymous clients cannot discover routing assets directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.discover_routing_assets(uuid,double precision,double precision,double precision,timestamp with time zone,integer)',
    'execute'
  ),
  'authenticated clients cannot bypass the API asset-discovery boundary'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.discover_routing_assets(uuid,double precision,double precision,double precision,timestamp with time zone,integer)',
    'execute'
  ),
  'the service role can invoke routing asset discovery'
);

insert into governance.reference_sources (
  id, title, url, source_type, last_checked_on
)
values (
  'a1000000-0000-4000-8000-000000000001',
  'Synthetic asset discovery fixture',
  'https://example.test/asset-discovery',
  'official',
  date '2026-07-14'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a1100000-0000-4000-8000-000000000001', null, 'ASSET_DISCOVERY_STATE',
    'Asset Discovery State', 'state', 'verified', true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1100000-0000-4000-8000-000000000002',
    'a1100000-0000-4000-8000-000000000001', 'ASSET_DISCOVERY_LOCAL_BODY',
    'Asset Discovery Local Body', 'local_body', 'verified', true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'a1200000-0000-4000-8000-000000000001',
  'a1100000-0000-4000-8000-000000000001',
  'Asset Discovery State', 'AD', 'verified', true, date '2026-07-14',
  'a1000000-0000-4000-8000-000000000001'
);

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  'a1300000-0000-4000-8000-000000000001',
  'a1100000-0000-4000-8000-000000000002',
  'a1200000-0000-4000-8000-000000000001',
  'Asset Discovery Local Body', 'municipal_corporation', 'verified', true,
  date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, local_body_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  'a1400000-0000-4000-8000-000000000001',
  'a1300000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
);

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  'a1500000-0000-4000-8000-000000000001', 'asset_discovery_domain',
  'Asset Discovery Domain', 'active', 'verified', true, date '2026-07-14',
  'a1000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, requires_asset, status, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a1600000-0000-4000-8000-000000000001',
    'a1500000-0000-4000-8000-000000000001', 'asset_discovery_required',
    'Asset Discovery Required', true, 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1600000-0000-4000-8000-000000000002',
    'a1500000-0000-4000-8000-000000000001', 'asset_discovery_optional',
    'Asset Discovery Optional', false, 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1600000-0000-4000-8000-000000000003',
    'a1500000-0000-4000-8000-000000000001', 'asset_discovery_placeholder',
    'Asset Discovery Placeholder', true, 'draft', 'placeholder', true, false, null,
    'a1000000-0000-4000-8000-000000000001'
  );

insert into routing.asset_types (
  id, code, name, matching_distance_meters, status, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a1700000-0000-4000-8000-000000000001', 'asset_discovery_type',
    'Verified Asset Type', 100, 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1700000-0000-4000-8000-000000000002', 'asset_discovery_quarantined_type',
    'Quarantined Asset Type', 100, 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into routing.category_asset_types (
  id, category_id, asset_type_id, requirement, status, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a1800000-0000-4000-8000-000000000001',
    'a1600000-0000-4000-8000-000000000001',
    'a1700000-0000-4000-8000-000000000001', 'required',
    'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1800000-0000-4000-8000-000000000002',
    'a1600000-0000-4000-8000-000000000002',
    'a1700000-0000-4000-8000-000000000001', 'optional',
    'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1800000-0000-4000-8000-000000000003',
    'a1600000-0000-4000-8000-000000000001',
    'a1700000-0000-4000-8000-000000000002', 'required',
    'draft', 'placeholder', true, false, null,
    'a1000000-0000-4000-8000-000000000001'
  );

insert into routing.assets (
  id, asset_type_id, asset_key, display_name, status, verification_status,
  is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    'a1900000-0000-4000-8000-000000000001',
    'a1700000-0000-4000-8000-000000000001', 'asset:discovery:verified',
    'Verified Asset 24', 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1900000-0000-4000-8000-000000000002',
    'a1700000-0000-4000-8000-000000000001', 'asset:discovery:distant',
    'Distant Asset', 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1900000-0000-4000-8000-000000000003',
    'a1700000-0000-4000-8000-000000000001', 'asset:discovery:placeholder',
    'Placeholder Asset', 'draft', 'placeholder', true, false, null,
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1900000-0000-4000-8000-000000000004',
    'a1700000-0000-4000-8000-000000000001', 'asset:discovery:unowned',
    'Unverified Ownership Asset', 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1900000-0000-4000-8000-000000000005',
    'a1700000-0000-4000-8000-000000000002', 'asset:discovery:quarantined-map',
    'Quarantined Mapping Asset', 'active', 'verified', false, true, date '2026-07-14',
    'a1000000-0000-4000-8000-000000000001'
  );

insert into routing.asset_versions (
  id, asset_id, version, local_body_id, location, status, verification_status,
  is_placeholder, is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values
  (
    'a1a00000-0000-4000-8000-000000000001',
    'a1900000-0000-4000-8000-000000000001', 1,
    'a1300000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    'active', 'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1a00000-0000-4000-8000-000000000002',
    'a1900000-0000-4000-8000-000000000002', 1,
    'a1300000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.86, 18.56), 4326),
    'active', 'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1a00000-0000-4000-8000-000000000003',
    'a1900000-0000-4000-8000-000000000003', 1,
    'a1300000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    'draft', 'placeholder', true, false, timestamptz '2026-01-01 00:00:00+00',
    null, 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1a00000-0000-4000-8000-000000000004',
    'a1900000-0000-4000-8000-000000000004', 1,
    'a1300000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    'active', 'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1a00000-0000-4000-8000-000000000005',
    'a1900000-0000-4000-8000-000000000005', 1,
    'a1300000-0000-4000-8000-000000000001',
    extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
    'active', 'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  );

insert into routing.asset_ownership_versions (
  id, ownership_key, version, asset_id, owner_authority_id, status,
  verification_status, is_placeholder, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values
  (
    'a1b00000-0000-4000-8000-000000000001', 'asset:discovery:owner:verified', 1,
    'a1900000-0000-4000-8000-000000000001',
    'a1100000-0000-4000-8000-000000000002', 'active',
    'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1b00000-0000-4000-8000-000000000002', 'asset:discovery:owner:distant', 1,
    'a1900000-0000-4000-8000-000000000002',
    'a1100000-0000-4000-8000-000000000002', 'active',
    'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1b00000-0000-4000-8000-000000000003', 'asset:discovery:owner:placeholder', 1,
    'a1900000-0000-4000-8000-000000000003',
    'a1100000-0000-4000-8000-000000000002', 'active',
    'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1b00000-0000-4000-8000-000000000004', 'asset:discovery:owner:unverified', 1,
    'a1900000-0000-4000-8000-000000000004',
    'a1100000-0000-4000-8000-000000000002', 'draft',
    'unverified', false, false, timestamptz '2026-01-01 00:00:00+00',
    null, 'a1000000-0000-4000-8000-000000000001'
  ),
  (
    'a1b00000-0000-4000-8000-000000000005', 'asset:discovery:owner:quarantined-map', 1,
    'a1900000-0000-4000-8000-000000000005',
    'a1100000-0000-4000-8000-000000000002', 'active',
    'verified', false, true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-14', 'a1000000-0000-4000-8000-000000000001'
  );

select is(
  (
    select count(*)::integer
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  1,
  'only the one fully eligible nearby asset is returned'
);
select is(
  (
    select asset_id
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  'a1900000-0000-4000-8000-000000000001'::uuid,
  'the picker returns the stable verified asset identifier'
);
select is(
  (
    select display_name
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  'Verified Asset 24',
  'the picker exposes the reviewed asset display name'
);
select is(
  (
    select asset_type_name
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  'Verified Asset Type',
  'the picker exposes the data-driven asset type name'
);
select is(
  (
    select round(distance_meters::numeric, 3)
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  0.000::numeric,
  'PostGIS calculates the asset distance from the supplied point'
);
select is(
  (
    select count(*)::integer
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 1
    )
  ),
  1,
  'the caller can request a smaller bounded result set'
);
select is(
  (
    select count(*)::integer
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 74.5, 19.5, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  0,
  'unsupported jurisdictions return no asset options'
);
select is(
  (
    select count(*)::integer
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000002', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  0,
  'categories that do not require assets return no options'
);
select ok(
  not exists (
    select 1
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
    where asset_id = 'a1900000-0000-4000-8000-000000000002'
  ),
  'assets outside the configured PostGIS tolerance are excluded'
);
select ok(
  not exists (
    select 1
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
    where asset_id = 'a1900000-0000-4000-8000-000000000003'
  ),
  'placeholder assets and versions are excluded'
);
select ok(
  not exists (
    select 1
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
    where asset_id = 'a1900000-0000-4000-8000-000000000004'
  ),
  'assets without current verified ownership are excluded'
);
select ok(
  not exists (
    select 1
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
    where asset_id = 'a1900000-0000-4000-8000-000000000005'
  ),
  'placeholder category-to-asset mappings are excluded'
);
select is(
  (
    select count(*)::integer
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000003', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  ),
  0,
  'placeholder categories never expose an asset picker'
);
select ok(
  not (
    select to_jsonb(discovered) ?| array[
      'location', 'owner_authority_id', 'authority_department_id', 'office_id', 'officer_role_id'
    ]
    from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    ) as discovered
    limit 1
  ),
  'the RPC omits geometry, ownership, office, role, and contact evidence'
);
select throws_ok(
  $$
    select * from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 181, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  $$,
  '22023',
  'ROUTING_ASSET_DISCOVERY_INPUT_INVALID',
  'invalid longitude fails closed'
);
select throws_ok(
  $$
    select * from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 5001,
      timestamptz '2026-07-14 12:00:00+00', 25
    )
  $$,
  '22023',
  'ROUTING_ASSET_DISCOVERY_INPUT_INVALID',
  'unreasonable accuracy fails closed'
);
select throws_ok(
  $$
    select * from public.discover_routing_assets(
      'a1600000-0000-4000-8000-000000000001', 73.84, 18.54, 10,
      timestamptz '2026-07-14 12:00:00+00', 51
    )
  $$,
  '22023',
  'ROUTING_ASSET_DISCOVERY_INPUT_INVALID',
  'oversized result limits fail closed'
);

select * from finish();
rollback;
