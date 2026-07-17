begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(44);

select is(
  (
    select count(*)::integer
    from governance.import_batches
    where dataset_key = 'mh_governance'
  ),
  1,
  'one canonical Maharashtra import batch is seeded'
);
select results_eq(
  $$
    select dataset_key, dataset_version
    from governance.import_batches
    where dataset_key = 'mh_governance'
  $$,
  $$values ('mh_governance'::text, 'MH_MASTER_GOVERNANCE_DATA_v1'::text)$$,
  'the import batch identifies the pinned Maharashtra baseline'
);
select ok(
  exists (
    select 1 from governance.import_batches
    where dataset_key = 'mh_governance'
      and manifest_sha256 ~ '^[0-9a-f]{64}$'
      and workbook_sha256 ~ '^[0-9a-f]{64}$'
      and generated_seed_sha256 ~ '^[0-9a-f]{64}$'
  ),
  'the import batch preserves manifest, workbook, and generated-seed checksums'
);
select is(
  (select status from governance.import_batches where dataset_key = 'mh_governance'),
  'imported',
  'the canonical batch is marked imported only after validation'
);
select is(
  (
    select count(*)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  19,
  '18 CSVs and one workbook are recorded for the Maharashtra baseline'
);
select is(
  (
    select sum(file.source_row_count)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  901,
  'import-file row totals include 887 data rows and 14 README metadata rows'
);
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  901,
  'every canonical Maharashtra row has immutable provenance'
);
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
      and file.file_name not like '%/README.csv'
  ),
  887,
  'all non-README CSV records are retained'
);
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
      and file.file_name like '%/README.csv'
  ),
  14,
  'README metadata is retained as provenance rather than entities'
);
select results_eq(
  $$
    select record.normalization_disposition, count(*)::bigint
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
    group by record.normalization_disposition
    order by record.normalization_disposition
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
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
      and record.validation_status = 'rejected'
  ),
  0,
  'the hash-pinned baseline has no rejected structural rows'
);
select cmp_ok(
  (select count(*)::integer from governance.reference_sources),
  '>=',
  32,
  'all Maharashtra bootstrap and pilot source URLs remain catalogued'
);
select is(
  (select count(distinct url)::integer from governance.reference_sources),
  (select count(*)::integer from governance.reference_sources),
  'source URLs remain unique as additional reviewed datasets are imported'
);
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
  2,
  'only the explicitly activated Maharashtra and BMC staging authorities can route'
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
select is(
  (select count(*)::integer from governance.wards where is_placeholder),
  70,
  'all supplied synthetic Maharashtra ward references remain retained'
);
select is(
  (select count(*)::integer from governance.wards where is_placeholder and not is_routing_eligible),
  70,
  'every synthetic ward remains a non-routable placeholder'
);
select is(
  (select count(*)::integer from governance.wards where is_placeholder and lgd_code is null),
  70,
  'synthetic ward IDs are not misrepresented as LGD codes'
);
select is(
  (select count(*)::integer from governance.departments where code not like 'bmc_%'),
  16,
  'the original Maharashtra department references remain seeded'
);
select is(
  (
    select count(*)::integer
    from governance.offices as office
    inner join governance.import_records as record on record.id = office.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  38,
  'the original Maharashtra office references remain seeded'
);
select is(
  (
    select count(*)::integer
    from governance.officer_roles as role
    inner join governance.import_records as record on record.id = role.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  23,
  'the original Maharashtra durable officer-role references remain seeded'
);
select is(
  (
    select count(*)::integer
    from governance.officers as officer
    inner join governance.import_records as record on record.id = officer.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  0,
  'Maharashtra officer placeholders do not create people'
);
select is(
  (
    select count(*)::integer
    from governance.officer_assignments as assignment
    inner join governance.import_records as record on record.id = assignment.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  0,
  'Maharashtra officer templates do not create assignments'
);
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
select is(
  (
    select count(*)::integer
    from governance.complaint_routing_references as reference
    inner join governance.import_records as record on record.id = reference.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  18,
  'all original Maharashtra complaint-routing rows remain retained as references'
);
select is(
  (
    select count(*)::integer from governance.complaint_routing_references
    where rule_code not like 'BMC_R%'
      and status = 'draft'
      and normalization_status = 'unresolved'
      and not is_routing_eligible
      and primary_department_id is null
      and first_recipient_role_id is null
  ),
  18,
  'routing references remain unresolved and non-operational'
);
select is(
  (
    select count(*)::integer
    from governance.complaint_routing_references
    where rule_code not like 'BMC_R%'
      and is_emergency
  ),
  3,
  'emergency routing metadata is preserved without activating routing'
);
select is(
  (
    select count(*)::integer
    from governance.jurisdiction_boundary_versions as boundary
    inner join governance.import_records as record on record.id = boundary.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  0,
  'the original Maharashtra baseline fabricates no geometry'
);
select is(
  (
    select count(*)::integer
    from governance.administrative_units as unit
    inner join governance.import_records as record on record.id = unit.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  0,
  'Maharashtra template villages are not promoted to administrative units'
);
select is(
  (
    select count(*)::integer
    from governance.authority_departments as department
    inner join governance.import_records as record on record.id = department.import_record_id
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
  ),
  0,
  'Maharashtra free-text department labels are not silently mapped to authorities'
);
select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'mh_governance'
      and record.normalized_table is not null
  ),
  789,
  'only operational/reference source rows receive normalized targets'
);
select ok(
  not exists (
    select 1
    from governance.wards
    where is_placeholder
      and (verification_status = 'verified' or is_routing_eligible)
  ),
  'placeholder wards are never presented as verified'
);

select * from finish();
rollback;
