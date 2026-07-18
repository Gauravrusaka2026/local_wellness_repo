import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(
  repositoryRoot,
  'resources/governance/manifests/maharashtra-batch0-2026-07-18.v1.json',
);
const validationPath = join(
  repositoryRoot,
  'resources/governance/manifests/maharashtra-batch0-2026-07-18.v1.validation.json',
);
const seedPath = join(
  repositoryRoot,
  'supabase/seed/60_maharashtra_batch0_governance.generated.sql',
);
const checksumPath = join(
  repositoryRoot,
  'supabase/seed/61_maharashtra_batch0_governance_checksum.generated.sql',
);
const deploymentDirectory = join(repositoryRoot, 'supabase/deploy/maharashtra-batch0');
const deploymentSchemaPath = join(deploymentDirectory, '01_source_bundle_import_support.sql');
const deploymentSeedPath = join(deploymentDirectory, '02_batch0_reference_and_lgd_seed.sql');
const deploymentChecksumPath = join(deploymentDirectory, '03_batch0_seed_checksum.sql');
const deploymentReadmePath = join(deploymentDirectory, 'README.md');
const sourceBundleMigrationPath = join(
  repositoryRoot,
  'supabase/migrations/20260718110000_governance_source_bundle_imports.sql',
);

const stableUuidNamespace = 'f4f74f8d-dfe5-5b1f-a5d2-64705c90d68c';
const maharashtraStateId = 'ed4e7b9a-45ef-5180-8b26-19ccac5f9fc6';
const sensitiveQueryParameterPattern = /^(?:owasp_)?csrf(?:token)?$/iu;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const normalizeGovernanceKey = (value) =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replaceAll(/\s+/gu, ' ');
const repositoryPath = (absolutePath) =>
  relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
const sqlText = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlText(JSON.stringify(value))}::jsonb`;

const uuidBytes = (value) => Buffer.from(value.replaceAll('-', ''), 'hex');
const formatUuid = (value) => {
  const hex = value.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)]
    .join('-')
    .toLowerCase();
};
const stableGovernanceUuid = (kind, naturalKey) => {
  const digest = createHash('sha1')
    .update(uuidBytes(stableUuidNamespace))
    .update(Buffer.from(`${kind}:${naturalKey}`, 'utf8'))
    .digest()
    .subarray(0, 16);
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  return formatUuid(digest);
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isSafeArchiveMember = (fileName) => {
  if (
    fileName.length === 0 ||
    fileName.includes('\0') ||
    fileName.includes('\\') ||
    fileName.startsWith('/') ||
    /^[a-z]:/iu.test(fileName)
  ) {
    return false;
  }
  const normalized = posix.normalize(fileName);
  return normalized === fileName && normalized !== '..' && !normalized.startsWith('../');
};

const readZipEntries = (archive, maximumUncompressedBytes) => {
  const endOfDirectorySignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const localFileSignature = 0x04034b50;
  const earliestEndOfDirectory = Math.max(0, archive.length - 65_557);
  let endOfDirectoryOffset = -1;
  for (let offset = archive.length - 22; offset >= earliestEndOfDirectory; offset -= 1) {
    if (archive.readUInt32LE(offset) === endOfDirectorySignature) {
      endOfDirectoryOffset = offset;
      break;
    }
  }
  assert(endOfDirectoryOffset >= 0, 'Source bundle is not a supported ZIP archive.');
  assert(
    archive.readUInt16LE(endOfDirectoryOffset + 4) === 0 &&
      archive.readUInt16LE(endOfDirectoryOffset + 6) === 0,
    'Multi-disk ZIP archives are not supported.',
  );
  const entryCount = archive.readUInt16LE(endOfDirectoryOffset + 10);
  assert(
    entryCount === archive.readUInt16LE(endOfDirectoryOffset + 8),
    'ZIP entry counts disagree.',
  );
  let centralDirectoryOffset = archive.readUInt32LE(endOfDirectoryOffset + 16);
  const entries = new Map();
  let expandedBytes = 0;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    assert(
      archive.readUInt32LE(centralDirectoryOffset) === centralDirectorySignature,
      `ZIP central-directory entry ${entryIndex} is malformed.`,
    );
    const flags = archive.readUInt16LE(centralDirectoryOffset + 8);
    const compressionMethod = archive.readUInt16LE(centralDirectoryOffset + 10);
    const compressedSize = archive.readUInt32LE(centralDirectoryOffset + 20);
    const uncompressedSize = archive.readUInt32LE(centralDirectoryOffset + 24);
    const fileNameLength = archive.readUInt16LE(centralDirectoryOffset + 28);
    const extraFieldLength = archive.readUInt16LE(centralDirectoryOffset + 30);
    const commentLength = archive.readUInt16LE(centralDirectoryOffset + 32);
    const externalAttributes = archive.readUInt32LE(centralDirectoryOffset + 38);
    const localHeaderOffset = archive.readUInt32LE(centralDirectoryOffset + 42);
    const fileNameStart = centralDirectoryOffset + 46;
    const fileName = archive
      .subarray(fileNameStart, fileNameStart + fileNameLength)
      .toString((flags & 0x0800) === 0 ? 'latin1' : 'utf8');
    const unixMode = externalAttributes >>> 16;

    assert(isSafeArchiveMember(fileName), `Unsafe ZIP member path: ${fileName}.`);
    assert(!entries.has(fileName), `Duplicate ZIP member path: ${fileName}.`);
    assert((flags & 0x0001) === 0, `Encrypted ZIP member is not supported: ${fileName}.`);
    assert((unixMode & 0o170000) !== 0o120000, `Symbolic-link ZIP member rejected: ${fileName}.`);
    assert(
      compressionMethod === 0 || compressionMethod === 8,
      `Unsupported compression method ${compressionMethod} for ${fileName}.`,
    );
    expandedBytes += uncompressedSize;
    assert(
      expandedBytes <= maximumUncompressedBytes,
      `ZIP expansion exceeds ${maximumUncompressedBytes} bytes.`,
    );
    assert(
      compressedSize === 0 || uncompressedSize / compressedSize <= 200,
      `Suspicious compression ratio for ${fileName}.`,
    );
    assert(
      archive.readUInt32LE(localHeaderOffset) === localFileSignature,
      `ZIP local header is malformed for ${fileName}.`,
    );
    const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = archive.readUInt16LE(localHeaderOffset + 28);
    const compressedDataStart =
      localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = archive.subarray(
      compressedDataStart,
      compressedDataStart + compressedSize,
    );
    const contents =
      compressionMethod === 0 ? Buffer.from(compressedData) : inflateRawSync(compressedData);
    assert(
      contents.length === uncompressedSize,
      `ZIP member ${fileName} expanded to an unexpected size.`,
    );
    entries.set(fileName, contents);
    centralDirectoryOffset += 46 + fileNameLength + extraFieldLength + commentLength;
  }
  return { entries, expandedBytes };
};

const parseCsv = (bytes, fileName, headerRowIndex = 0) => {
  const contents = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/u, '');
  assert(!contents.includes('\u0000'), `${fileName} contains a NUL byte.`);
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  let index = 0;
  while (index < contents.length) {
    const character = contents[index];
    if (quoted) {
      if (character === '"') {
        if (contents[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }
    if (character === '"') {
      assert(field.length === 0, `${fileName} has a quote inside an unquoted field.`);
      quoted = true;
      index += 1;
      continue;
    }
    if (character === ',') {
      record.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (character === '\n' || character === '\r') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      if (character === '\r' && contents[index + 1] === '\n') {
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }
    field += character;
    index += 1;
  }
  assert(!quoted, `${fileName} ends inside a quoted field.`);
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  assert(records.length > 0, `${fileName} is missing its header row.`);
  assert(records.length > headerRowIndex, `${fileName} is missing its configured header row.`);
  const headers = records[headerRowIndex];
  assert(
    headers.every((header) => header.length > 0),
    `${fileName} has a blank header.`,
  );
  assert(new Set(headers).size === headers.length, `${fileName} has duplicate headers.`);
  const rows = records.slice(headerRowIndex + 1).map((values, rowIndex) => {
    assert(
      values.length === headers.length,
      `${fileName}:${rowIndex + headerRowIndex + 2} has ${values.length} columns; expected ${headers.length}.`,
    );
    assert(
      values.every((value) => !/^[=+\-@]/u.test(value)),
      `${fileName}:${rowIndex + headerRowIndex + 2} contains a spreadsheet-formula prefix.`,
    );
    return Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]]));
  });
  return { headers, rows };
};

const parseInternalManifest = (contents) => {
  const entries = new Map();
  for (const [lineIndex, line] of contents.toString('utf8').trim().split(/\r?\n/u).entries()) {
    const match = /^([0-9a-f]{64}) {2}([^\r\n]+)$/u.exec(line);
    assert(match !== null, `MANIFEST.sha256:${lineIndex + 1} is malformed.`);
    const [, digest, fileName] = match;
    assert(isSafeArchiveMember(fileName), `Unsafe internal-manifest path: ${fileName}.`);
    assert(!entries.has(fileName), `Duplicate internal-manifest entry: ${fileName}.`);
    entries.set(fileName, digest);
  }
  return entries;
};

const sanitizeUrl = (value, sensitiveNames) => {
  try {
    const url = new URL(value);
    let redacted = false;
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveNames.has(key.toLocaleLowerCase('en-US'))) {
        url.searchParams.delete(key);
        redacted = true;
      }
    }
    return { value: redacted ? url.toString() : value, redacted };
  } catch {
    return { value, redacted: false };
  }
};

const sanitizeText = (value, sensitiveNames) => {
  let redacted = false;
  const sanitized = value.replaceAll(/https?:\/\/[^\s,"<>]+/gu, (candidate) => {
    const result = sanitizeUrl(candidate, sensitiveNames);
    redacted ||= result.redacted;
    return result.value;
  });
  return { value: sanitized, redacted };
};

const sanitizeRecord = (row, sensitiveNames) => {
  const sanitized = {};
  let redacted = false;
  for (const [key, value] of Object.entries(row)) {
    const result = sanitizeText(value, sensitiveNames);
    sanitized[key] = result.value;
    redacted ||= result.redacted;
  }
  if (redacted && sanitized.canonical_url && sanitized.source_url) {
    sanitized.source_url = sanitized.canonical_url;
  }
  return { row: sanitized, redacted };
};

const datePart = (value) => {
  const match = /^\d{4}-\d{2}-\d{2}/u.exec(value);
  return match?.[0] ?? null;
};

const validationMessages = ({ fileName, row, redacted, normalized, quarantined }) => {
  const messages = [];
  if (redacted) {
    messages.push({
      code: 'SENSITIVE_QUERY_REDACTED',
      message:
        'A transient CSRF query parameter was removed from staged JSON; the original row hash remains pinned.',
    });
  }
  if (fileName === '03_states.csv' || fileName === '04_districts.csv') {
    messages.push({
      code: 'SOURCE_NON_ROUTABLE',
      field: 'routable',
      message: 'The supplied hierarchy record is explicitly non-routable.',
    });
    messages.push({
      code: 'EFFECTIVE_DATE_MISSING',
      field: 'effective_from',
      message:
        'The official page did not publish an effective date; only the LGD identifier may enrich an exact existing match.',
    });
  }
  if (fileName === '02_source_discrepancies.csv') {
    messages.push({
      code: 'SOURCE_CONFLICT_QUARANTINED',
      message: 'This observation belongs to an unresolved official-source discrepancy group.',
    });
  }
  if (fileName === '20_data_issues.csv') {
    messages.push({
      code: 'DATA_ISSUE_REVIEW_REQUIRED',
      message: 'The supplied issue remains open and is retained for human review.',
    });
  }
  if (fileName === '24_validation_report.csv' && row.result === 'fail') {
    messages.push({
      code: 'SUPPLIED_VALIDATION_FAILURE',
      message: 'The supplied validation report records an unresolved failure.',
    });
  }
  if (fileName === '01_source_registry.csv' && row.verification_status !== 'source_verified') {
    messages.push({
      code: row.verification_status === 'stale' ? 'STALE_SOURCE_REFERENCE' : 'SOURCE_UNVERIFIED',
      field: 'verification_status',
      message: 'This source observation is retained as inactive review evidence.',
    });
  }
  if (quarantined) {
    messages.push({
      code: 'AMBIGUOUS_CANONICAL_NAME',
      field: 'name_en',
      message:
        'Mumbai does not exactly match the canonical Mumbai City record; an explicit reviewed crosswalk is required.',
    });
  }
  if (normalized) {
    messages.push({
      code: 'LGD_ENRICHMENT_ONLY',
      field: 'lgd_code',
      message:
        'Only the LGD code is applied; existing verification, provenance, and routing eligibility are preserved.',
    });
  }
  return messages;
};

const sourceKey = (table, row) => row[table.primaryKey] || null;

const renderValues = (rows) => rows.map((row) => `  (${row.join(', ')})`).join(',\n');

const renderSeedSql = ({
  manifest,
  manifestSha256,
  archive,
  tables,
  importFiles,
  importRecords,
  referenceSources,
  districtMatches,
  batchId,
}) => {
  const sourceRows = referenceSources.map((source) => [
    sqlText(source.id),
    sqlText(source.title),
    sqlText(source.url),
    sqlText('official'),
    sqlText(source.purpose),
    source.lastCheckedOn === null ? 'null' : `${sqlText(source.lastCheckedOn)}::date`,
    sqlText(source.status),
  ]);
  const fileRows = importFiles.map((file) => [
    sqlText(file.id),
    sqlText(batchId),
    sqlText(file.fileName),
    sqlText(file.sha256),
    String(file.sourceRowCount),
    String(file.sourceRowCount),
    '0',
    String(file.warningCount),
    sqlJson(file.validationSummary),
  ]);
  const recordRows = importRecords.map((record) => [
    sqlText(record.id),
    sqlText(record.importFileId),
    String(record.rowNumber),
    record.sourceKey === null ? 'null' : sqlText(record.sourceKey),
    sqlText(record.recordSha256),
    sqlJson(record.rawPayload),
    sqlText(record.messages.length === 0 ? 'accepted' : 'accepted_with_warnings'),
    sqlJson(record.messages),
    record.isPlaceholder ? 'true' : 'false',
    sqlText(record.disposition),
    record.normalizedTable === null ? 'null' : sqlText(record.normalizedTable),
    record.normalizedRecordId === null ? 'null' : sqlText(record.normalizedRecordId),
  ]);
  const districtValues = districtMatches.map(
    (district) =>
      `    (${sqlText(district.id)}::uuid, ${sqlText(district.name)}, ${sqlText(district.lgdCode)})`,
  );
  const warningCount = importRecords.reduce((total, record) => total + record.messages.length, 0);
  const csvRows = [...tables.values()].reduce((total, table) => total + table.rows.length, 0);

  return `-- Generated by scripts/generate-maharashtra-batch0-governance.mjs. Do not edit manually.
-- Batch 0 is an immutable hierarchy/source snapshot. It does not activate routing,
-- contacts, officials, boundaries, synchronization endpoints, or external delivery.

begin;

insert into governance.reference_sources (
  id, title, url, source_type, purpose, last_checked_on, status
)
values
${renderValues(sourceRows)}
on conflict (url) do nothing;

insert into governance.import_batches (
  id,
  dataset_key,
  dataset_version,
  canonical_root,
  manifest_sha256,
  workbook_sha256,
  source_bundle_sha256,
  generated_seed_sha256,
  status,
  validation_summary,
  started_at,
  completed_at
)
values (
  ${sqlText(batchId)},
  ${sqlText(manifest.datasetKey)},
  ${sqlText(manifest.datasetVersion)},
  ${sqlText(archive.path)},
  ${sqlText(manifestSha256)},
  null,
  ${sqlText(archive.sha256)},
  null,
  'imported',
  ${sqlJson({
    independentValidation: 'passed_with_warnings',
    suppliedValidationFailed: true,
    rawSourceRecords: csvRows,
    warnings: warningCount,
    normalizedHierarchyRecords: 36,
    exactDistrictMatches: districtMatches.length,
    quarantinedDistricts: manifest.promotion.quarantinedDistrictSourceIds.length,
    routingApproved: false,
    externalDeliveryApproved: false,
  })},
  ${sqlText(manifest.generatedAt)}::timestamptz,
  ${sqlText(manifest.generatedAt)}::timestamptz
)
on conflict (dataset_key, dataset_version) do nothing;

do $maharashtra_batch0_identity_guard$
begin
  if not exists (
    select 1
    from governance.import_batches
    where id = ${sqlText(batchId)}
      and dataset_key = ${sqlText(manifest.datasetKey)}
      and dataset_version = ${sqlText(manifest.datasetVersion)}
      and manifest_sha256 = ${sqlText(manifestSha256)}
      and source_bundle_sha256 = ${sqlText(archive.sha256)}
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_IMPORT_IDENTITY_MISMATCH';
  end if;
end
$maharashtra_batch0_identity_guard$;

insert into governance.import_files (
  id,
  import_batch_id,
  file_name,
  sha256,
  source_row_count,
  accepted_row_count,
  rejected_row_count,
  warning_count,
  validation_summary
)
values
${renderValues(fileRows)}
on conflict (import_batch_id, file_name) do nothing;

insert into governance.import_records (
  id,
  import_file_id,
  row_number,
  source_key,
  record_sha256,
  raw_payload,
  validation_status,
  validation_messages,
  is_placeholder,
  normalization_disposition,
  normalized_table,
  normalized_record_id
)
values
${renderValues(recordRows)}
on conflict (import_file_id, row_number) do nothing;

do $maharashtra_batch0_lgd_preflight$
declare
  matched_districts integer;
begin
  if not exists (
    select 1
    from governance.states
    where id = ${sqlText(maharashtraStateId)}
      and iso_code = 'MH'
      and name = 'Maharashtra'
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_CANONICAL_STATE_MISSING';
  end if;

  if exists (
    select 1 from governance.states
    where id = ${sqlText(maharashtraStateId)}
      and lgd_code is not null
      and lgd_code <> '27'
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_STATE_LGD_CONFLICT';
  end if;

  with expected (id, name, lgd_code) as (
    values
${districtValues.join(',\n')}
  )
  select count(*)
  into matched_districts
  from expected
  inner join governance.districts as district
    on district.id = expected.id
   and district.name = expected.name
   and district.state_id = ${sqlText(maharashtraStateId)};

  if matched_districts <> ${districtMatches.length} then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_CANONICAL_DISTRICT_MISMATCH';
  end if;

  if exists (
    with expected (id, name, lgd_code) as (
      values
${districtValues.join(',\n')}
    )
    select 1
    from expected
    inner join governance.districts as district on district.id = expected.id
    where district.lgd_code is not null
      and district.lgd_code <> expected.lgd_code
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_DISTRICT_LGD_CONFLICT';
  end if;

  if exists (
    select 1 from governance.districts
    where state_id = ${sqlText(maharashtraStateId)} and name = 'Mumbai'
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_AMBIGUOUS_MUMBAI_ALREADY_EXISTS';
  end if;
end
$maharashtra_batch0_lgd_preflight$;

update governance.states
set lgd_code = coalesce(lgd_code, '27')
where id = ${sqlText(maharashtraStateId)};

with expected (id, name, lgd_code) as (
  values
${districtValues.join(',\n')}
)
update governance.districts as district
set lgd_code = coalesce(district.lgd_code, expected.lgd_code)
from expected
where district.id = expected.id
  and district.name = expected.name;

do $maharashtra_batch0_verification$
declare
  batch_file_count integer;
  batch_record_count integer;
  normalized_record_count integer;
  reference_record_count integer;
  enriched_district_count integer;
begin
  select count(*) into batch_file_count
  from governance.import_files
  where import_batch_id = ${sqlText(batchId)};

  select
    count(*),
    count(*) filter (where record.normalization_disposition = 'normalized'),
    count(*) filter (where record.normalization_disposition = 'reference_only')
  into batch_record_count, normalized_record_count, reference_record_count
  from governance.import_records as record
  inner join governance.import_files as file on file.id = record.import_file_id
  where file.import_batch_id = ${sqlText(batchId)};

  if batch_file_count <> ${importFiles.length}
    or batch_record_count <> ${csvRows}
    or normalized_record_count <> 36
    or reference_record_count <> ${csvRows - 36} then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_IMPORT_LEDGER_INCOMPLETE';
  end if;

  if (select lgd_code from governance.states where id = ${sqlText(maharashtraStateId)}) <> '27' then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_STATE_LGD_NOT_APPLIED';
  end if;

  with expected (id, name, lgd_code) as (
    values
${districtValues.join(',\n')}
  )
  select count(*) into enriched_district_count
  from expected
  inner join governance.districts as district
    on district.id = expected.id and district.lgd_code = expected.lgd_code;

  if enriched_district_count <> ${districtMatches.length} then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_DISTRICT_LGD_NOT_APPLIED';
  end if;

  if exists (
    select 1
    from governance.import_records as record
    inner join governance.import_files as file on file.id = record.import_file_id
    where file.import_batch_id = ${sqlText(batchId)}
      and record.source_key = 'district:lgd:482'
      and (
        record.normalization_disposition <> 'reference_only'
        or record.normalized_record_id is not null
      )
  ) then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_AMBIGUOUS_MUMBAI_PROMOTED';
  end if;
end
$maharashtra_batch0_verification$;

commit;
`;
};

const renderChecksumSql = ({
  manifest,
  batchId,
  generatedSeedSha256,
}) => `-- Generated companion for the Maharashtra Batch 0 seed.
-- Records the main seed SHA-256 without making the seed self-referential.
begin;
do $maharashtra_batch0_checksum$
declare
  affected_rows integer;
begin
  update governance.import_batches
  set generated_seed_sha256 = ${sqlText(generatedSeedSha256)}
  where id = ${sqlText(batchId)}
    and dataset_key = ${sqlText(manifest.datasetKey)}
    and dataset_version = ${sqlText(manifest.datasetVersion)}
    and (
      generated_seed_sha256 is null
      or generated_seed_sha256 = ${sqlText(generatedSeedSha256)}
    );

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = '55000', message = 'MAHARASHTRA_BATCH0_CHECKSUM_BATCH_MISMATCH';
  end if;
end
$maharashtra_batch0_checksum$;
commit;
`;

const renderSchemaDeploymentSql = (
  migrationSql,
  migrationSha256,
) => `-- Generated SQL Editor forward-fix for Maharashtra Batch 0.
-- Source: supabase/migrations/20260718110000_governance_source_bundle_imports.sql
-- SHA-256: ${migrationSha256}
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
${migrationSql.trim()}
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
`;

const renderDeploymentReadme = ({
  schema,
  seed,
  checksum,
}) => `# Maharashtra Batch 0 SQL Editor deployment

This package stages the reviewed Batch 0 archive and applies only safe LGD enrichment. It does **not** create or activate municipalities, wards, geometry, contacts, officers, routing rules, synchronization endpoints, or external complaint delivery.

Run these files in Supabase **SQL Editor** in order:

1. \`01_source_bundle_import_support.sql\`
2. \`02_batch0_reference_and_lgd_seed.sql\`
3. \`03_batch0_seed_checksum.sql\`

The target must already contain the Local Wellness schema through \`20260718100000_complaint_routing_evidence_diagnostics.sql\` and the canonical Phase 2 Maharashtra seed. The second file fails closed if Maharashtra or any of the 35 exact district matches is missing or has a conflicting LGD code.

Reviewed artifact hashes:

- schema forward-fix: \`${sha256(schema)}\`
- Batch 0 seed: \`${sha256(seed)}\`
- checksum companion: \`${sha256(checksum)}\`

The seed is rerunnable after a successful application. The schema guard skips only a complete prior application and rejects partial state.
`;

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

export const buildMaharashtraBatch0Artifacts = async () => {
  const [manifestBytes, canonicalDistrictBytes, sourceBundleMigrationBytes] = await Promise.all([
    readFile(manifestPath),
    readFile(join(repositoryRoot, 'resources/governance/csv/Districts.csv')),
    readFile(sourceBundleMigrationPath),
  ]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert(
    sha256(canonicalDistrictBytes) === manifest.reconciliation.canonicalDistrictsSha256,
    'Canonical Districts.csv changed; create or review a new Batch 0 reconciliation contract.',
  );
  const archivePath = join(repositoryRoot, manifest.archive.path);
  const archiveBytes = await readFile(archivePath);
  assert(archiveBytes.length === manifest.archive.byteSize, 'Source-bundle byte size changed.');
  assert(sha256(archiveBytes) === manifest.archive.sha256, 'Source-bundle SHA-256 changed.');
  const { entries, expandedBytes } = readZipEntries(
    archiveBytes,
    manifest.archive.maximumUncompressedBytes,
  );
  assert(
    entries.size === manifest.archive.expectedMemberCount,
    'Source-bundle member count changed.',
  );
  const actualMembers = [...entries.keys()].sort();
  const expectedMembers = [...manifest.expectedMembers].sort();
  assert(
    JSON.stringify(actualMembers) === JSON.stringify(expectedMembers),
    'Source-bundle member inventory changed.',
  );

  const internalManifestBytes = entries.get(manifest.internalManifest.path);
  assert(internalManifestBytes !== undefined, 'Internal SHA-256 manifest is missing.');
  assert(
    sha256(internalManifestBytes) === manifest.internalManifest.sha256,
    'Internal SHA-256 manifest changed.',
  );
  const internalManifest = parseInternalManifest(internalManifestBytes);
  assert(
    internalManifest.size === entries.size - 1,
    'Internal manifest does not cover every payload member.',
  );
  for (const [fileName, expectedSha256] of internalManifest) {
    const contents = entries.get(fileName);
    assert(contents !== undefined, `Internal-manifest member ${fileName} is missing.`);
    assert(sha256(contents) === expectedSha256, `Internal hash mismatch for ${fileName}.`);
  }

  const tables = new Map();
  for (const [fileName, contract] of Object.entries(manifest.tables)) {
    const bytes = entries.get(fileName);
    assert(bytes !== undefined, `${fileName} is missing from the source bundle.`);
    const table = parseCsv(bytes, fileName);
    assert(
      sha256(JSON.stringify(table.headers)) === contract.headerSha256,
      `${fileName} headers changed.`,
    );
    assert(table.rows.length === contract.expectedRows, `${fileName} row count changed.`);
    const keys = table.rows.map((row) => row[contract.primaryKey]);
    assert(keys.every(Boolean), `${fileName} contains a blank primary key.`);
    assert(new Set(keys).size === keys.length, `${fileName} contains duplicate primary keys.`);
    const rowHashes = table.rows.map((row) => sha256(JSON.stringify(row)));
    assert(new Set(rowHashes).size === rowHashes.length, `${fileName} contains duplicate rows.`);
    tables.set(fileName, { ...table, ...contract });
  }

  const stateRows = tables.get('03_states.csv').rows;
  assert(
    stateRows.length === 1 &&
      stateRows[0].lgd_code === '27' &&
      stateRows[0].name_en === 'Maharashtra' &&
      stateRows[0].routable === 'false',
    'Maharashtra state identity or non-routable status changed.',
  );
  const districtRows = tables.get('04_districts.csv').rows;
  assert(
    districtRows.every((row) => /^\d+$/u.test(row.lgd_code) && row.routable === 'false'),
    'District LGD codes must be numeric and all Batch 0 districts must remain non-routable.',
  );
  assert(
    new Set(districtRows.map((row) => row.lgd_code)).size === districtRows.length,
    'District LGD codes are not unique.',
  );
  const wardBoundaries = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(entries.get('08_ward_boundaries.geojson')),
  );
  assert(
    wardBoundaries.type === 'FeatureCollection' &&
      Array.isArray(wardBoundaries.features) &&
      wardBoundaries.features.length === 0 &&
      wardBoundaries.metadata?.verification_status === 'placeholder' &&
      wardBoundaries.metadata?.routable === false,
    'Batch 0 ward geometry must remain an empty, placeholder, non-routable FeatureCollection.',
  );

  const canonicalDistricts = parseCsv(
    canonicalDistrictBytes,
    'resources/governance/csv/Districts.csv',
    1,
  );
  assert(
    canonicalDistricts.rows.length === manifest.reconciliation.expectedCanonicalDistrictCount,
    'Canonical district count changed.',
  );
  const canonicalByName = new Map(
    canonicalDistricts.rows.map((row) => [normalizeGovernanceKey(row.District), row.District]),
  );
  assert(
    canonicalByName.size === canonicalDistricts.rows.length,
    'Canonical district names are not unique.',
  );
  const districtMatches = districtRows
    .filter((row) => canonicalByName.has(normalizeGovernanceKey(row.name_en)))
    .map((row) => {
      const name = canonicalByName.get(normalizeGovernanceKey(row.name_en));
      return {
        sourceId: row.district_id,
        id: stableGovernanceUuid('district', normalizeGovernanceKey(name)),
        name,
        lgdCode: row.lgd_code,
      };
    });
  const quarantinedDistricts = districtRows.filter(
    (row) => !canonicalByName.has(normalizeGovernanceKey(row.name_en)),
  );
  assert(
    districtMatches.length === manifest.promotion.expectedExactDistrictMatches,
    'Exact canonical district match count changed.',
  );
  assert(
    JSON.stringify(quarantinedDistricts.map((row) => row.district_id).sort()) ===
      JSON.stringify([...manifest.promotion.quarantinedDistrictSourceIds].sort()),
    'Quarantined district set changed.',
  );

  const batchId = stableGovernanceUuid(
    'import-batch',
    `${manifest.datasetKey}:${manifest.datasetVersion}`,
  );
  const sensitiveNames = new Set(
    manifest.security.redactedQueryParameterNames.map((name) => name.toLocaleLowerCase('en-US')),
  );
  for (const name of sensitiveNames) {
    assert(
      sensitiveQueryParameterPattern.test(name),
      `Sensitive-query parameter ${name} is outside the supported CSRF-token policy.`,
    );
  }

  const archiveImportFile = {
    id: stableGovernanceUuid(
      'import-file',
      `${batchId}:${manifest.archive.path}:${manifest.archive.sha256}`,
    ),
    fileName: manifest.archive.path,
    sha256: manifest.archive.sha256,
    sourceRowCount: 0,
    warningCount: 0,
    validationSummary: { disposition: 'immutable_source_bundle', memberCount: entries.size },
  };
  const importFiles = [archiveImportFile];
  const importRecords = [];
  let redactedRecordCount = 0;

  for (const fileName of manifest.expectedMembers) {
    const bytes = entries.get(fileName);
    const table = tables.get(fileName);
    const fileSha256 = sha256(bytes);
    const importFileId = stableGovernanceUuid(
      'import-file',
      `${batchId}:${fileName}:${fileSha256}`,
    );
    let fileWarningCount = 0;
    if (table !== undefined) {
      for (const [rowIndex, originalRow] of table.rows.entries()) {
        const { row, redacted } = sanitizeRecord(originalRow, sensitiveNames);
        redactedRecordCount += redacted ? 1 : 0;
        const isState = fileName === '03_states.csv';
        const matchingDistrict =
          fileName === '04_districts.csv'
            ? districtMatches.find((match) => match.sourceId === originalRow.district_id)
            : undefined;
        const quarantined = manifest.promotion.quarantinedDistrictSourceIds.includes(
          originalRow.district_id,
        );
        const normalized = isState || matchingDistrict !== undefined;
        const normalizedRecordId = isState ? maharashtraStateId : (matchingDistrict?.id ?? null);
        const messages = validationMessages({
          fileName,
          row,
          redacted,
          normalized,
          quarantined,
        });
        fileWarningCount += messages.length;
        const recordSha256 = sha256(JSON.stringify(originalRow));
        importRecords.push({
          id: stableGovernanceUuid(
            'import-record',
            `${importFileId}:${rowIndex + 2}:${recordSha256}`,
          ),
          importFileId,
          rowNumber: rowIndex + 2,
          sourceKey: sourceKey(table, originalRow),
          recordSha256,
          rawPayload: row,
          messages,
          isPlaceholder: originalRow.verification_status === 'placeholder',
          disposition: normalized ? 'normalized' : 'reference_only',
          normalizedTable: isState
            ? 'governance.states'
            : matchingDistrict === undefined
              ? null
              : 'governance.districts',
          normalizedRecordId,
        });
      }
    }
    importFiles.push({
      id: importFileId,
      fileName,
      sha256: fileSha256,
      sourceRowCount: table?.rows.length ?? 0,
      warningCount: fileWarningCount,
      validationSummary: {
        disposition: table?.disposition ?? 'immutable_reference_file',
        memberSha256Verified: fileName !== manifest.internalManifest.path,
        headerSha256Verified: table !== undefined,
      },
    });
  }

  const sourceTable = tables.get('01_source_registry.csv');
  const sourceVerificationCounts = Object.fromEntries(
    ['source_verified', 'unverified', 'stale'].map((status) => [
      status,
      sourceTable.rows.filter((row) => row.verification_status === status).length,
    ]),
  );
  const referenceSources = sourceTable.rows.map((row) => {
    const urlResult = sanitizeUrl(row.canonical_url, sensitiveNames);
    assert(
      !urlResult.redacted,
      `Canonical source URL for ${row.source_id} contains a sensitive token.`,
    );
    return {
      id: stableGovernanceUuid('reference-source', normalizeGovernanceKey(row.canonical_url)),
      title: row.source_title,
      url: row.canonical_url,
      purpose: [row.intended_use, row.researcher_notes].filter(Boolean).join(' — '),
      lastCheckedOn: datePart(row.last_verified) ?? datePart(row.retrieved_at),
      status: row.verification_status === 'source_verified' ? 'active' : 'inactive',
    };
  });
  assert(
    new Set(referenceSources.map((source) => source.url)).size === referenceSources.length,
    'Canonical source URLs are not unique.',
  );

  assert(importRecords.length === 160, 'Batch 0 import record count changed.');
  assert(importFiles.length === 29, 'Batch 0 import file count changed.');
  assert(
    redactedRecordCount > 0,
    'Expected sensitive query evidence was not detected and redacted.',
  );

  const manifestSha256 = sha256(manifestBytes);
  const seed = renderSeedSql({
    manifest,
    manifestSha256,
    archive: manifest.archive,
    tables,
    importFiles,
    importRecords,
    referenceSources,
    districtMatches,
    batchId,
  });
  for (const parameterName of manifest.security.redactedQueryParameterNames) {
    assert(
      !new RegExp(`${parameterName}=`, 'iu').test(seed),
      `Generated seed still contains the sensitive query parameter ${parameterName}.`,
    );
  }
  const seedSha256 = sha256(seed);
  const checksum = renderChecksumSql({ manifest, batchId, generatedSeedSha256: seedSha256 });
  const schemaDeployment = renderSchemaDeploymentSql(
    sourceBundleMigrationBytes.toString('utf8'),
    sha256(sourceBundleMigrationBytes),
  );
  const deploymentReadme = renderDeploymentReadme({
    schema: schemaDeployment,
    seed,
    checksum,
  });
  const report = {
    schemaVersion: '1.0.0',
    datasetKey: manifest.datasetKey,
    datasetVersion: manifest.datasetVersion,
    validatedAt: manifest.generatedAt,
    status: 'passed_with_warnings',
    archive: {
      path: manifest.archive.path,
      sha256: manifest.archive.sha256,
      byteSize: archiveBytes.length,
      memberCount: entries.size,
      expandedBytes,
      internalManifestSha256: manifest.internalManifest.sha256,
      internalMemberHashesVerified: internalManifest.size,
    },
    records: {
      csvFiles: tables.size,
      importFiles: importFiles.length,
      rawCsvRecords: importRecords.length,
      referenceSources: referenceSources.length,
      stateRecords: stateRows.length,
      districtRecords: districtRows.length,
      exactDistrictMatches: districtMatches.length,
      quarantinedDistricts: quarantinedDistricts.map((row) => ({
        sourceId: row.district_id,
        name: row.name_en,
        lgdCode: row.lgd_code,
        reason: 'No exact canonical name match; reviewed alias crosswalk required.',
      })),
      redactedRecords: redactedRecordCount,
      populatedOperationalRows: 0,
    },
    dataQuality: {
      malformedRows: 0,
      duplicatePrimaryKeys: 0,
      duplicateRows: 0,
      sourceVerificationCounts,
      sourceRowsWithoutArchivedContentHash: sourceTable.rows.filter(
        (row) => row.source_hash_sha256 === '',
      ).length,
      sourceRowsWithoutExplicitContentEffectiveDate: sourceTable.rows.filter(
        (row) => row.content_effective_date_available !== 'yes',
      ).length,
      discrepancyObservations: tables.get('02_source_discrepancies.csv').rows.length,
      discrepancyGroups: new Set(
        tables.get('02_source_discrepancies.csv').rows.map((row) => row.discrepancy_group_id),
      ).size,
      openDataIssues: tables.get('20_data_issues.csv').rows.length,
      headerOnlyOperationalCsvFiles: [...tables.values()].filter(
        (table) => table.expectedRows === 0,
      ).length,
      wardBoundaryFeatures: wardBoundaries.features.length,
    },
    safeguards: {
      canonicalCsvFilesModified: false,
      routingActivated: false,
      synchronizationEndpointsActivated: false,
      externalDeliveryApproved: false,
      placeholderOrUnverifiedRecordsPromoted: false,
      stalePmcBookletPromoted: false,
    },
    unresolved: {
      suppliedValidationFailures: 1,
      discrepancyGroups: 6,
      dataIssues: 21,
      missingHierarchyAndOperationalDatasets: manifest.promotion.prohibitedEntityKinds,
    },
    generated: {
      seedPath: repositoryPath(seedPath),
      seedSha256,
      checksumPath: repositoryPath(checksumPath),
      checksumSha256: sha256(checksum),
      sqlEditorDeployment: {
        readmePath: repositoryPath(deploymentReadmePath),
        schemaPath: repositoryPath(deploymentSchemaPath),
        schemaSha256: sha256(schemaDeployment),
        seedPath: repositoryPath(deploymentSeedPath),
        seedSha256,
        checksumPath: repositoryPath(deploymentChecksumPath),
        checksumSha256: sha256(checksum),
      },
    },
  };
  const files = new Map([
    [validationPath, jsonText(report)],
    [seedPath, seed],
    [checksumPath, checksum],
    [deploymentReadmePath, deploymentReadme],
    [deploymentSchemaPath, schemaDeployment],
    [deploymentSeedPath, seed],
    [deploymentChecksumPath, checksum],
  ]);
  return { manifest, report, tables, importRecords, files };
};

const run = async () => {
  const check = process.argv.includes('--check');
  const { files } = await buildMaharashtraBatch0Artifacts();
  for (const [path, contents] of files) {
    if (check) {
      const existing = await readFile(path, 'utf8').catch(() => null);
      assert(
        existing === contents,
        `${repositoryPath(path)} is stale; regenerate Batch 0 artifacts.`,
      );
      continue;
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, 'utf8');
  }
  console.log(
    check
      ? 'Maharashtra Batch 0 generated artifacts are current.'
      : 'Generated Maharashtra Batch 0 validation and seed artifacts.',
  );
};

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
