-- Generated SQL Editor forward-fix for Maharashtra Batch 0.
-- Source: supabase/migrations/20260718110000_governance_source_bundle_imports.sql
-- SHA-256: fdad9b29c845ba1749eb08fdb2c9d0140d6a0c926fe95692ea23e0eb9d62f411
-- Safe states: the source migration is either wholly absent or wholly complete.

begin;
do $maharashtra_batch0_schema_deployment$
declare
  bundle_column_exists boolean;
  bundle_hash_constraint_exists boolean;
  source_artifact_constraint_exists boolean;
  workbook_hash_is_nullable boolean;
begin
  select exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'governance.import_batches'::regclass
      and attname = 'source_bundle_sha256'
      and not attisdropped
  ) into bundle_column_exists;

  select exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'governance.import_batches'::regclass
      and conname = 'import_batches_source_bundle_sha256_check'
  ) into bundle_hash_constraint_exists;

  select exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'governance.import_batches'::regclass
      and conname = 'import_batches_source_artifact_check'
  ) into source_artifact_constraint_exists;

  select not attnotnull
  into workbook_hash_is_nullable
  from pg_catalog.pg_attribute
  where attrelid = 'governance.import_batches'::regclass
    and attname = 'workbook_sha256'
    and not attisdropped;

  if bundle_column_exists
    and bundle_hash_constraint_exists
    and source_artifact_constraint_exists
    and workbook_hash_is_nullable then
    raise notice 'Source-bundle import support is already complete; skipping.';
    return;
  end if;

  if bundle_column_exists
    or bundle_hash_constraint_exists
    or source_artifact_constraint_exists
    or workbook_hash_is_nullable then
    raise exception using
      errcode = '55000',
      message = 'MAHARASHTRA_BATCH0_SOURCE_BUNDLE_SCHEMA_PARTIAL',
      hint = 'Reconcile the partial migration before retrying; do not suppress this guard.';
  end if;

  execute $source_migration$
alter table governance.import_batches
  add column source_bundle_sha256 text;

alter table governance.import_batches
  alter column workbook_sha256 drop not null;

alter table governance.import_batches
  add constraint import_batches_source_bundle_sha256_check check (
    source_bundle_sha256 is null
    or source_bundle_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add constraint import_batches_source_artifact_check check (
    workbook_sha256 is not null or source_bundle_sha256 is not null
  );

comment on column governance.import_batches.workbook_sha256 is
  'SHA-256 of the exact human-reference workbook bytes for workbook-backed imports; null for source-bundle-only imports.';

comment on column governance.import_batches.source_bundle_sha256 is
  'SHA-256 of the exact immutable source-bundle archive bytes, including ZIP research or bootstrap bundles; null for workbook-only imports.';

comment on constraint import_batches_source_artifact_check
  on governance.import_batches is
  'Every import batch must pin at least one exact source artifact: a workbook, a source bundle, or both.';
$source_migration$;

  if not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'governance.import_batches'::regclass
      and attname = 'source_bundle_sha256'
      and not attisdropped
  ) or not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'governance.import_batches'::regclass
      and conname = 'import_batches_source_artifact_check'
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_SOURCE_BUNDLE_SCHEMA_VERIFY_FAILED';
  end if;
end
$maharashtra_batch0_schema_deployment$;
commit;
