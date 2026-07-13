import type {
  GovernanceBaselineModel,
  GovernanceDiagnostic,
  GovernanceImportManifest,
  GovernanceRecordProvenance,
  GovernanceSourceRecord,
  GovernanceValidationReport,
} from '@local-wellness/types';
import { isGovernancePlaceholder } from '@local-wellness/validation';

import { sha256Hex, stableGovernanceUuid } from './stable-id.js';

type SqlLiteral = string;

const governanceDatasetKey = 'mh_governance';
const governanceImportBatchNamespace = 'mh-governance';

export const governanceSqlText = (value: string): SqlLiteral => `'${value.replaceAll("'", "''")}'`;
const nullableText = (value: string | null): SqlLiteral =>
  value === null ? 'null' : governanceSqlText(value);
const sqlBoolean = (value: boolean): SqlLiteral => (value ? 'true' : 'false');
const sqlNumber = (value: number): SqlLiteral => String(value);
const sqlJson = (value: unknown): SqlLiteral =>
  `${governanceSqlText(JSON.stringify(value))}::jsonb`;
const sqlTextArray = (values: readonly string[]): SqlLiteral =>
  values.length === 0
    ? `'{}'::text[]`
    : `array[${values.map(governanceSqlText).join(', ')}]::text[]`;

const insertRows = (
  table: string,
  columns: readonly string[],
  rows: readonly (readonly SqlLiteral[])[],
  conflictColumns: readonly string[],
  immutableColumns: readonly string[] = ['id'],
): string => {
  if (rows.length === 0) {
    return '';
  }
  const updates = columns.filter(
    (column) => !immutableColumns.includes(column) && !conflictColumns.includes(column),
  );
  const conflict =
    updates.length === 0
      ? 'do nothing'
      : `do update set\n${updates.map((column) => `  ${column} = excluded.${column}`).join(',\n')}`;

  return [
    `insert into ${table} (${columns.join(', ')})`,
    'values',
    rows.map((row) => `  (${row.join(', ')})`).join(',\n'),
    `on conflict (${conflictColumns.join(', ')}) ${conflict};`,
  ].join('\n');
};

const verificationColumns = (record: GovernanceRecordProvenance): SqlLiteral[] => [
  governanceSqlText(record.verificationStatus),
  nullableText(record.verificationNotes),
  sqlBoolean(record.isPlaceholder),
  nullableText(record.lastVerified),
  nullableText(record.referenceSourceId),
  governanceSqlText(record.rawSourceRecordId),
];

const diagnosticMessages = (
  diagnostics: readonly GovernanceDiagnostic[],
  sourcePath: string,
  row: number,
): Array<{ code: string; field?: string; message: string }> =>
  diagnostics
    .filter((diagnostic) => diagnostic.path === sourcePath && diagnostic.row === row)
    .map((diagnostic) => ({
      code: diagnostic.code,
      ...(diagnostic.field === undefined ? {} : { field: diagnostic.field }),
      message: diagnostic.message,
    }));

const rawRecordSourceKey = (
  record: GovernanceSourceRecord,
  manifests: ReadonlyMap<string, GovernanceImportManifest['datasets'][number]>,
): string => {
  const manifest = manifests.get(record.datasetId);
  if (manifest === undefined) {
    throw new Error(`Missing dataset manifest for ${record.datasetId}.`);
  }
  return manifest.naturalKey.map((field) => record.values[field] ?? '').join(' | ');
};

const governanceImportBatchId = (model: GovernanceBaselineModel): string =>
  stableGovernanceUuid(
    'import-batch',
    `${governanceImportBatchNamespace}:${model.datasetVersion}:${model.manifestSha256}`,
  );

export const renderGovernanceSeedSql = (
  model: GovernanceBaselineModel,
  manifest: GovernanceImportManifest,
  report: GovernanceValidationReport,
): string => {
  const statements: string[] = [];
  const batchId = governanceImportBatchId(model);
  const fixedTimestamp = `${model.sourceDate}T00:00:00Z`;
  const manifests = new Map(manifest.datasets.map((dataset) => [dataset.id, dataset]));
  const targets = new Map(model.normalizationTargets.map((item) => [item.importRecordId, item]));
  const sourceFiles = report.sourceFiles;
  const importFileIds = new Map(
    sourceFiles.map((file) => [
      file.path,
      stableGovernanceUuid('import-file', `${batchId}:${file.path}:${file.sha256}`),
    ]),
  );

  statements.push(
    insertRows(
      'governance.reference_sources',
      ['id', 'title', 'url', 'source_type', 'purpose', 'last_checked_on', 'status'],
      model.referenceLinks.map((reference) => [
        governanceSqlText(reference.id),
        governanceSqlText(reference.name),
        governanceSqlText(reference.url),
        governanceSqlText(reference.sourceType),
        governanceSqlText(reference.purpose),
        nullableText(reference.lastVerified),
        governanceSqlText('active'),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.import_batches',
      [
        'id',
        'dataset_key',
        'dataset_version',
        'canonical_root',
        'manifest_sha256',
        'workbook_sha256',
        'generated_seed_sha256',
        'status',
        'validation_summary',
        'started_at',
        'completed_at',
      ],
      [
        [
          governanceSqlText(batchId),
          governanceSqlText(governanceDatasetKey),
          governanceSqlText(model.datasetVersion),
          governanceSqlText('resources/governance'),
          governanceSqlText(model.manifestSha256),
          governanceSqlText(model.workbookSha256),
          'null',
          governanceSqlText('imported'),
          sqlJson({
            errors: report.counts.errors,
            warnings: report.counts.warnings,
            rawSourceRecords: report.counts.rawSourceRecords,
            metadataRecords: report.counts.metadataRecords,
            manifestPath: report.manifestPath,
          }),
          `${governanceSqlText(fixedTimestamp)}::timestamptz`,
          `${governanceSqlText(fixedTimestamp)}::timestamptz`,
        ],
      ],
      ['id'],
      ['id', 'generated_seed_sha256'],
    ),
  );

  statements.push(
    insertRows(
      'governance.import_files',
      [
        'id',
        'import_batch_id',
        'file_name',
        'sha256',
        'source_row_count',
        'accepted_row_count',
        'rejected_row_count',
        'warning_count',
        'validation_summary',
      ],
      sourceFiles.map((file) => {
        const warnings = report.diagnostics.filter(
          ({ path, severity }) => path === file.path && severity === 'warning',
        ).length;
        return [
          governanceSqlText(importFileIds.get(file.path) ?? ''),
          governanceSqlText(batchId),
          governanceSqlText(file.path),
          governanceSqlText(file.sha256),
          sqlNumber(file.recordCount),
          sqlNumber(file.recordCount),
          '0',
          sqlNumber(warnings),
          sqlJson({ disposition: file.disposition, warnings }),
        ];
      }),
      ['id'],
      [
        'id',
        'import_batch_id',
        'file_name',
        'sha256',
        'source_row_count',
        'accepted_row_count',
        'rejected_row_count',
        'warning_count',
        'validation_summary',
      ],
    ),
  );

  const importRecordRows: SqlLiteral[][] = [];
  for (const record of model.rawSourceRecords) {
    const fileId = importFileIds.get(record.sourcePath);
    const normalization = targets.get(record.id);
    if (fileId === undefined || normalization === undefined) {
      throw new Error(
        `Import provenance is incomplete for ${record.sourcePath}:${record.sourceRowNumber}.`,
      );
    }
    const messages = diagnosticMessages(
      report.diagnostics,
      record.sourcePath,
      record.sourceRowNumber,
    );
    const containsPlaceholder = Object.values(record.values).some(isGovernancePlaceholder);
    importRecordRows.push([
      governanceSqlText(record.id),
      governanceSqlText(fileId),
      sqlNumber(record.sourceRowNumber),
      governanceSqlText(rawRecordSourceKey(record, manifests)),
      governanceSqlText(record.recordSha256),
      sqlJson(record.values),
      governanceSqlText(messages.length === 0 ? 'accepted' : 'accepted_with_warnings'),
      sqlJson(messages),
      sqlBoolean(containsPlaceholder || normalization.disposition === 'placeholder_preserved'),
      governanceSqlText(normalization.disposition),
      nullableText(normalization.table),
      nullableText(normalization.recordId),
    ]);
  }
  for (const record of model.metadataRecords) {
    const fileId = importFileIds.get(record.sourcePath);
    const normalization = targets.get(record.id);
    if (fileId === undefined || normalization === undefined) {
      throw new Error(`README provenance is incomplete for row ${record.sourceRowNumber}.`);
    }
    const rawPayload = { metadata_key: record.key, metadata_value: record.value };
    importRecordRows.push([
      governanceSqlText(record.id),
      governanceSqlText(fileId),
      sqlNumber(record.sourceRowNumber),
      governanceSqlText(record.key),
      governanceSqlText(sha256Hex(JSON.stringify(rawPayload))),
      sqlJson(rawPayload),
      governanceSqlText('accepted'),
      sqlJson([]),
      'false',
      governanceSqlText(normalization.disposition),
      nullableText(normalization.table),
      nullableText(normalization.recordId),
    ]);
  }
  statements.push(
    insertRows(
      'governance.import_records',
      [
        'id',
        'import_file_id',
        'row_number',
        'source_key',
        'record_sha256',
        'raw_payload',
        'validation_status',
        'validation_messages',
        'is_placeholder',
        'normalization_disposition',
        'normalized_table',
        'normalized_record_id',
      ],
      importRecordRows,
      ['id'],
      [
        'id',
        'import_file_id',
        'row_number',
        'source_key',
        'record_sha256',
        'raw_payload',
        'validation_status',
        'validation_messages',
        'is_placeholder',
        'normalization_disposition',
        'normalized_table',
        'normalized_record_id',
      ],
    ),
  );

  statements.push(
    insertRows(
      'governance.authorities',
      [
        'id',
        'parent_authority_id',
        'code',
        'name',
        'authority_type',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.authorities.map((authority) => [
        governanceSqlText(authority.id),
        nullableText(authority.parentAuthorityId),
        governanceSqlText(authority.code),
        governanceSqlText(authority.name),
        governanceSqlText(authority.authorityType),
        governanceSqlText(authority.status),
        ...verificationColumns(authority).slice(0, 3),
        sqlBoolean(authority.isRoutable),
        ...verificationColumns(authority).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.states',
      [
        'id',
        'authority_id',
        'name',
        'iso_code',
        'lgd_code',
        'capital',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.states.map((state) => [
        governanceSqlText(state.id),
        governanceSqlText(state.authorityId),
        governanceSqlText(state.name),
        governanceSqlText(state.code),
        'null',
        governanceSqlText(state.capital),
        governanceSqlText(state.status),
        ...verificationColumns(state).slice(0, 3),
        'false',
        ...verificationColumns(state).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.districts',
      [
        'id',
        'authority_id',
        'state_id',
        'name',
        'revenue_division_name',
        'lgd_code',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.districts.map((district) => [
        governanceSqlText(district.id),
        governanceSqlText(district.authorityId),
        governanceSqlText(district.stateId),
        governanceSqlText(district.name),
        governanceSqlText(district.revenueDivision),
        nullableText(district.code),
        governanceSqlText(district.status),
        ...verificationColumns(district).slice(0, 3),
        'false',
        ...verificationColumns(district).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.talukas',
      [
        'id',
        'district_id',
        'name',
        'lgd_code',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.talukas.map((taluka) => [
        governanceSqlText(taluka.id),
        governanceSqlText(taluka.districtId),
        governanceSqlText(taluka.name),
        nullableText(taluka.code),
        governanceSqlText(taluka.status),
        ...verificationColumns(taluka).slice(0, 3),
        'false',
        ...verificationColumns(taluka).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.local_bodies',
      [
        'id',
        'authority_id',
        'state_id',
        'name',
        'body_type',
        'lgd_code',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.localBodies.map((localBody) => [
        governanceSqlText(localBody.id),
        governanceSqlText(localBody.authorityId),
        governanceSqlText(localBody.stateId),
        governanceSqlText(localBody.name),
        governanceSqlText(localBody.kind),
        nullableText(localBody.code),
        governanceSqlText(localBody.status),
        ...verificationColumns(localBody).slice(0, 3),
        'false',
        ...verificationColumns(localBody).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.local_body_districts',
      ['local_body_id', 'district_id', 'is_primary', 'reference_source_id', 'import_record_id'],
      model.localBodyDistricts.map((mapping) => [
        governanceSqlText(mapping.localBodyId),
        governanceSqlText(mapping.districtId),
        sqlBoolean(mapping.isPrimary),
        nullableText(mapping.referenceSourceId),
        governanceSqlText(mapping.rawSourceRecordId),
      ]),
      ['local_body_id', 'district_id'],
      [],
    ),
  );

  statements.push(
    insertRows(
      'governance.wards',
      [
        'id',
        'local_body_id',
        'source_ward_code',
        'name',
        'ward_number',
        'zone_name',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.wards.map((ward) => [
        governanceSqlText(ward.id),
        governanceSqlText(ward.localBodyId),
        governanceSqlText(ward.sourceWardId),
        governanceSqlText(ward.name),
        governanceSqlText(ward.number),
        nullableText(ward.zone),
        governanceSqlText(ward.status),
        ...verificationColumns(ward).slice(0, 3),
        sqlBoolean(ward.isRoutable),
        ...verificationColumns(ward).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.departments',
      [
        'id',
        'code',
        'name',
        'applicable_body_types',
        'complaint_types',
        'typical_coverage',
        'required_data',
        'priority_guidance',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.departments.map((department) => [
        governanceSqlText(department.id),
        governanceSqlText(department.code),
        governanceSqlText(department.name),
        sqlTextArray(department.applicableBodyTypes),
        sqlTextArray(department.complaintTypes),
        governanceSqlText(department.coverage),
        sqlTextArray(department.requiredData),
        governanceSqlText(department.priority),
        governanceSqlText('active'),
        ...verificationColumns(department).slice(0, 3),
        'false',
        ...verificationColumns(department).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.offices',
      [
        'id',
        'authority_id',
        'district_id',
        'name',
        'office_type',
        'level',
        'jurisdiction_description',
        'address',
        'official_phone',
        'official_email',
        'coverage',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.offices.map((office) => [
        governanceSqlText(office.id),
        governanceSqlText(office.authorityId),
        nullableText(office.districtId),
        governanceSqlText(office.name),
        governanceSqlText(office.officeType),
        governanceSqlText(office.level),
        governanceSqlText(office.jurisdiction),
        nullableText(office.address),
        nullableText(office.officialPhone),
        nullableText(office.officialEmail),
        governanceSqlText(office.coverage),
        governanceSqlText(office.status),
        ...verificationColumns(office).slice(0, 3),
        'false',
        ...verificationColumns(office).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.officer_roles',
      [
        'id',
        'code',
        'name',
        'core_responsibility',
        'people_or_units_under_role',
        'reports_to_role_id',
        'reports_to_description',
        'typical_coverage',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.officerRoles.map((role) => [
        governanceSqlText(role.id),
        governanceSqlText(role.code),
        governanceSqlText(role.name),
        governanceSqlText(role.responsibility),
        governanceSqlText(role.managedUnits),
        nullableText(role.reportsToRoleId),
        governanceSqlText(role.reportsTo),
        governanceSqlText(role.coverage),
        governanceSqlText('active'),
        ...verificationColumns(role).slice(0, 3),
        'false',
        ...verificationColumns(role).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.utilities',
      [
        'id',
        'authority_id',
        'name',
        'function_description',
        'jurisdiction_description',
        'complaint_types',
        'reporting_channel',
        'local_office_description',
        'escalation_role_id',
        'routing_notes',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.utilities.map((utility) => [
        governanceSqlText(utility.id),
        governanceSqlText(utility.authorityId),
        governanceSqlText(utility.name),
        governanceSqlText(utility.function),
        governanceSqlText(utility.jurisdiction),
        sqlTextArray(utility.complaintTypes),
        governanceSqlText(utility.reportingChannel),
        governanceSqlText(utility.localOffice),
        nullableText(utility.escalationRoleId),
        governanceSqlText(utility.routingNotes),
        governanceSqlText('active'),
        ...verificationColumns(utility).slice(0, 3),
        sqlBoolean(utility.isRoutable),
        ...verificationColumns(utility).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.emergency_contacts',
      [
        'id',
        'authority_id',
        'state_id',
        'district_id',
        'local_body_id',
        'service_name',
        'issue_type',
        'jurisdiction_description',
        'contact_type',
        'contact_value',
        'availability',
        'action',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.emergencyContacts.map((contact) => [
        governanceSqlText(contact.id),
        nullableText(contact.authorityId),
        governanceSqlText(contact.stateId),
        nullableText(contact.districtId),
        nullableText(contact.localBodyId),
        governanceSqlText(contact.service),
        governanceSqlText(contact.issueType),
        governanceSqlText(contact.jurisdiction),
        governanceSqlText(contact.contactType),
        nullableText(contact.contact),
        governanceSqlText(contact.availability),
        governanceSqlText(contact.action),
        governanceSqlText('active'),
        ...verificationColumns(contact).slice(0, 3),
        sqlBoolean(contact.isRoutable),
        ...verificationColumns(contact).slice(3),
      ]),
      ['id'],
    ),
  );

  statements.push(
    insertRows(
      'governance.complaint_routing_references',
      [
        'id',
        'rule_code',
        'version',
        'issue_name',
        'primary_department_id',
        'first_recipient_role_id',
        'primary_department_label',
        'first_recipient_role_label',
        'escalation_1_label',
        'escalation_2_label',
        'ownership_condition',
        'priority_or_emergency',
        'is_emergency',
        'routing_logic',
        'normalization_status',
        'normalization_notes',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
      model.routingReferences.map((routing) => [
        governanceSqlText(routing.id),
        governanceSqlText(routing.ruleCode),
        sqlNumber(routing.version),
        governanceSqlText(routing.issue),
        'null',
        'null',
        governanceSqlText(routing.primaryAgency),
        governanceSqlText(routing.firstRecipientRole),
        governanceSqlText(routing.escalationOne),
        governanceSqlText(routing.escalationTwo),
        governanceSqlText(routing.ownershipCondition),
        governanceSqlText(routing.priority),
        sqlBoolean(routing.isEmergency),
        governanceSqlText(routing.routingLogic),
        governanceSqlText(routing.resolutionStatus),
        governanceSqlText(routing.notes),
        governanceSqlText(routing.status),
        ...verificationColumns(routing).slice(0, 3),
        sqlBoolean(routing.isRoutable),
        `${governanceSqlText(fixedTimestamp)}::timestamptz`,
        'null',
        ...verificationColumns(routing).slice(3),
      ]),
      ['id'],
      [
        'id',
        'rule_code',
        'version',
        'issue_name',
        'primary_department_id',
        'first_recipient_role_id',
        'primary_department_label',
        'first_recipient_role_label',
        'escalation_1_label',
        'escalation_2_label',
        'ownership_condition',
        'priority_or_emergency',
        'is_emergency',
        'routing_logic',
        'normalization_status',
        'normalization_notes',
        'status',
        'verification_status',
        'verification_notes',
        'is_placeholder',
        'is_routing_eligible',
        'effective_from',
        'effective_to',
        'last_verified_on',
        'reference_source_id',
        'import_record_id',
      ],
    ),
  );

  return [
    '-- Generated from hash-pinned canonical Phase 2 governance resources.',
    '-- Do not edit this file manually; run `pnpm governance:data:generate`.',
    'begin;',
    ...statements.filter((statement) => statement.length > 0),
    'commit;',
    '',
  ].join('\n\n');
};

export const renderGovernanceSeedChecksumSql = (
  model: GovernanceBaselineModel,
  generatedSeedSha256: string,
): string => {
  const batchId = governanceImportBatchId(model);
  const checksumMismatchMessage =
    'Expected exactly one matching governance import batch while recording the generated seed checksum.';

  return [
    '-- Generated companion for the hash-pinned canonical Phase 2 governance seed.',
    '-- Records the externally computed main-seed SHA-256 without creating a self-reference.',
    '-- Do not edit this file manually; run `pnpm governance:data:generate`.',
    'begin;',
    'do $governance_seed_checksum$',
    'declare',
    '  affected_rows integer;',
    'begin',
    '  update governance.import_batches',
    `  set generated_seed_sha256 = ${governanceSqlText(generatedSeedSha256)}`,
    `  where id = ${governanceSqlText(batchId)}`,
    `    and dataset_key = ${governanceSqlText(governanceDatasetKey)}`,
    `    and dataset_version = ${governanceSqlText(model.datasetVersion)}`,
    '    and (',
    '      generated_seed_sha256 is null',
    `      or generated_seed_sha256 = ${governanceSqlText(generatedSeedSha256)}`,
    '    );',
    '',
    '  get diagnostics affected_rows = row_count;',
    '',
    '  if affected_rows <> 1 then',
    '    raise exception using',
    "      errcode = '55000',",
    `      message = ${governanceSqlText(checksumMismatchMessage)};`,
    '  end if;',
    'end',
    '$governance_seed_checksum$;',
    'commit;',
    '',
  ].join('\n');
};
