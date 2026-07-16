begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, routing, extensions;

select plan(40);

insert into governance.reference_sources (
  id, title, url, source_type, last_checked_on
)
values (
  '94000000-0000-4000-8000-000000000001',
  'Synthetic routing integration fixture',
  'https://example.test/routing-integration-fixture',
  'official',
  date '2026-07-13'
);

insert into governance.authorities (
  id, parent_authority_id, code, name, authority_type,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '94100000-0000-4000-8000-000000000001', null, 'ROUTING_TEST_STATE',
    'Routing Test State', 'state', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94100000-0000-4000-8000-000000000002',
    '94100000-0000-4000-8000-000000000001', 'ROUTING_TEST_DISTRICT',
    'Routing Test District', 'district', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94100000-0000-4000-8000-000000000003',
    '94100000-0000-4000-8000-000000000002', 'ROUTING_TEST_LOCAL_BODY',
    'Routing Test Local Body', 'local_body', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94100000-0000-4000-8000-000000000004',
    '94100000-0000-4000-8000-000000000003', 'ROUTING_TEST_ASSET_OWNER',
    'Routing Test Asset Owner', 'utility', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94100000-0000-4000-8000-000000000005',
    '94100000-0000-4000-8000-000000000001', 'ROUTING_TEST_OTHER_DISTRICT',
    'Routing Test Other District', 'district', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.states (
  id, authority_id, name, iso_code, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '94200000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000001',
  'Routing Test State', 'RT', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into governance.districts (
  id, authority_id, state_id, name, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '94300000-0000-4000-8000-000000000001',
    '94100000-0000-4000-8000-000000000002',
    '94200000-0000-4000-8000-000000000001',
    'Routing Test District', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94300000-0000-4000-8000-000000000002',
    '94100000-0000-4000-8000-000000000005',
    '94200000-0000-4000-8000-000000000001',
    'Routing Test Other District', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.talukas (
  id, district_id, name, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '94310000-0000-4000-8000-000000000001',
    '94300000-0000-4000-8000-000000000001', 'Routing Test Taluka',
    'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94310000-0000-4000-8000-000000000002',
    '94300000-0000-4000-8000-000000000002', 'Routing Test Other Taluka',
    'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.local_bodies (
  id, authority_id, state_id, name, body_type, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '94400000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000003',
  '94200000-0000-4000-8000-000000000001',
  'Routing Test Local Body', 'municipal_corporation', 'verified', true,
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into governance.local_body_districts (
  local_body_id, district_id, is_primary, reference_source_id
)
values
  (
    '94400000-0000-4000-8000-000000000001',
    '94300000-0000-4000-8000-000000000001', true,
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94400000-0000-4000-8000-000000000001',
    '94300000-0000-4000-8000-000000000002', false,
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.utilities (
  id, authority_id, name, function_description, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '94400000-0000-4000-8000-000000000002',
  '94100000-0000-4000-8000-000000000004',
  'Routing Test Utility', 'Owns the synthetic routing test asset.',
  'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into governance.wards (
  id, local_body_id, source_ward_code, name, ward_number, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '94500000-0000-4000-8000-000000000001',
    '94400000-0000-4000-8000-000000000001', 'ROUTING-WARD-A',
    'Routing Test Ward A', 'A', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94500000-0000-4000-8000-000000000002',
    '94400000-0000-4000-8000-000000000001', 'ROUTING-WARD-B',
    'Routing Test Ward B', 'B', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id, state_id, district_id, taluka_id, version, boundary, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values
  (
    '94610000-0000-4000-8000-000000000001',
    '94200000-0000-4000-8000-000000000001', null, null, 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.7 18.4,74.2 18.4,74.2 18.7,73.7 18.7,73.7 18.4)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94610000-0000-4000-8000-000000000002', null,
    '94300000-0000-4000-8000-000000000001', null, 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94610000-0000-4000-8000-000000000003', null, null,
    '94310000-0000-4000-8000-000000000001', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94610000-0000-4000-8000-000000000004', null,
    '94300000-0000-4000-8000-000000000002', null, 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((74.0 18.5,74.1 18.5,74.1 18.6,74.0 18.6,74.0 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94610000-0000-4000-8000-000000000005', null, null,
    '94310000-0000-4000-8000-000000000002', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((74.0 18.5,74.1 18.5,74.1 18.6,74.0 18.6,74.0 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  );

insert into governance.jurisdiction_boundary_versions (
  id, local_body_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  '94600000-0000-4000-8000-000000000001',
  '94400000-0000-4000-8000-000000000001', 1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((73.8 18.5,73.9 18.5,73.9 18.6,73.8 18.6,73.8 18.5)))', 4326
  ),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into governance.jurisdiction_boundary_versions (
  id, ward_id, version, boundary, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values
  (
    '94600000-0000-4000-8000-000000000002',
    '94500000-0000-4000-8000-000000000001', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.8 18.5,73.85 18.5,73.85 18.6,73.8 18.6,73.8 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94600000-0000-4000-8000-000000000003',
    '94500000-0000-4000-8000-000000000002', 1,
    extensions.st_geomfromtext(
      'MULTIPOLYGON(((73.85 18.5,73.9 18.5,73.9 18.6,73.85 18.6,73.85 18.5)))', 4326
    ),
    'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  );

insert into governance.departments (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    '94700000-0000-4000-8000-000000000001', 'routing_rule_department',
    'Routing Rule Department', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94700000-0000-4000-8000-000000000002', 'routing_owner_department',
    'Routing Owner Department', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.authority_departments (
  id, authority_id, department_id, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    '94800000-0000-4000-8000-000000000001',
    '94100000-0000-4000-8000-000000000003',
    '94700000-0000-4000-8000-000000000001', 'verified', true,
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94800000-0000-4000-8000-000000000002',
    '94100000-0000-4000-8000-000000000004',
    '94700000-0000-4000-8000-000000000002', 'verified', true,
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  );

insert into governance.officer_roles (
  id, code, name, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values
  (
    '94900000-0000-4000-8000-000000000001', 'routing_rule_role',
    'Routing Rule Role', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94900000-0000-4000-8000-000000000002', 'routing_owner_role',
    'Routing Owner Role', 'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.offices (
  id, authority_id, authority_department_id, name, office_type,
  district_id, taluka_id,
  verification_status, is_routing_eligible, last_verified_on, reference_source_id
)
values
  (
    '94a00000-0000-4000-8000-000000000001',
    '94100000-0000-4000-8000-000000000004',
    '94800000-0000-4000-8000-000000000002',
    'Routing Owner Office', 'test',
    '94300000-0000-4000-8000-000000000001',
    '94310000-0000-4000-8000-000000000001',
    'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94a00000-0000-4000-8000-000000000002',
    '94100000-0000-4000-8000-000000000004',
    '94800000-0000-4000-8000-000000000002',
    'Routing Wrong Area Office', 'test',
    '94300000-0000-4000-8000-000000000002',
    '94310000-0000-4000-8000-000000000002',
    'verified', true, date '2026-07-13',
    '94000000-0000-4000-8000-000000000001'
  );

insert into governance.officers (
  id, full_name, verification_status, last_verified_on, reference_source_id
)
values (
  '94b00000-0000-4000-8000-000000000001', 'Synthetic Verified Officer',
  'verified', date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into governance.officer_assignments (
  id, assignment_key, version, authority_id, officer_role_id, officer_id,
  office_id, authority_department_id, district_id, taluka_id,
  status, verification_status,
  effective_from, last_verified_on, reference_source_id
)
values
  (
    '94c00000-0000-4000-8000-000000000001', 'routing:test:owner-assignment', 1,
    '94100000-0000-4000-8000-000000000004',
    '94900000-0000-4000-8000-000000000002',
    '94b00000-0000-4000-8000-000000000001',
    '94a00000-0000-4000-8000-000000000001',
    '94800000-0000-4000-8000-000000000002',
    '94300000-0000-4000-8000-000000000001',
    '94310000-0000-4000-8000-000000000001',
    'active', 'verified', timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94c00000-0000-4000-8000-000000000002', 'routing:test:wrong-area-assignment', 1,
    '94100000-0000-4000-8000-000000000004',
    '94900000-0000-4000-8000-000000000002',
    '94b00000-0000-4000-8000-000000000001',
    '94a00000-0000-4000-8000-000000000001',
    '94800000-0000-4000-8000-000000000002',
    '94300000-0000-4000-8000-000000000002',
    '94310000-0000-4000-8000-000000000002',
    'active', 'verified', timestamptz '2026-01-01 00:00:00+00',
    date '2026-07-13', '94000000-0000-4000-8000-000000000001'
  ),
  (
    '94c00000-0000-4000-8000-000000000003', 'routing:test:placeholder-assignment', 1,
    '94100000-0000-4000-8000-000000000004',
    '94900000-0000-4000-8000-000000000002',
    '94b00000-0000-4000-8000-000000000001',
    '94a00000-0000-4000-8000-000000000001',
    '94800000-0000-4000-8000-000000000002',
    '94300000-0000-4000-8000-000000000001',
    '94310000-0000-4000-8000-000000000001',
    'active', 'placeholder', timestamptz '2026-01-01 00:00:00+00',
    null, '94000000-0000-4000-8000-000000000001'
  );

insert into routing.issue_domains (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '94d00000-0000-4000-8000-000000000001', 'routing_test_domain',
  'Routing Test Domain', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.issue_categories (
  id, domain_id, code, name, requires_asset, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '94e00000-0000-4000-8000-000000000001',
  '94d00000-0000-4000-8000-000000000001', 'routing_test_category',
  'Routing Test Category', true, 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_types (
  id, code, name, matching_distance_meters, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '94f00000-0000-4000-8000-000000000001', 'routing_test_asset',
  'Routing Test Asset', 100, 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.category_asset_types (
  id, category_id, asset_type_id, requirement, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '95000000-0000-4000-8000-000000000001',
  '94e00000-0000-4000-8000-000000000001',
  '94f00000-0000-4000-8000-000000000001', 'required',
  'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.assets (
  id, asset_type_id, asset_key, display_name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '95100000-0000-4000-8000-000000000001',
  '94f00000-0000-4000-8000-000000000001', 'routing:test:asset',
  'Routing Test Asset', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_versions (
  id, asset_id, version, district_id, local_body_id, ward_id, location, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95200000-0000-4000-8000-000000000001',
  '95100000-0000-4000-8000-000000000001', 1,
  '94300000-0000-4000-8000-000000000001',
  '94400000-0000-4000-8000-000000000001',
  '94500000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_ownership_versions (
  id, ownership_key, version, asset_id, owner_authority_id,
  authority_department_id, office_id, officer_role_id, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95300000-0000-4000-8000-000000000001', 'routing:test:asset-owner', 1,
  '95100000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000004',
  '94800000-0000-4000-8000-000000000002',
  '94a00000-0000-4000-8000-000000000001',
  '94900000-0000-4000-8000-000000000002',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.confidence_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '95400000-0000-4000-8000-000000000001', 'routing_test_confidence',
  'Routing Test Confidence', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.assets (
  id, asset_type_id, asset_key, display_name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '95100000-0000-4000-8000-000000000002',
  '94f00000-0000-4000-8000-000000000001', 'routing:test:wrong-district-asset',
  'Routing Wrong District Asset', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_versions (
  id, asset_id, version, district_id, local_body_id, location, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95200000-0000-4000-8000-000000000002',
  '95100000-0000-4000-8000-000000000002', 1,
  '94300000-0000-4000-8000-000000000002',
  '94400000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_ownership_versions (
  id, ownership_key, version, asset_id, owner_authority_id,
  authority_department_id, office_id, officer_role_id, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95300000-0000-4000-8000-000000000002', 'routing:test:wrong-district-owner', 1,
  '95100000-0000-4000-8000-000000000002',
  '94100000-0000-4000-8000-000000000004',
  '94800000-0000-4000-8000-000000000002',
  '94a00000-0000-4000-8000-000000000001',
  '94900000-0000-4000-8000-000000000002',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.assets (
  id, asset_type_id, asset_key, display_name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '95100000-0000-4000-8000-000000000003',
  '94f00000-0000-4000-8000-000000000001', 'routing:test:wrong-office-asset',
  'Routing Wrong Office Asset', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_versions (
  id, asset_id, version, district_id, local_body_id, ward_id, location, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95200000-0000-4000-8000-000000000003',
  '95100000-0000-4000-8000-000000000003', 1,
  '94300000-0000-4000-8000-000000000001',
  '94400000-0000-4000-8000-000000000001',
  '94500000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.asset_ownership_versions (
  id, ownership_key, version, asset_id, owner_authority_id,
  authority_department_id, office_id, officer_role_id, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95300000-0000-4000-8000-000000000003', 'routing:test:wrong-office-owner', 1,
  '95100000-0000-4000-8000-000000000003',
  '94100000-0000-4000-8000-000000000004',
  '94800000-0000-4000-8000-000000000002',
  '94a00000-0000-4000-8000-000000000002',
  '94900000-0000-4000-8000-000000000002',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.confidence_policy_versions (
  id, confidence_policy_id, version, category_id, automatic_threshold,
  manual_review_threshold, ambiguity_delta, fallback_penalty_per_level,
  factors, status, verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
values (
  '95500000-0000-4000-8000-000000000001',
  '95400000-0000-4000-8000-000000000001', 1,
  '94e00000-0000-4000-8000-000000000001', 0.8, 0.5, 0.05, 0.1,
  '[{"code":"jurisdiction","weight":0.5,"required":true},{"code":"asset_owner","weight":0.5,"required":true}]'::jsonb,
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
);

insert into routing.route_rules (
  id, category_id, rule_code, name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
values (
  '95600000-0000-4000-8000-000000000001',
  '94e00000-0000-4000-8000-000000000001', 'ROUTING_TEST_PRIMARY',
  'Routing Test Primary', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

insert into routing.route_rule_versions (
  id, route_rule_id, version, scope_local_body_id, asset_type_id,
  target_authority_id, target_department_id, target_officer_role_id,
  confidence_policy_version_id, asset_requirement, requires_asset_owner,
  confidence_factor_codes, explanation_code, status, verification_status,
  is_routing_eligible, effective_from, last_verified_on, reference_source_id
)
values (
  '95700000-0000-4000-8000-000000000001',
  '95600000-0000-4000-8000-000000000001', 1,
  '94400000-0000-4000-8000-000000000001',
  '94f00000-0000-4000-8000-000000000001',
  '94100000-0000-4000-8000-000000000003',
  '94700000-0000-4000-8000-000000000001',
  '94900000-0000-4000-8000-000000000001',
  '95500000-0000-4000-8000-000000000001',
  'required', true, array['jurisdiction', 'asset_owner']::text[],
  'asset_owner_verified', 'active', 'verified', true,
  timestamptz '2026-01-01 00:00:00+00', date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);

select is(
  (
    select count(*)::integer
    from public.resolve_jurisdiction_context(
      73.84, 18.54, 5, timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  1,
  'an accurate interior point resolves one jurisdiction'
);
select is(
  (
    select concat_ws(':', state_id, district_id, taluka_id)
    from public.resolve_jurisdiction_context(
      73.84, 18.54, 5, timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '94200000-0000-4000-8000-000000000001:94300000-0000-4000-8000-000000000001:94310000-0000-4000-8000-000000000001',
  'jurisdiction resolution carries exact state, district, and taluka context'
);
select ok(
  (
    select evidence_metadata -> 'evidence' @> jsonb_build_array(
      jsonb_build_object(
        'entityType', 'district',
        'entityId', '94300000-0000-4000-8000-000000000001'::uuid
      ),
      jsonb_build_object(
        'entityType', 'taluka',
        'entityId', '94310000-0000-4000-8000-000000000001'::uuid
      ),
      jsonb_build_object(
        'entityType', 'jurisdiction_boundary',
        'versionId', '94610000-0000-4000-8000-000000000003'::uuid
      )
    )
    from public.resolve_jurisdiction_context(
      73.84, 18.54, 5, timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  'jurisdiction evidence preserves upper geography and exact boundary versions'
);
select throws_ok(
  $$
    select * from public.resolve_jurisdiction_context(
      73.84, 18.54, 5001, timestamptz '2026-07-13 12:00:00+00'
    )
  $$,
  '22023',
  'JURISDICTION_EVIDENCE_INVALID',
  'routing rejects location accuracy wider than five kilometres'
);
select is(
  (
    select count(*)::integer
    from public.resolve_jurisdiction_context(
      73.85, 18.54, 20, timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  2,
  'accuracy-aware resolution preserves both adjacent ward candidates'
);
select is(
  (
    select target_authority_id
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '94100000-0000-4000-8000-000000000004'::uuid,
  'verified asset ownership overrides the rule fallback authority'
);
select is(
  (
    select department_id
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '94700000-0000-4000-8000-000000000002'::uuid,
  'asset ownership overrides department resolution'
);
select is(
  (
    select officer_role_id
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '94900000-0000-4000-8000-000000000002'::uuid,
  'asset ownership overrides officer-role resolution'
);
select is(
  (
    select officer_assignment_id
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '94c00000-0000-4000-8000-000000000001'::uuid,
  'the durable owner role resolves its current verified assignment separately'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
    where officer_assignment_id = '94c00000-0000-4000-8000-000000000002'
  ),
  0,
  'district- and taluka-scoped assignments fail closed outside their exact context'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
    where officer_assignment_id = '94c00000-0000-4000-8000-000000000003'
  ),
  0,
  'placeholder officer assignments never become routing recipients'
);
select is(
  (
    select asset_version_id
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  '95200000-0000-4000-8000-000000000001'::uuid,
  'candidate evidence preserves the exact matched asset version'
);
select is(
  (
    select round(asset_match_distance_meters::numeric, 3)
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  0.000::numeric,
  'candidate evidence preserves the measured asset distance'
);
select ok(
  (
    select explanation_metadata -> 'evidence' @> jsonb_build_array(
      jsonb_build_object(
        'entityType', 'authority_department',
        'entityId', '94800000-0000-4000-8000-000000000002'::uuid
      )
    )
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  'routing explanation carries exact authority-department evidence'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000003',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  0,
  'target offices scoped to another district or taluka fail closed'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  0,
  'an unknown supplied asset never falls through to a production route'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000002',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  0,
  'asset versions scoped to another resolved district fail closed'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_policy_context(
      '94e00000-0000-4000-8000-000000000001',
      '94400000-0000-4000-8000-000000000001',
      '94500000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  1,
  'policy context remains available when asset matching yields no candidate'
);

insert into routing.assets (
  id, asset_type_id, asset_key, display_name, status, verification_status,
  is_routing_eligible, last_verified_on, reference_source_id
)
select
  ('96000000-0000-4000-8000-' || lpad(asset_number::text, 12, '0'))::uuid,
  '94f00000-0000-4000-8000-000000000001',
  'routing:test:bounded-asset:' || asset_number,
  'Routing Bounded Asset ' || asset_number,
  'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
from generate_series(1, 101) as asset_number;

insert into routing.asset_versions (
  id, asset_id, version, district_id, local_body_id, ward_id, location, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
select
  ('96100000-0000-4000-8000-' || lpad(asset_number::text, 12, '0'))::uuid,
  ('96000000-0000-4000-8000-' || lpad(asset_number::text, 12, '0'))::uuid,
  1,
  '94300000-0000-4000-8000-000000000001',
  '94400000-0000-4000-8000-000000000001',
  '94500000-0000-4000-8000-000000000001',
  extensions.st_setsrid(extensions.st_makepoint(73.84, 18.54), 4326),
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
from generate_series(1, 101) as asset_number;

insert into routing.asset_ownership_versions (
  id, ownership_key, version, asset_id, owner_authority_id,
  authority_department_id, office_id, officer_role_id, status,
  verification_status, is_routing_eligible, effective_from,
  last_verified_on, reference_source_id
)
select
  ('96200000-0000-4000-8000-' || lpad(asset_number::text, 12, '0'))::uuid,
  'routing:test:bounded-owner:' || asset_number,
  1,
  ('96000000-0000-4000-8000-' || lpad(asset_number::text, 12, '0'))::uuid,
  '94100000-0000-4000-8000-000000000004',
  '94800000-0000-4000-8000-000000000002',
  '94a00000-0000-4000-8000-000000000001',
  '94900000-0000-4000-8000-000000000002',
  'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
  date '2026-07-13', '94000000-0000-4000-8000-000000000001'
from generate_series(1, 101) as asset_number;

select ok(
  (
    select count(*) between 1 and 100
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      null,
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  'candidate resolution is deterministically bounded to one hundred rows'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.84, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000101',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  1,
  'the candidate cap never hides an explicitly requested eligible asset'
);
select is(
  (
    select count(*)::integer
    from public.resolve_routing_candidates(
      73.81, 18.54, 5,
      '94e00000-0000-4000-8000-000000000001',
      '95100000-0000-4000-8000-000000000001',
      timestamptz '2026-07-13 12:00:00+00'
    )
  ),
  0,
  'a supplied asset outside its spatial tolerance is rejected'
);

insert into routing.route_rules (id, category_id, rule_code, name)
values (
  '95800000-0000-4000-8000-000000000001',
  '94e00000-0000-4000-8000-000000000001',
  'ROUTING_TEST_FALLBACK', 'Routing Test Fallback'
);

select throws_ok(
  $$
    insert into routing.route_rule_versions (
      route_rule_id, version, fallback_depth, fallback_path,
      explanation_code, effective_from
    ) values (
      '95800000-0000-4000-8000-000000000001', 1, 1,
      array['95800000-0000-4000-8000-000000000001'::uuid],
      'invalid_self_fallback', timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'ROUTING_RULE_FALLBACK_SELF_REFERENCE',
  'fallback rules cannot reference themselves'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status, is_routing_eligible
)
values (
  '95d00000-0000-4000-8000-000000000001',
  '94d00000-0000-4000-8000-000000000001',
  'routing_other_category', 'Routing Other Category', 'draft', 'unverified', false
);
insert into routing.route_rules (id, category_id, rule_code, name)
values (
  '95e00000-0000-4000-8000-000000000001',
  '95d00000-0000-4000-8000-000000000001',
  'ROUTING_OTHER_CATEGORY_RULE', 'Routing Other Category Rule'
);
select throws_ok(
  $$
    insert into routing.route_rule_versions (
      route_rule_id, version, fallback_depth, fallback_path,
      explanation_code, effective_from
    ) values (
      '95800000-0000-4000-8000-000000000001', 1, 1,
      array['95e00000-0000-4000-8000-000000000001'::uuid],
      'invalid_cross_category_fallback', timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'ROUTING_RULE_FALLBACK_CATEGORY_MISMATCH',
  'fallback paths cannot cross category boundaries'
);
select lives_ok(
  $$
    insert into routing.route_rule_versions (
      id, route_rule_id, version, fallback_depth, fallback_path,
      explanation_code, effective_from
    ) values (
      '95810000-0000-4000-8000-000000000001',
      '95800000-0000-4000-8000-000000000001', 1, 1,
      array['95600000-0000-4000-8000-000000000001'::uuid],
      'valid_first_fallback', timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  'a fallback path may reference a valid depth-zero ancestor in the same category'
);
insert into routing.route_rules (id, category_id, rule_code, name)
values (
  '95f00000-0000-4000-8000-000000000001',
  '94e00000-0000-4000-8000-000000000001',
  'ROUTING_TEST_TERTIARY', 'Routing Test Tertiary'
);
select throws_ok(
  $$
    insert into routing.route_rule_versions (
      route_rule_id, version, fallback_depth, fallback_path,
      explanation_code, effective_from
    ) values (
      '95f00000-0000-4000-8000-000000000001', 1, 2,
      array[
        '95800000-0000-4000-8000-000000000001'::uuid,
        '95600000-0000-4000-8000-000000000001'::uuid
      ],
      'invalid_fallback_order', timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'ROUTING_RULE_FALLBACK_CHAIN_INVALID',
  'fallback paths must preserve ancestor depth and order'
);
select throws_ok(
  $$
    update routing.route_rules
    set category_id = '95d00000-0000-4000-8000-000000000001'
    where id = '95600000-0000-4000-8000-000000000001'
  $$,
  '55000',
  null,
  'stable routing rules cannot change category identity after versioning'
);

insert into routing.confidence_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '95900000-0000-4000-8000-000000000001', 'routing_invalid_confidence',
  'Routing Invalid Confidence', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$
    insert into routing.confidence_policy_versions (
      confidence_policy_id, version, automatic_threshold,
      manual_review_threshold, ambiguity_delta, fallback_penalty_per_level,
      factors, status, verification_status, is_routing_eligible,
      effective_from, last_verified_on, reference_source_id
    ) values (
      '95900000-0000-4000-8000-000000000001', 1, 0.8, 0.5, 0.05, 0.1,
      '[{"code":"same","weight":1,"required":true},{"code":"same","weight":1,"required":false}]',
      'active', 'verified', true, timestamptz '2026-01-01 00:00:00+00',
      date '2026-07-13', '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'ROUTING_CONFIDENCE_FACTOR_DUPLICATE',
  'active confidence policy factors require unique codes'
);

insert into routing.duplicate_detection_policies (
  id, code, name, status, verification_status, is_routing_eligible,
  last_verified_on, reference_source_id
)
values (
  '95a00000-0000-4000-8000-000000000001', 'routing_invalid_duplicate',
  'Routing Invalid Duplicate', 'active', 'verified', true, date '2026-07-13',
  '94000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$
    insert into routing.duplicate_detection_policy_versions (
      duplicate_detection_policy_id, version, maximum_distance_meters,
      maximum_age_seconds, minimum_score, maximum_results, weights,
      status, verification_status, is_routing_eligible, effective_from,
      last_verified_on, reference_source_id
    ) values (
      '95a00000-0000-4000-8000-000000000001', 1, 100, 86400, 0.6, 10,
      '{"category":1,"location":1}', 'active', 'verified', true,
      timestamptz '2026-01-01 00:00:00+00', date '2026-07-13',
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'ROUTING_DUPLICATE_WEIGHTS_KEYS_INVALID',
  'active duplicate policies require the exact weight contract'
);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '95b00000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'routing.audit@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select lives_ok(
  $$
    select public.record_routing_decision(
      p_actor_user_id => '95b00000-0000-4000-8000-000000000001',
      p_request_id => 'routing-integration-1',
      p_longitude => 73.84,
      p_latitude => 18.54,
      p_accuracy_meters => 5,
      p_captured_at => timestamptz '2026-07-13 12:01:00+00',
      p_resolved_at => timestamptz '2026-07-13 12:00:00+00',
      p_category_id => '94e00000-0000-4000-8000-000000000001',
      p_decision_status => 'routed',
      p_confidence_score => 1,
      p_state_id => '94200000-0000-4000-8000-000000000001',
      p_district_id => '94300000-0000-4000-8000-000000000001',
      p_taluka_id => '94310000-0000-4000-8000-000000000001',
      p_local_body_id => '94400000-0000-4000-8000-000000000001',
      p_ward_id => '94500000-0000-4000-8000-000000000001',
      p_state_boundary_version_id => '94610000-0000-4000-8000-000000000001',
      p_district_boundary_version_id => '94610000-0000-4000-8000-000000000002',
      p_taluka_boundary_version_id => '94610000-0000-4000-8000-000000000003',
      p_local_body_boundary_version_id => '94600000-0000-4000-8000-000000000001',
      p_ward_boundary_version_id => '94600000-0000-4000-8000-000000000002',
      p_asset_type_id => '94f00000-0000-4000-8000-000000000001',
      p_asset_id => '95100000-0000-4000-8000-000000000001',
      p_asset_version_id => '95200000-0000-4000-8000-000000000001',
      p_asset_match_distance_meters => 0,
      p_asset_ownership_version_id => '95300000-0000-4000-8000-000000000001',
      p_target_authority_id => '94100000-0000-4000-8000-000000000004',
      p_department_id => '94700000-0000-4000-8000-000000000002',
      p_authority_department_id => '94800000-0000-4000-8000-000000000002',
      p_officer_role_id => '94900000-0000-4000-8000-000000000002',
      p_officer_assignment_id => '94c00000-0000-4000-8000-000000000001',
      p_route_rule_id => '95600000-0000-4000-8000-000000000001',
      p_route_rule_version_id => '95700000-0000-4000-8000-000000000001',
      p_confidence_policy_version_id => '95500000-0000-4000-8000-000000000001',
      p_explanation_metadata => jsonb_build_object(
        'policyVersionId', '95500000-0000-4000-8000-000000000001',
        'selectedRoutingRuleId', '95600000-0000-4000-8000-000000000001',
        'selectedRoutingRuleVersionId', '95700000-0000-4000-8000-000000000001',
        'fallbackUsed', false,
        'fallbackPath', '[]'::jsonb,
        'jurisdiction', '{}'::jsonb
      )
    )
  $$,
  'routing audit accepts the API two-minute capture clock tolerance'
);
select is(
  (
    select public.record_routing_decision(
      p_actor_user_id => '95b00000-0000-4000-8000-000000000001',
      p_request_id => 'routing-integration-1',
      p_longitude => 73.84,
      p_latitude => 18.54,
      p_accuracy_meters => 5,
      p_captured_at => timestamptz '2026-07-13 12:01:00+00',
      p_resolved_at => timestamptz '2026-07-13 12:00:00+00',
      p_category_id => '94e00000-0000-4000-8000-000000000001',
      p_decision_status => 'routed',
      p_confidence_score => 1,
      p_state_id => '94200000-0000-4000-8000-000000000001',
      p_district_id => '94300000-0000-4000-8000-000000000001',
      p_taluka_id => '94310000-0000-4000-8000-000000000001',
      p_local_body_id => '94400000-0000-4000-8000-000000000001',
      p_ward_id => '94500000-0000-4000-8000-000000000001',
      p_state_boundary_version_id => '94610000-0000-4000-8000-000000000001',
      p_district_boundary_version_id => '94610000-0000-4000-8000-000000000002',
      p_taluka_boundary_version_id => '94610000-0000-4000-8000-000000000003',
      p_local_body_boundary_version_id => '94600000-0000-4000-8000-000000000001',
      p_ward_boundary_version_id => '94600000-0000-4000-8000-000000000002',
      p_asset_type_id => '94f00000-0000-4000-8000-000000000001',
      p_asset_id => '95100000-0000-4000-8000-000000000001',
      p_asset_version_id => '95200000-0000-4000-8000-000000000001',
      p_asset_match_distance_meters => 0,
      p_asset_ownership_version_id => '95300000-0000-4000-8000-000000000001',
      p_target_authority_id => '94100000-0000-4000-8000-000000000004',
      p_department_id => '94700000-0000-4000-8000-000000000002',
      p_authority_department_id => '94800000-0000-4000-8000-000000000002',
      p_officer_role_id => '94900000-0000-4000-8000-000000000002',
      p_officer_assignment_id => '94c00000-0000-4000-8000-000000000001',
      p_route_rule_id => '95600000-0000-4000-8000-000000000001',
      p_route_rule_version_id => '95700000-0000-4000-8000-000000000001',
      p_confidence_policy_version_id => '95500000-0000-4000-8000-000000000001',
      p_explanation_metadata => jsonb_build_object(
        'policyVersionId', '95500000-0000-4000-8000-000000000001',
        'selectedRoutingRuleId', '95600000-0000-4000-8000-000000000001',
        'selectedRoutingRuleVersionId', '95700000-0000-4000-8000-000000000001',
        'fallbackUsed', false,
        'fallbackPath', '[]'::jsonb,
        'jurisdiction', '{}'::jsonb
      )
    )
  ),
  (select id from routing.routing_decisions where request_id = 'routing-integration-1'),
  'an identical routing decision replay is idempotent'
);
select throws_ok(
  $$
    select public.record_routing_decision(
      p_actor_user_id => '95b00000-0000-4000-8000-000000000001',
      p_request_id => 'routing-integration-1',
      p_longitude => 73.84,
      p_latitude => 18.54,
      p_accuracy_meters => 6,
      p_captured_at => timestamptz '2026-07-13 12:01:00+00',
      p_resolved_at => timestamptz '2026-07-13 12:00:00+00',
      p_category_id => '94e00000-0000-4000-8000-000000000001',
      p_decision_status => 'routed',
      p_confidence_score => 1,
      p_state_id => '94200000-0000-4000-8000-000000000001',
      p_district_id => '94300000-0000-4000-8000-000000000001',
      p_taluka_id => '94310000-0000-4000-8000-000000000001',
      p_local_body_id => '94400000-0000-4000-8000-000000000001',
      p_ward_id => '94500000-0000-4000-8000-000000000001',
      p_state_boundary_version_id => '94610000-0000-4000-8000-000000000001',
      p_district_boundary_version_id => '94610000-0000-4000-8000-000000000002',
      p_taluka_boundary_version_id => '94610000-0000-4000-8000-000000000003',
      p_local_body_boundary_version_id => '94600000-0000-4000-8000-000000000001',
      p_ward_boundary_version_id => '94600000-0000-4000-8000-000000000002',
      p_asset_type_id => '94f00000-0000-4000-8000-000000000001',
      p_asset_id => '95100000-0000-4000-8000-000000000001',
      p_asset_version_id => '95200000-0000-4000-8000-000000000001',
      p_asset_match_distance_meters => 0,
      p_asset_ownership_version_id => '95300000-0000-4000-8000-000000000001',
      p_target_authority_id => '94100000-0000-4000-8000-000000000004',
      p_department_id => '94700000-0000-4000-8000-000000000002',
      p_authority_department_id => '94800000-0000-4000-8000-000000000002',
      p_officer_role_id => '94900000-0000-4000-8000-000000000002',
      p_officer_assignment_id => '94c00000-0000-4000-8000-000000000001',
      p_route_rule_id => '95600000-0000-4000-8000-000000000001',
      p_route_rule_version_id => '95700000-0000-4000-8000-000000000001',
      p_confidence_policy_version_id => '95500000-0000-4000-8000-000000000001',
      p_explanation_metadata => jsonb_build_object(
        'policyVersionId', '95500000-0000-4000-8000-000000000001',
        'selectedRoutingRuleId', '95600000-0000-4000-8000-000000000001',
        'selectedRoutingRuleVersionId', '95700000-0000-4000-8000-000000000001',
        'fallbackUsed', false,
        'fallbackPath', '[]'::jsonb,
        'jurisdiction', '{}'::jsonb
      )
    )
  $$,
  '23505',
  'ROUTING_DECISION_IDEMPOTENCY_CONFLICT',
  'a conflicting decision replay is rejected'
);
select throws_ok(
  $$
    select public.record_routing_decision(
      p_actor_user_id => '95b00000-0000-4000-8000-000000000001',
      p_request_id => 'routing-invalid-incomplete',
      p_longitude => 73.84,
      p_latitude => 18.54,
      p_accuracy_meters => 5,
      p_captured_at => timestamptz '2026-07-13 12:01:00+00',
      p_resolved_at => timestamptz '2026-07-13 12:00:00+00',
      p_category_id => '94e00000-0000-4000-8000-000000000001',
      p_decision_status => 'routed',
      p_explanation_metadata => jsonb_build_object(
        'policyVersionId', null,
        'selectedRoutingRuleId', null,
        'selectedRoutingRuleVersionId', null,
        'fallbackUsed', false,
        'fallbackPath', '[]'::jsonb,
        'jurisdiction', '{}'::jsonb
      )
    )
  $$,
  '23514',
  'ROUTING_DECISION_RULE_CONTEXT_INVALID',
  'a routed audit cannot omit its selected rule and target evidence'
);
select throws_ok(
  $test$
    do $block$
    declare
      invalid_decision routing.routing_decisions%rowtype;
    begin
      select * into invalid_decision
      from routing.routing_decisions
      where request_id = 'routing-integration-1';
      invalid_decision.id := gen_random_uuid();
      invalid_decision.request_id := 'routing-invalid-asset-version';
      invalid_decision.asset_version_id := '95200000-0000-4000-8000-000000000002';
      invalid_decision.created_at := now();
      insert into routing.routing_decisions select invalid_decision.*;
    end;
    $block$
  $test$,
  '23514',
  'ROUTING_DECISION_ASSET_VERSION_INVALID',
  'routing audit rejects an asset version that does not belong to the selected asset'
);
select throws_ok(
  $test$
    do $block$
    declare
      invalid_decision routing.routing_decisions%rowtype;
    begin
      select * into invalid_decision
      from routing.routing_decisions
      where request_id = 'routing-integration-1';
      invalid_decision.id := gen_random_uuid();
      invalid_decision.request_id := 'routing-invalid-district-boundary';
      invalid_decision.district_boundary_version_id :=
        '94610000-0000-4000-8000-000000000004';
      invalid_decision.created_at := now();
      insert into routing.routing_decisions select invalid_decision.*;
    end;
    $block$
  $test$,
  '23514',
  'ROUTING_DECISION_DISTRICT_BOUNDARY_INVALID',
  'routing audit rejects a boundary version from a different district'
);
select throws_ok(
  $test$
    do $block$
    declare
      invalid_decision routing.routing_decisions%rowtype;
    begin
      select * into invalid_decision
      from routing.routing_decisions
      where request_id = 'routing-integration-1';
      invalid_decision.id := gen_random_uuid();
      invalid_decision.request_id := 'routing-invalid-non-routed-target';
      invalid_decision.decision_status := 'mapping_required';
      invalid_decision.created_at := now();
      insert into routing.routing_decisions select invalid_decision.*;
    end;
    $block$
  $test$,
  '23514',
  null,
  'a non-routed audit cannot claim an official target assignment'
);
select throws_ok(
  $$update routing.routing_decisions set ambiguity_count = 1 where request_id = 'routing-integration-1'$$,
  '55000',
  null,
  'routing decision history is append-only'
);
select throws_ok(
  $$delete from routing.routing_decisions where request_id = 'routing-integration-1'$$,
  '55000',
  null,
  'routing decision history cannot be deleted'
);
select throws_ok(
  $$
    update routing.route_rule_versions
    set explanation_code = 'mutated'
    where id = '95700000-0000-4000-8000-000000000001'
  $$,
  '55000',
  null,
  'active routing rule content is immutable'
);
select throws_ok(
  $$
    insert into routing.issue_categories (
      domain_id, code, name, status, verification_status,
      is_placeholder, is_routing_eligible, last_verified_on, reference_source_id
    ) values (
      '94d00000-0000-4000-8000-000000000001', 'invalid_placeholder_route',
      'Invalid Placeholder Route', 'active', 'placeholder', true, true,
      date '2026-07-13', '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  null,
  'placeholder categories cannot become routing eligible'
);

insert into routing.issue_categories (
  id, domain_id, code, name, status, verification_status,
  is_routing_eligible
)
values (
  '95c00000-0000-4000-8000-000000000001',
  '94d00000-0000-4000-8000-000000000001',
  'routing_unverified_parent', 'Routing Unverified Parent',
  'draft', 'unverified', false
);
select throws_ok(
  $$
    insert into routing.issue_categories (
      domain_id, parent_category_id, classification_level, code, name,
      status, verification_status, is_routing_eligible,
      last_verified_on, reference_source_id
    ) values (
      '94d00000-0000-4000-8000-000000000001',
      '95c00000-0000-4000-8000-000000000001', 'subcategory',
      'routing_invalid_child', 'Routing Invalid Child',
      'active', 'verified', true, date '2026-07-13',
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'ROUTING_CATEGORY_ANCESTOR_NOT_ELIGIBLE',
  'routable children require every taxonomy ancestor to be routable'
);

select * from finish();
rollback;
