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
