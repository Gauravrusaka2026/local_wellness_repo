begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(43);

insert into governance.reference_sources (
  id,
  title,
  url,
  source_type,
  last_checked_on
)
values (
  '80000000-0000-4000-8000-000000000001',
  'Synthetic pgTAP versioning fixture',
  'https://example.test/governance-versioning-fixture',
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
    '81000000-0000-4000-8000-000000000001',
    null,
    'TEST_VERSIONING_STATE',
    'Versioning Test State',
    'state',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000001',
    'TEST_VERSIONING_DISTRICT_A',
    'Versioning Test District A',
    'district',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    '81000000-0000-4000-8000-000000000001',
    'TEST_VERSIONING_DISTRICT_B',
    'Versioning Test District B',
    'district',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000004',
    '81000000-0000-4000-8000-000000000002',
    'TEST_VERSIONING_LOCAL_BODY_A',
    'Versioning Test Local Body A',
    'local_body',
    'verified',
    true,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '81000000-0000-4000-8000-000000000005',
    '81000000-0000-4000-8000-000000000003',
    'TEST_VERSIONING_LOCAL_BODY_B',
    'Versioning Test Local Body B',
    'local_body',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
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
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Versioning Test State',
  'XY',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
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
values
  (
    '83000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000001',
    'Versioning Test District A',
    'verified',
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '83000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000003',
    '82000000-0000-4000-8000-000000000001',
    'Versioning Test District B',
    'verified',
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  );

insert into governance.talukas (
  id,
  district_id,
  name,
  verification_status,
  last_verified_on,
  reference_source_id
)
values
  (
    '84000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    'Versioning Test Taluka A',
    'verified',
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000002',
    'Versioning Test Taluka B',
    'verified',
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
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
    '85000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000004',
    '82000000-0000-4000-8000-000000000001',
    'Versioning Test Local Body A',
    'municipal_corporation',
    'verified',
    true,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '85000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000005',
    '82000000-0000-4000-8000-000000000001',
    'Versioning Test Local Body B',
    'municipal_council',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  );

insert into governance.local_body_districts (
  local_body_id,
  district_id,
  is_primary,
  reference_source_id
)
values
  (
    '85000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    true,
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '85000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000002',
    true,
    '80000000-0000-4000-8000-000000000001'
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
    '86000000-0000-4000-8000-000000000001',
    '85000000-0000-4000-8000-000000000001',
    'TEST-VERSIONING-WARD-A',
    'Versioning Test Ward A',
    'A',
    'verified',
    true,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  ),
  (
    '86000000-0000-4000-8000-000000000002',
    '85000000-0000-4000-8000-000000000002',
    'TEST-VERSIONING-WARD-B',
    'Versioning Test Ward B',
    'B',
    'verified',
    false,
    date '2026-07-13',
    '80000000-0000-4000-8000-000000000001'
  );

insert into governance.departments (
  id,
  code,
  name,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '87000000-0000-4000-8000-000000000001',
  'test_versioning_department',
  'Versioning Test Department',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
);

insert into governance.authority_departments (
  id,
  authority_id,
  department_id,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '87100000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000004',
  '87000000-0000-4000-8000-000000000001',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
);

insert into governance.officer_roles (
  id,
  code,
  name,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '87200000-0000-4000-8000-000000000001',
  'test_versioning_role',
  'Versioning Test Role',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
);

insert into governance.officers (
  id,
  full_name,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '87300000-0000-4000-8000-000000000001',
  'Verified Versioning Test Officer',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
);

insert into governance.offices (
  id,
  authority_id,
  authority_department_id,
  district_id,
  taluka_id,
  local_body_id,
  ward_id,
  name,
  office_type,
  verification_status,
  last_verified_on,
  reference_source_id
)
values (
  '87400000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000004',
  '87100000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  '86000000-0000-4000-8000-000000000001',
  'Versioning Test Office',
  'ward office',
  'verified',
  date '2026-07-13',
  '80000000-0000-4000-8000-000000000001'
);

insert into governance.import_batches (
  id,
  dataset_key,
  dataset_version,
  canonical_root,
  manifest_sha256,
  workbook_sha256,
  status
)
values (
  '88000000-0000-4000-8000-000000000001',
  'test_governance_versioning',
  'v1',
  'test/governance/versioning',
  repeat('a', 64),
  repeat('b', 64),
  'pending'
);

insert into governance.import_files (
  id,
  import_batch_id,
  file_name,
  sha256,
  source_row_count,
  accepted_row_count
)
values (
  '88100000-0000-4000-8000-000000000001',
  '88000000-0000-4000-8000-000000000001',
  'versioning-fixture.csv',
  repeat('c', 64),
  1,
  1
);

insert into governance.import_records (
  id,
  import_file_id,
  row_number,
  source_key,
  record_sha256,
  raw_payload,
  validation_status,
  normalization_disposition
)
values (
  '88200000-0000-4000-8000-000000000001',
  '88100000-0000-4000-8000-000000000001',
  1,
  'versioning-fixture-1',
  repeat('d', 64),
  '{"fixture":true}'::jsonb,
  'accepted',
  'reference_only'
);

select lives_ok(
  $$
    update governance.import_batches
    set status = 'validated', validation_summary = '{"errors":0}'::jsonb
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  'a pending import batch can advance to validated'
);
select throws_ok(
  $$
    update governance.import_batches
    set status = 'pending'
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'Import batch status transitions are monotonic.',
  'an import batch cannot move backward to pending'
);
select lives_ok(
  $$
    update governance.import_batches
    set generated_seed_sha256 = repeat('e', 64)
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  'the generated seed hash can be recorded once before import completes'
);
select throws_ok(
  $$
    update governance.import_batches
    set generated_seed_sha256 = repeat('f', 64)
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'The generated seed hash can only be recorded once.',
  'a recorded generated seed hash is immutable'
);
select lives_ok(
  $$
    update governance.import_batches
    set status = 'imported', completed_at = timestamptz '2026-07-13 12:00:00+00'
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  'a validated import batch can complete as imported'
);
select throws_ok(
  $$
    update governance.import_batches
    set validation_summary = '{"errors":0,"lateRewrite":true}'::jsonb
    where id = '88000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'Completed import batches are immutable.',
  'a completed import batch cannot be rewritten'
);
select throws_ok(
  $$delete from governance.import_batches where id = '88000000-0000-4000-8000-000000000001'$$,
  '55000',
  'governance.import_batches records are retained as history and cannot be deleted.',
  'an import batch cannot be deleted'
);
select throws_ok(
  $$
    update governance.import_files
    set warning_count = 1
    where id = '88100000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'governance.import_files import ledger records are immutable.',
  'an import file ledger row cannot be rewritten'
);
select throws_ok(
  $$delete from governance.import_files where id = '88100000-0000-4000-8000-000000000001'$$,
  '55000',
  'governance.import_files records are retained as history and cannot be deleted.',
  'an import file ledger row cannot be deleted'
);
select throws_ok(
  $$
    update governance.import_records
    set source_key = 'rewritten-source-key'
    where id = '88200000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'governance.import_records import ledger records are immutable.',
  'an import record ledger row cannot be rewritten'
);
select throws_ok(
  $$delete from governance.import_records where id = '88200000-0000-4000-8000-000000000001'$$,
  '55000',
  'governance.import_records records are retained as history and cannot be deleted.',
  'an import record ledger row cannot be deleted'
);

select throws_ok(
  $$
    insert into governance.officer_assignments (
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      officer_id,
      status,
      effective_from
    ) values (
      'test:versioning:invalid-role-only',
      1,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      '87300000-0000-4000-8000-000000000001',
      'role_only',
      timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'new row for relation "officer_assignments" violates check constraint "officer_assignments_status_officer_check"',
  'a role-only assignment cannot identify an officer'
);
select throws_ok(
  $$
    insert into governance.officer_assignments (
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      status,
      effective_from
    ) values (
      'test:versioning:invalid-unverified-incumbent',
      1,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      'incumbent_unverified',
      timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'new row for relation "officer_assignments" violates check constraint "officer_assignments_status_officer_check"',
  'an unverified-incumbent assignment must identify an officer'
);
select throws_ok(
  $$
    insert into governance.officer_assignments (
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      status,
      effective_from
    ) values (
      'test:versioning:invalid-active-incumbent',
      1,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      'active',
      timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  '23514',
  'new row for relation "officer_assignments" violates check constraint "officer_assignments_filled_check"',
  'an active assignment must identify an officer'
);
select lives_ok(
  $$
    insert into governance.officer_assignments (
      id,
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      office_id,
      authority_department_id,
      district_id,
      taluka_id,
      local_body_id,
      ward_id,
      responsibility,
      status,
      verification_status,
      is_placeholder,
      effective_from
    ) values (
      '89000000-0000-4000-8000-000000000001',
      'test:versioning:assignment',
      1,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      '87400000-0000-4000-8000-000000000001',
      '87100000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000001',
      '85000000-0000-4000-8000-000000000001',
      '86000000-0000-4000-8000-000000000001',
      'Durable role without a named incumbent',
      'role_only',
      'placeholder',
      true,
      timestamptz '2026-01-01 00:00:00+00'
    )
  $$,
  'a role-only assignment without a person is accepted'
);
select throws_ok(
  $$
    insert into governance.officer_assignments (
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      status,
      effective_from,
      effective_to
    ) values (
      'test:versioning:assignment',
      2,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      'role_only',
      timestamptz '2026-06-01 00:00:00+00',
      timestamptz '2026-12-01 00:00:00+00'
    )
  $$,
  '23P01',
  'conflicting key value violates exclusion constraint "officer_assignments_no_effective_overlap"',
  'assignment versions with the same durable key cannot overlap'
);
select lives_ok(
  $$
    update governance.officer_assignments
    set
      status = 'superseded',
      effective_to = timestamptz '2027-01-01 00:00:00+00'
    where id = '89000000-0000-4000-8000-000000000001'
  $$,
  'a current assignment version can be closed and superseded'
);
select lives_ok(
  $$
    insert into governance.officer_assignments (
      id,
      assignment_key,
      version,
      authority_id,
      officer_role_id,
      office_id,
      authority_department_id,
      district_id,
      taluka_id,
      local_body_id,
      ward_id,
      responsibility,
      status,
      verification_status,
      is_placeholder,
      effective_from
    ) values (
      '89000000-0000-4000-8000-000000000002',
      'test:versioning:assignment',
      2,
      '81000000-0000-4000-8000-000000000004',
      '87200000-0000-4000-8000-000000000001',
      '87400000-0000-4000-8000-000000000001',
      '87100000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000001',
      '85000000-0000-4000-8000-000000000001',
      '86000000-0000-4000-8000-000000000001',
      'Replacement durable role version',
      'role_only',
      'placeholder',
      true,
      timestamptz '2027-01-01 00:00:00+00'
    )
  $$,
  'an adjacent replacement assignment version is accepted'
);
select throws_ok(
  $$
    update governance.officer_assignments
    set responsibility = 'Rewritten responsibility'
    where id = '89000000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'governance.officer_assignments version content is immutable; close the version and append a new row.',
  'assignment version content cannot be rewritten in place'
);
select throws_ok(
  $$
    update governance.officer_assignments
    set status = 'role_only', effective_to = null
    where id = '89000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'A closed version cannot be reopened or re-dated.',
  'a closed assignment version cannot be reopened'
);
select throws_ok(
  $$delete from governance.officer_assignments where id = '89000000-0000-4000-8000-000000000002'$$,
  '55000',
  'governance.officer_assignments records are retained as history and cannot be deleted.',
  'assignment version history cannot be deleted'
);

insert into governance.jurisdiction_boundary_versions (
  id,
  ward_id,
  version,
  boundary,
  status,
  effective_from,
  effective_to
)
values (
  '89100000-0000-4000-8000-000000000001',
  '86000000-0000-4000-8000-000000000002',
  1,
  extensions.st_geomfromtext(
    'MULTIPOLYGON(((20 20,30 20,30 30,20 30,20 20)))',
    4326
  ),
  'inactive',
  timestamptz '2025-01-01 00:00:00+00',
  timestamptz '2028-01-01 00:00:00+00'
);
select throws_ok(
  $$
    insert into governance.jurisdiction_boundary_versions (
      ward_id,
      version,
      boundary,
      status,
      effective_from,
      effective_to
    ) values (
      '86000000-0000-4000-8000-000000000002',
      2,
      extensions.st_geomfromtext(
        'MULTIPOLYGON(((21 21,29 21,29 29,21 29,21 21)))',
        4326
      ),
      'inactive',
      timestamptz '2027-01-01 00:00:00+00',
      timestamptz '2029-01-01 00:00:00+00'
    )
  $$,
  '23P01',
  'conflicting key value violates exclusion constraint "jurisdiction_boundaries_ward_no_effective_overlap"',
  'non-draft boundary versions for one jurisdiction cannot overlap'
);
select lives_ok(
  $$
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
    ) values (
      '89100000-0000-4000-8000-000000000002',
      '85000000-0000-4000-8000-000000000001',
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
      '80000000-0000-4000-8000-000000000001'
    )
  $$,
  'an active verified boundary version can be recorded'
);
select lives_ok(
  $$
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
    ) values (
      '89100000-0000-4000-8000-000000000003',
      '85000000-0000-4000-8000-000000000001',
      2,
      extensions.st_geomfromtext(
        'MULTIPOLYGON(((0 0,12 0,12 12,0 12,0 0)))',
        4326
      ),
      'draft',
      'verified',
      false,
      timestamptz '2027-01-01 00:00:00+00',
      date '2026-07-13',
      '80000000-0000-4000-8000-000000000001'
    )
  $$,
  'a future draft boundary can coexist with the current active version'
);
select lives_ok(
  $$
    update governance.jurisdiction_boundary_versions
    set
      status = 'superseded',
      is_routing_eligible = false,
      effective_to = timestamptz '2027-01-01 00:00:00+00'
    where id = '89100000-0000-4000-8000-000000000002'
  $$,
  'the current boundary version can be closed and superseded'
);
select lives_ok(
  $$
    update governance.jurisdiction_boundary_versions
    set status = 'active', is_routing_eligible = true
    where id = '89100000-0000-4000-8000-000000000003'
  $$,
  'the adjacent draft boundary can be activated after the old version closes'
);
select throws_ok(
  $$
    update governance.jurisdiction_boundary_versions
    set boundary = extensions.st_geomfromtext(
      'MULTIPOLYGON(((0 0,14 0,14 14,0 14,0 0)))',
      4326
    )
    where id = '89100000-0000-4000-8000-000000000003'
  $$,
  '55000',
  'governance.jurisdiction_boundary_versions version content is immutable; close the version and append a new row.',
  'boundary geometry cannot be rewritten in place'
);
select throws_ok(
  $$
    update governance.jurisdiction_boundary_versions
    set status = 'active', is_routing_eligible = true, effective_to = null
    where id = '89100000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'A closed version cannot be reopened or re-dated.',
  'a closed boundary version cannot be reopened'
);
select throws_ok(
  $$delete from governance.jurisdiction_boundary_versions where id = '89100000-0000-4000-8000-000000000003'$$,
  '55000',
  'governance.jurisdiction_boundary_versions records are retained as history and cannot be deleted.',
  'boundary version history cannot be deleted'
);

insert into governance.complaint_routing_references (
  id,
  rule_code,
  version,
  issue_name,
  primary_department_label,
  first_recipient_role_label,
  routing_logic,
  status,
  effective_from,
  effective_to
)
values (
  '89200000-0000-4000-8000-000000000001',
  'TEST-ROUTE-OVERLAP',
  1,
  'Versioning overlap fixture',
  'Versioning Test Department',
  'Versioning Test Role',
  'Reference-only overlap fixture',
  'active',
  timestamptz '2025-01-01 00:00:00+00',
  timestamptz '2028-01-01 00:00:00+00'
);
select throws_ok(
  $$
    insert into governance.complaint_routing_references (
      rule_code,
      version,
      issue_name,
      primary_department_label,
      first_recipient_role_label,
      routing_logic,
      status,
      effective_from,
      effective_to
    ) values (
      'TEST-ROUTE-OVERLAP',
      2,
      'Versioning overlap fixture replacement',
      'Versioning Test Department',
      'Versioning Test Role',
      'Overlapping reference-only fixture',
      'active',
      timestamptz '2027-01-01 00:00:00+00',
      timestamptz '2029-01-01 00:00:00+00'
    )
  $$,
  '23P01',
  'conflicting key value violates exclusion constraint "complaint_routing_references_no_effective_overlap"',
  'non-draft routing-reference versions cannot overlap'
);
select lives_ok(
  $$
    insert into governance.complaint_routing_references (
      id,
      rule_code,
      version,
      issue_name,
      primary_department_id,
      first_recipient_role_id,
      primary_department_label,
      first_recipient_role_label,
      routing_logic,
      normalization_status,
      status,
      verification_status,
      is_routing_eligible,
      effective_from,
      last_verified_on,
      reference_source_id
    ) values (
      '89200000-0000-4000-8000-000000000002',
      'TEST-VERSIONED-ROUTE',
      1,
      'Versioned routing reference',
      '87000000-0000-4000-8000-000000000001',
      '87200000-0000-4000-8000-000000000001',
      'Versioning Test Department',
      'Versioning Test Role',
      'Resolve the verified reference fixture only',
      'resolved',
      'active',
      'verified',
      true,
      timestamptz '2026-01-01 00:00:00+00',
      date '2026-07-13',
      '80000000-0000-4000-8000-000000000001'
    )
  $$,
  'an active verified routing reference can be recorded'
);
select lives_ok(
  $$
    insert into governance.complaint_routing_references (
      id,
      rule_code,
      version,
      issue_name,
      primary_department_id,
      first_recipient_role_id,
      primary_department_label,
      first_recipient_role_label,
      routing_logic,
      normalization_status,
      status,
      verification_status,
      is_routing_eligible,
      effective_from,
      last_verified_on,
      reference_source_id
    ) values (
      '89200000-0000-4000-8000-000000000003',
      'TEST-VERSIONED-ROUTE',
      2,
      'Versioned routing reference replacement',
      '87000000-0000-4000-8000-000000000001',
      '87200000-0000-4000-8000-000000000001',
      'Versioning Test Department',
      'Versioning Test Role',
      'Resolve the replacement verified reference fixture only',
      'resolved',
      'draft',
      'verified',
      false,
      timestamptz '2027-01-01 00:00:00+00',
      date '2026-07-13',
      '80000000-0000-4000-8000-000000000001'
    )
  $$,
  'a future draft routing reference can coexist with the active version'
);
select lives_ok(
  $$
    update governance.complaint_routing_references
    set
      status = 'superseded',
      is_routing_eligible = false,
      effective_to = timestamptz '2027-01-01 00:00:00+00'
    where id = '89200000-0000-4000-8000-000000000002'
  $$,
  'the active routing reference can be closed and superseded'
);
select lives_ok(
  $$
    update governance.complaint_routing_references
    set status = 'active', is_routing_eligible = true
    where id = '89200000-0000-4000-8000-000000000003'
  $$,
  'the adjacent draft routing reference can activate after closure'
);
select throws_ok(
  $$
    update governance.complaint_routing_references
    set routing_logic = 'Rewritten routing reference logic'
    where id = '89200000-0000-4000-8000-000000000003'
  $$,
  '55000',
  'governance.complaint_routing_references version content is immutable; close the version and append a new row.',
  'routing-reference content cannot be rewritten in place'
);
select throws_ok(
  $$
    update governance.complaint_routing_references
    set status = 'active', is_routing_eligible = true, effective_to = null
    where id = '89200000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'A closed version cannot be reopened or re-dated.',
  'a closed routing-reference version cannot be reopened'
);
select throws_ok(
  $$delete from governance.complaint_routing_references where id = '89200000-0000-4000-8000-000000000003'$$,
  '55000',
  'governance.complaint_routing_references records are retained as history and cannot be deleted.',
  'routing-reference version history cannot be deleted'
);

select throws_ok(
  $$
    update governance.wards
    set local_body_id = '85000000-0000-4000-8000-000000000002'
    where id = '86000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'governance.wards scope key local_body_id is immutable; create or supersede a record instead.',
  'a ward cannot be reparented to a different local body'
);
select throws_ok(
  $$
    update governance.authorities
    set parent_authority_id = '81000000-0000-4000-8000-000000000004'
    where id = '81000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'governance.authorities scope key parent_authority_id is immutable; create or supersede a record instead.',
  'an authority cannot be reparented beneath its own descendant'
);
select throws_ok(
  $$
    insert into governance.authorities (
      id,
      parent_authority_id,
      code,
      name,
      authority_type
    ) values
      (
        '89900000-0000-4000-8000-000000000001',
        '89900000-0000-4000-8000-000000000002',
        'TEST_BULK_CYCLE_A',
        'Bulk Cycle Authority A',
        'other'
      ),
      (
        '89900000-0000-4000-8000-000000000002',
        '89900000-0000-4000-8000-000000000001',
        'TEST_BULK_CYCLE_B',
        'Bulk Cycle Authority B',
        'other'
      )
  $$,
  '23514',
  'Authority parent relationships cannot contain a cycle.',
  'a single bulk insert cannot create a mutual authority cycle'
);
select throws_ok(
  $$
    insert into governance.authorities (
      code,
      name,
      authority_type
    ) values (
      'TEST_PARENTLESS_DISTRICT',
      'Parentless Test District',
      'district'
    )
  $$,
  '23514',
  'Authority parent type is incompatible with child authority type.',
  'a structured district authority must have a state parent'
);
select throws_ok(
  $$
    insert into governance.authorities (
      parent_authority_id,
      code,
      name,
      authority_type
    ) values (
      '81000000-0000-4000-8000-000000000004',
      'TEST_NESTED_STATE',
      'Nested Test State',
      'state'
    )
  $$,
  '23514',
  'Authority parent type is incompatible with child authority type.',
  'a state authority cannot be nested under a local body'
);
select lives_ok(
  $$
    insert into governance.authorities (
      parent_authority_id,
      code,
      name,
      authority_type
    ) values (
      '81000000-0000-4000-8000-000000000004',
      'TEST_MUNICIPAL_UTILITY',
      'Municipal Test Utility',
      'utility'
    )
  $$,
  'a utility authority may be scoped under a local body'
);

select * from finish();
rollback;
