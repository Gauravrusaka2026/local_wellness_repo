begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, governance, extensions;

select plan(12);

select has_column(
  'governance',
  'import_batches',
  'source_bundle_sha256',
  'import batches can pin an immutable source bundle'
);

select col_type_is(
  'governance',
  'import_batches',
  'source_bundle_sha256',
  'text',
  'source-bundle hashes are stored as text'
);

select ok(
  not (
    select attribute.attnotnull
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'governance.import_batches'::regclass
      and attribute.attname = 'workbook_sha256'
  ),
  'workbook hashes are optional for source-bundle-only imports'
);

select ok(
  not (
    select attribute.attnotnull
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'governance.import_batches'::regclass
      and attribute.attname = 'source_bundle_sha256'
  ),
  'source-bundle hashes are optional for workbook-only imports'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'governance.import_batches'::regclass
      and constraint_record.conname = 'import_batches_source_bundle_sha256_check'
      and constraint_record.contype = 'c'
  ),
  'source-bundle hashes have a format constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'governance.import_batches'::regclass
      and constraint_record.conname = 'import_batches_source_artifact_check'
      and constraint_record.contype = 'c'
  ),
  'every import batch must pin at least one source artifact'
);

select lives_ok(
  $$
    insert into governance.import_batches (
      id,
      dataset_key,
      dataset_version,
      canonical_root,
      manifest_sha256,
      workbook_sha256
    ) values (
      '46000000-0000-4000-8000-000000000001',
      'pgtap_workbook_import',
      'PGTAP_WORKBOOK_V1',
      'resources/governance/test-workbook.xlsx',
      repeat('a', 64),
      repeat('b', 64)
    )
  $$,
  'existing workbook-backed import shape remains valid'
);

select lives_ok(
  $$
    insert into governance.import_batches (
      id,
      dataset_key,
      dataset_version,
      canonical_root,
      manifest_sha256,
      source_bundle_sha256
    ) values (
      '46000000-0000-4000-8000-000000000002',
      'pgtap_source_bundle_import',
      'PGTAP_SOURCE_BUNDLE_V1',
      'resources/governance/test-source-bundle.zip',
      repeat('c', 64),
      repeat('d', 64)
    )
  $$,
  'ZIP source-bundle imports do not require a fabricated workbook hash'
);

select is(
  (
    select workbook_sha256
    from governance.import_batches
    where id = '46000000-0000-4000-8000-000000000002'
  ),
  null,
  'source-bundle-only imports retain a null workbook hash'
);

select throws_ok(
  $$
    update governance.import_batches
    set source_bundle_sha256 = repeat('e', 64)
    where id = '46000000-0000-4000-8000-000000000002'
  $$,
  '55000',
  'Import batch identity and canonical source hashes are immutable.',
  'a recorded source-bundle hash cannot be replaced'
);

select throws_ok(
  $$
    insert into governance.import_batches (
      dataset_key,
      dataset_version,
      canonical_root,
      manifest_sha256,
      source_bundle_sha256
    ) values (
      'pgtap_invalid_bundle_hash',
      'PGTAP_INVALID_BUNDLE_HASH_V1',
      'resources/governance/invalid-source-bundle.zip',
      repeat('e', 64),
      'not-a-sha256'
    )
  $$,
  '23514',
  null,
  'malformed source-bundle hashes are rejected'
);

select throws_ok(
  $$
    insert into governance.import_batches (
      dataset_key,
      dataset_version,
      canonical_root,
      manifest_sha256
    ) values (
      'pgtap_missing_source_artifact',
      'PGTAP_MISSING_SOURCE_ARTIFACT_V1',
      'resources/governance/missing-source-artifact',
      repeat('f', 64)
    )
  $$,
  '23514',
  null,
  'an import batch cannot omit both workbook and source-bundle hashes'
);

select * from finish();
rollback;
