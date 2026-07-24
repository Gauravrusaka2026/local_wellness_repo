begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(40);

select is(
  (
    select count(*)::integer
    from governance.import_batches
    where dataset_key = 'bmc_demo_governance'
      and dataset_version = 'MUMBAI_BMC_DEMO_BOOTSTRAP_DATA_v1'
  ),
  1,
  'one hash-pinned BMC demo import batch is seeded'
);

select ok(
  exists (
    select 1
    from governance.import_batches
    where dataset_key = 'bmc_demo_governance'
      and status = 'imported'
      and manifest_sha256 ~ '^[0-9a-f]{64}$'
      and workbook_sha256 ~ '^[0-9a-f]{64}$'
      and generated_seed_sha256 ~ '^[0-9a-f]{64}$'
      and validation_summary ->> 'externalDeliveryApproved' = 'false'
  ),
  'the BMC batch records validation hashes and denies external delivery'
);

select is(
  (
    select count(*)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
  ),
  10,
  'all ten workbook sheets are preserved as generated CSV import files'
);

select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
  ),
  114,
  'all 114 BMC workbook rows retain immutable provenance'
);

select is(
  (
    select sum(file.source_row_count)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
  ),
  114,
  'BMC import-file source counts reconcile to the workbook total'
);

select results_eq(
  $$
    select record.normalization_disposition, count(*)::bigint
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
    group by record.normalization_disposition
    order by record.normalization_disposition
  $$,
  $$
    values
      ('normalized'::text, 99::bigint),
      ('reference_only'::text, 15::bigint)
  $$,
  'BMC records have explicit normalization dispositions'
);

select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
      and record.validation_status = 'rejected'
  ),
  0,
  'the reviewed BMC bootstrap has no structurally rejected rows'
);

select is(
  (
    select count(*)::integer
    from governance.reference_sources
    where url in (
      'https://dm.mcgm.gov.in/assets/pdf/Final%20updated%20Final%20Connect%20Diary%202021.07.07.2021.pdf',
      'https://www.mcgm.gov.in/irj/portal/anonymous',
      'https://www.mcgm.gov.in/irj/portal/anonymous/BMC-on-Map-Wards-Offices',
      'https://marg.mcgm.gov.in/',
      'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/238/query?where=1%3d1&outFields=GISMASTER.Wards.OBJECTID%2cGISMASTER.Wards.NAME%2cGISMASTER.Wards.FLAGID%2cGISMASTER.Wards.ZONE&returnGeometry=true&outSR=4326&orderByFields=GISMASTER.Wards.NAME&f=geojson'
    )
  ),
  5,
  'BMC normalization retains all official reference and geometry URLs'
);

select ok(
  exists (
    select 1
    from governance.authorities
    where id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ),
  'the BMC authority is verified for internal staging routing'
);

select ok(
  exists (
    select 1
    from governance.local_bodies
    where id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ),
  'the BMC local body is verified for internal staging routing'
);

select is(
  (
    select count(*)::integer
    from governance.administrative_units
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and unit_type = 'zone'
  ),
  7,
  'all seven BMC administrative zones are normalized'
);

select is(
  (
    select count(*)::integer
    from governance.administrative_units
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and unit_type = 'zone'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ),
  7,
  'all BMC zones are source-verified and internally routable'
);

select is(
  (
    select count(*)::integer
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-%'
      and source_ward_code not like 'BMC-LEGACY-GEOMETRY-%'
  ),
  26,
  'all 26 official operational BMC ward codes are normalized'
);

select is(
  (
    select count(*)::integer
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-%'
      and source_ward_code not like 'BMC-LEGACY-GEOMETRY-%'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
  ),
  26,
  'all operational BMC wards are source-verified and non-placeholder'
);

select is(
  (
    select count(*)::integer
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-%'
      and source_ward_code not like 'BMC-LEGACY-GEOMETRY-%'
      and is_routing_eligible
  ),
  22,
  'the 22 one-to-one BMC operational wards are internally routable'
);

select results_eq(
  $$
    select ward_number
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-%'
      and source_ward_code not like 'BMC-LEGACY-GEOMETRY-%'
      and not is_routing_eligible
    order by ward_number
  $$,
  $$values ('K/N'::text), ('K/S'::text), ('P/E'::text), ('P/W'::text)$$,
  'the four split operational wards remain verified but non-auto-routable'
);

select is(
  (
    select count(*)::integer
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-LEGACY-GEOMETRY-%'
  ),
  2,
  'two durable legacy geometry anchors preserve K/E and P/N identities'
);

select is(
  (
    select count(*)::integer
    from governance.wards
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and source_ward_code like 'BMC-LEGACY-GEOMETRY-%'
      and verification_status = 'verified'
      and not is_placeholder
      and not is_routing_eligible
  ),
  2,
  'legacy geometry anchors are verified references but cannot receive routes'
);

select is(
  (
    select count(*)::integer
    from governance.jurisdiction_boundary_versions
    where ward_id in (
      select id
      from governance.wards
      where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
    )
  ),
  24,
  'all 24 official legacy BMC polygons are versioned'
);

select ok(
  not exists (
    select 1
    from governance.jurisdiction_boundary_versions
    where ward_id in (
      select id
      from governance.wards
      where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
    )
      and (
        not extensions.st_isvalid(boundary)
        or extensions.st_isempty(boundary)
        or extensions.st_srid(boundary) <> 4326
        or extensions.geometrytype(boundary) <> 'MULTIPOLYGON'
      )
  ),
  'every BMC ward boundary is a valid non-empty EPSG:4326 MultiPolygon'
);

select is(
  (
    select count(*)::integer
    from governance.jurisdiction_boundary_versions
    where ward_id in (
      select id
      from governance.wards
      where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
    )
      and is_routing_eligible
  ),
  22,
  'only one-to-one BMC ward boundaries are internally routable'
);

select is(
  (
    select count(*)::integer
    from governance.jurisdiction_boundary_versions
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ),
  1,
  'the unioned BMC local-body boundary is versioned and internally routable'
);

select ok(
  (
    select extensions.st_area(boundary::extensions.geography) / 1000000
    from governance.jurisdiction_boundary_versions
    where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and status = 'active'
  ) between 450 and 500,
  'the BMC unioned jurisdiction area is within the reviewed source envelope'
);

select ok(
  abs(
    (
      select extensions.st_area(boundary::extensions.geography)
      from governance.jurisdiction_boundary_versions
      where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
        and status = 'active'
    ) - (
      select sum(extensions.st_area(boundary::extensions.geography))
      from governance.jurisdiction_boundary_versions
      where ward_id in (
        select id
        from governance.wards
        where local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      )
    )
  ) < 1,
  'the BMC unioned jurisdiction reconciles to the non-overlapping ward areas'
);

select is(
  (
    select count(*)::integer
    from governance.ward_administrative_zone_membership_versions as membership
    inner join governance.wards as ward on ward.id = membership.operational_ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
  ),
  26,
  'every operational BMC ward has one versioned zone membership'
);

select results_eq(
  $$
    select membership.is_routing_eligible, count(*)::bigint
    from governance.ward_administrative_zone_membership_versions as membership
    inner join governance.wards as ward on ward.id = membership.operational_ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
    group by membership.is_routing_eligible
    order by membership.is_routing_eligible
  $$,
  $$values (false, 4::bigint), (true, 22::bigint)$$,
  'zone-membership routing eligibility follows the ward split policy'
);

select is(
  (
    select count(*)::integer
    from governance.ward_boundary_crosswalk_versions as crosswalk
    inner join governance.wards as ward on ward.id = crosswalk.operational_ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
  ),
  26,
  'every operational BMC ward has a versioned legacy-boundary crosswalk'
);

select is(
  (
    select count(*)::integer
    from governance.ward_boundary_crosswalk_versions as crosswalk
    inner join governance.wards as ward on ward.id = crosswalk.operational_ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and crosswalk.relationship_type = 'one_to_one'
      and crosswalk.auto_route_allowed
      and crosswalk.is_routing_eligible
  ),
  22,
  '22 one-to-one crosswalks permit internal automatic routing'
);

select results_eq(
  $$
    select ward.ward_number
    from governance.ward_boundary_crosswalk_versions as crosswalk
    inner join governance.wards as ward on ward.id = crosswalk.operational_ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and crosswalk.relationship_type = 'one_to_many_child'
      and not crosswalk.auto_route_allowed
      and not crosswalk.is_routing_eligible
    order by ward.ward_number
  $$,
  $$values ('K/N'::text), ('K/S'::text), ('P/E'::text), ('P/W'::text)$$,
  'split crosswalks are explicit and remain in the review queue'
);

select is(
  (
    select count(*)::integer
    from governance.authority_departments
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
  ),
  20,
  'all 20 BMC departments are mapped to the BMC authority'
);

select is(
  (
    select count(*)::integer
    from governance.authority_departments
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and status = 'active'
      and verification_status = 'verified'
      and not is_placeholder
      and is_routing_eligible
  ),
  20,
  'all mapped BMC departments are source-verified and internally routable'
);

select is(
  (
    select count(*)::integer
    from governance.offices
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
  ),
  47,
  'BMC headquarters, 26 ward offices, and 20 department offices are normalized'
);

select is(
  (
    select count(*)::integer
    from governance.offices
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and office_type = 'ward_office'
      and not is_routing_eligible
  ),
  4,
  'the four split-ward offices remain visible but non-auto-routable'
);

select is(
  (
    select count(*)::integer
    from governance.officers as officer
    inner join governance.import_records as record on record.id = officer.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'bmc_demo_governance'
      and officer.verification_status = 'verified'
      and not officer.is_placeholder
  ),
  71,
  '71 named BMC incumbents are preserved as source-verified non-placeholder people'
);

select ok(
  not exists (
    select 1
    from governance.officers
    where lower(full_name) in ('vacant', 'none', 'n/a', 'unknown', 'tbd')
  ),
  'vacancies and placeholder labels never become officer identities'
);

select is(
  (
    select count(*)::integer
    from governance.officer_assignments
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and assignment_key like 'bmc:%'
  ),
  75,
  'BMC durable roles have 75 versioned source-backed assignments'
);

select results_eq(
  $$
    select status, count(*)::bigint
    from governance.officer_assignments
    where authority_id = '3fabe3b8-47cf-58fe-a59c-bb34bd02322a'
      and assignment_key like 'bmc:%'
    group by status
    order by status
  $$,
  $$values ('active'::text, 74::bigint), ('role_only'::text, 1::bigint)$$,
  'vacant responsibility is retained as a role-only assignment'
);

select is(
  (
    select count(*)::integer
    from governance.complaint_routing_references
    where rule_code like 'BMC_R%'
  ),
  14,
  'all 14 BMC issue-routing references are normalized'
);

select is(
  (
    select count(*)::integer
    from governance.complaint_routing_references
    where rule_code like 'BMC_R%'
      and status = 'active'
      and verification_status = 'verified'
      and normalization_status = 'resolved'
      and not is_placeholder
      and is_routing_eligible
  ),
  14,
  'BMC routing references are active only for the internal staging queue'
);

select is(
  (
    select count(*)::integer
    from routing.ward_issue_contacts as contact
    inner join governance.wards as ward on ward.id = contact.ward_id
    where ward.local_body_id = 'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'
      and contact.is_active
  ),
  338,
  'the compact V1 matrix retains all 26 BMC wards by 13 routing profiles'
);

select * from finish();
rollback;
