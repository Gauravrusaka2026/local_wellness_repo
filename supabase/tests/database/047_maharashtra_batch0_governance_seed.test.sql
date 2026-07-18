begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(23);

select is(
  (
    select count(*)::integer
    from governance.import_batches
    where dataset_key = 'maharashtra_governance_batch0'
      and dataset_version = 'MH-LW-BATCH0-2026-07-18'
  ),
  1,
  'one Maharashtra Batch 0 import is recorded'
);

select ok(
  exists (
    select 1
    from governance.import_batches
    where dataset_key = 'maharashtra_governance_batch0'
      and status = 'imported'
      and workbook_sha256 is null
      and source_bundle_sha256 = '731c4aaad413b529ffdbd3638627d222bc4d3cf0714fe130ac54a75e06b1b7e4'
      and manifest_sha256 ~ '^[0-9a-f]{64}$'
      and generated_seed_sha256 ~ '^[0-9a-f]{64}$'
  ),
  'the ZIP-only batch pins its bundle, manifest, and generated seed without fabricating a workbook hash'
);

select ok(
  exists (
    select 1
    from governance.import_batches
    where dataset_key = 'maharashtra_governance_batch0'
      and validation_summary ->> 'routingApproved' = 'false'
      and validation_summary ->> 'externalDeliveryApproved' = 'false'
      and validation_summary ->> 'suppliedValidationFailed' = 'true'
  ),
  'the batch records its review gates and supplied validation failure'
);

select is(
  (
    select count(*)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
  ),
  29,
  'the ZIP plus all 28 archive members are represented in the import ledger'
);

select is(
  (
    select sum(file.source_row_count)::integer
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
  ),
  160,
  'the import-file row counts reconcile to all supplied CSV records'
);

select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
  ),
  160,
  'all supplied CSV rows retain immutable import provenance'
);

select results_eq(
  $$
    select record.normalization_disposition, count(*)::bigint
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
    group by record.normalization_disposition
    order by record.normalization_disposition
  $$,
  $$
    values
      ('normalized'::text, 36::bigint),
      ('reference_only'::text, 124::bigint)
  $$,
  'only the state and 35 exact district matches are normalized'
);

select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and record.validation_messages @> '[{"code":"SENSITIVE_QUERY_REDACTED"}]'::jsonb
  ),
  4,
  'all four transient-token observations are explicitly marked as redacted'
);

select ok(
  not exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and record.raw_payload::text ~* 'OWASP_CSRFTOKEN='
  ),
  'transient CSRF query values never enter staged JSON'
);

select is(
  (select lgd_code from governance.states where iso_code = 'MH'),
  '27',
  'Maharashtra receives its source-backed LGD code'
);

select is(
  (
    select count(*)::integer
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    inner join governance.districts as district on district.id = record.normalized_record_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and file.file_name = '04_districts.csv'
      and record.normalization_disposition = 'normalized'
      and district.lgd_code = record.raw_payload ->> 'lgd_code'
  ),
  35,
  '35 exact canonical districts receive their source-backed LGD codes'
);

select ok(
  not exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    inner join governance.districts as district on district.id = record.normalized_record_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and file.file_name = '04_districts.csv'
      and district.is_routing_eligible
  ),
  'LGD enrichment does not make districts routing-eligible'
);

select ok(
  exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and record.source_key = 'district:lgd:482'
      and record.normalization_disposition = 'reference_only'
      and record.normalized_table is null
      and record.normalized_record_id is null
      and record.validation_messages @> '[{"code":"AMBIGUOUS_CANONICAL_NAME"}]'::jsonb
  ),
  'ambiguous Mumbai LGD 482 remains quarantined without a canonical target'
);

select ok(
  not exists (
    select 1
    from governance.districts
    where state_id = 'ed4e7b9a-45ef-5180-8b26-19ccac5f9fc6'
      and name = 'Mumbai'
  ),
  'the seed does not create a duplicate Mumbai district'
);

select is(
  (select lgd_code from governance.districts where name = 'Mumbai City'),
  null,
  'Mumbai City is not assigned LGD 482 without a reviewed crosswalk'
);

select ok(
  not exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and record.normalized_table not in ('governance.states', 'governance.districts')
  ),
  'no operational governance table receives a normalized Batch 0 record'
);

select is(
  (
    select count(distinct source.id)::integer
    from governance.reference_sources as source
    inner join governance.import_records as record
      on source.url = record.raw_payload ->> 'canonical_url'
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and file.file_name = '01_source_registry.csv'
  ),
  38,
  'all 38 canonical official source URLs are catalogued'
);

select ok(
  not exists (
    select 1
    from governance.reference_sources
    where url ~* 'OWASP_CSRFTOKEN='
  ),
  'the source registry uses canonical URLs rather than tokenized retrieval URLs'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'governance.import_batches'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'governance.import_files'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'governance.import_records'::regclass),
  'RLS remains enabled across the Batch 0 import ledger'
);

select ok(
  not has_table_privilege('anon', 'governance.import_batches', 'SELECT')
    and not has_table_privilege('anon', 'governance.import_files', 'SELECT')
    and not has_table_privilege('anon', 'governance.import_records', 'SELECT'),
  'anonymous clients cannot read governance import evidence'
);

select ok(
  exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and file.file_name = 'source_files/PMC-CARE-Booklet.pdf'
      and file.source_row_count = 0
  ) is false,
  'binary PDF evidence is retained as a file and never represented as a current contact row'
);

select ok(
  exists (
    select 1
    from governance.import_files as file
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and file.file_name = 'source_files/PMC-CARE-Booklet.pdf'
      and file.source_row_count = 0
  ),
  'the stale PMC booklet is retained only as immutable file evidence'
);

select ok(
  not exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    inner join governance.import_batches as batch on batch.id = file.import_batch_id
    where batch.dataset_key = 'maharashtra_governance_batch0'
      and record.validation_status = 'rejected'
  ),
  'structurally valid rows are staged with warnings rather than silently discarded'
);

select * from finish();
rollback;
