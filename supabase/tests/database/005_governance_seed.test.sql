begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(44);

select is((select count(*)::integer from governance.import_batches), 1, 'one canonical import batch is seeded');
select results_eq(
  $$select dataset_key, dataset_version from governance.import_batches$$,
  $$values ('mh_governance'::text, 'MH_MASTER_GOVERNANCE_DATA_v1'::text)$$,
  'the import batch identifies the pinned Maharashtra baseline'
);
select ok(
  exists (
    select 1 from governance.import_batches
    where manifest_sha256 ~ '^[0-9a-f]{64}$'
      and workbook_sha256 ~ '^[0-9a-f]{64}$'
      and generated_seed_sha256 ~ '^[0-9a-f]{64}$'
  ),
  'the import batch preserves manifest, workbook, and generated-seed checksums'
);
select is(
  (select status from governance.import_batches),
  'imported',
  'the canonical batch is marked imported only after validation'
);
select is((select count(*)::integer from governance.import_files), 19, '18 CSVs and one workbook are recorded');
select is(
  (select sum(source_row_count)::integer from governance.import_files),
  901,
  'import-file row totals include 887 data rows and 14 README metadata rows'
);
select is((select count(*)::integer from governance.import_records), 901, 'every canonical row has immutable provenance');
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    where file.file_name not like '%/README.csv'
  ),
  887,
  'all non-README CSV records are retained'
);
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    where file.file_name like '%/README.csv'
  ),
  14,
  'README metadata is retained as provenance rather than entities'
);
select results_eq(
  $$
    select normalization_disposition, count(*)::bigint
    from governance.import_records
    group by normalization_disposition
    order by normalization_disposition
  $$,
  $$
    values
      ('normalized'::text, 700::bigint),
      ('placeholder_preserved'::text, 165::bigint),
      ('reference_only'::text, 36::bigint)
  $$,
  'normalization dispositions preserve accepted, placeholder, and reference-only rows explicitly'
);
select is(
  (select count(*)::integer from governance.import_records where validation_status = 'rejected'),
  0,
  'the hash-pinned baseline has no rejected structural rows'
);
select is((select count(*)::integer from governance.reference_sources), 22, 'all distinct source URLs are catalogued');
select is((select count(distinct url)::integer from governance.reference_sources), 22, 'source URLs are unique');
select is(
  (
    select count(*)::integer from governance.reference_sources
    where url in (
      'https://maharashtrasadan.maharashtra.gov.in/en/',
      'https://mmrda.maharashtra.gov.in/',
      'https://nhai.gov.in/',
      'https://plan.maharashtra.gov.in/en/36-districts/',
      'https://raigad.gov.in/en/helpline/',
      'https://www.mahametro.org/'
    )
  ),
  6,
  'entity-row URLs omitted from Reference_Links.csv remain preserved'
);
select is((select count(*)::integer from governance.authorities), 239, 'canonical grantable authorities are seeded');
select is(
  (select count(*)::integer from governance.authorities where is_routing_eligible),
  0,
  'baseline authorities cannot route before identifiers, geometry, and mappings are verified'
);
select is((select count(*)::integer from governance.states), 1, 'Maharashtra is seeded once');
select is((select count(*)::integer from governance.districts), 36, 'all supplied districts are seeded');
select is((select count(*)::integer from governance.talukas), 359, 'all supplied talukas are seeded');
select is(
  (select count(*)::integer from governance.talukas where lgd_code is null),
  359,
  'taluka LGD placeholders normalize to null'
);
select is((select count(*)::integer from governance.local_bodies), 190, 'the supplied urban-local-body baseline is seeded');
select is((select count(*)::integer from governance.local_body_districts), 191, 'local-body district coverage includes both BMC districts');
select is(
  (
    select count(*)::integer
    from governance.local_body_districts as coverage
    inner join governance.local_bodies as local_body on local_body.id = coverage.local_body_id
    where local_body.name = 'Brihanmumbai Municipal Corporation'
  ),
  2,
  'BMC retains both supplied district relationships'
);
select is(
  (
    select count(*)::integer
    from governance.local_body_districts as coverage
    inner join governance.local_bodies as local_body on local_body.id = coverage.local_body_id
    where local_body.name = 'Brihanmumbai Municipal Corporation' and coverage.is_primary
  ),
  0,
  'no primary BMC district is invented when the source does not identify one'
);
select is((select count(*)::integer from governance.wards), 70, 'all supplied ward references are retained');
select is(
  (select count(*)::integer from governance.wards where is_placeholder and not is_routing_eligible),
  70,
  'every synthetic ward remains a non-routable placeholder'
);
select is(
  (select count(*)::integer from governance.wards where lgd_code is null),
  70,
  'synthetic ward IDs are not misrepresented as LGD codes'
);
select is((select count(*)::integer from governance.departments), 16, 'department references are seeded');
select is((select count(*)::integer from governance.offices), 38, 'office references are seeded');
select is((select count(*)::integer from governance.officer_roles), 23, 'durable officer-role references are seeded');
select is((select count(*)::integer from governance.officers), 0, 'officer placeholders do not create people');
select is((select count(*)::integer from governance.officer_assignments), 0, 'officer templates do not create assignments');
select is((select count(*)::integer from governance.utilities), 10, 'utility references are seeded');
select is((select count(*)::integer from governance.emergency_contacts), 14, 'alternate emergency numbers are normalized separately');
select is(
  (select count(*)::integer from governance.emergency_contacts where is_placeholder and contact_value is null),
  1,
  'the district-specific emergency framework remains an unusable placeholder'
);
select ok(
  not exists (
    select 1 from governance.emergency_contacts
    where contact_value is not null and contact_value !~ '^[0-9]+$'
  ),
  'normalized emergency contact values are machine-safe numeric strings'
);
select is((select count(*)::integer from governance.complaint_routing_references), 18, 'all complaint-routing rows are retained as references');
select is(
  (
    select count(*)::integer from governance.complaint_routing_references
    where status = 'draft'
      and normalization_status = 'unresolved'
      and not is_routing_eligible
      and primary_department_id is null
      and first_recipient_role_id is null
  ),
  18,
  'routing references remain unresolved and non-operational'
);
select is(
  (select count(*)::integer from governance.complaint_routing_references where is_emergency),
  3,
  'emergency routing metadata is preserved without activating routing'
);
select is((select count(*)::integer from governance.jurisdiction_boundary_versions), 0, 'no geometry is fabricated');
select is((select count(*)::integer from governance.administrative_units), 0, 'template villages are not promoted to administrative units');
select is((select count(*)::integer from governance.authority_departments), 0, 'free-text department labels are not silently mapped to authorities');
select is(
  (select count(*)::integer from governance.import_records where normalized_table is not null),
  789,
  'only operational/reference source rows receive normalized targets'
);
select ok(
  not exists (
    select 1
    from governance.wards
    where verification_status = 'verified' or is_routing_eligible
  ),
  'placeholder wards are never presented as verified'
);

select * from finish();
rollback;
