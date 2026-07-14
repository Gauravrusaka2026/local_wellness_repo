import type {
  GovernanceBaselineModel,
  GovernanceDiagnostic,
  GovernanceFileRecordClassification,
  GovernanceRecordClassificationCounts,
  GovernanceRecordProvenance,
  GovernanceSourceRecord,
  GovernanceValidationReport,
} from '@local-wellness/types';

import type { LoadedGovernanceManifest } from './load-source.js';
import type { ValidatedGovernanceSources } from './validate-source.js';

export const sortGovernanceDiagnostics = (
  diagnostics: readonly GovernanceDiagnostic[],
): GovernanceDiagnostic[] =>
  [...diagnostics].sort((left, right) => {
    const leftKey = [
      left.path,
      String(left.row ?? 0).padStart(10, '0'),
      left.field ?? '',
      left.code,
      left.severity,
      left.message,
    ].join('\u001f');
    const rightKey = [
      right.path,
      String(right.row ?? 0).padStart(10, '0'),
      right.field ?? '',
      right.code,
      right.severity,
      right.message,
    ].join('\u001f');
    return leftKey.localeCompare(rightKey, 'en');
  });

type RecordClassification = 'accepted' | 'quarantined' | 'rejected' | 'unverified';

const emptyClassificationCounts = (): GovernanceRecordClassificationCounts => ({
  sourceRecords: 0,
  accepted: 0,
  unverified: 0,
  quarantined: 0,
  rejected: 0,
  reconciled: true,
});

const normalizedProvenanceBySourceRecord = (
  model: GovernanceBaselineModel | null,
): ReadonlyMap<string, GovernanceRecordProvenance[]> => {
  if (model === null) {
    return new Map();
  }

  const records: GovernanceRecordProvenance[] = [
    ...model.authorities,
    ...model.states,
    ...model.districts,
    ...model.talukas,
    ...model.localBodies,
    ...model.wards,
    ...model.departments,
    ...model.offices,
    ...model.officerRoles,
    ...model.utilities,
    ...model.emergencyContacts,
    ...model.routingReferences,
    ...model.referenceLinks,
  ];
  const bySourceRecord = new Map<string, GovernanceRecordProvenance[]>();
  for (const record of records) {
    const existing = bySourceRecord.get(record.rawSourceRecordId) ?? [];
    existing.push(record);
    bySourceRecord.set(record.rawSourceRecordId, existing);
  }
  return bySourceRecord;
};

const classifySourceRecord = (
  record: GovernanceSourceRecord,
  diagnostics: readonly GovernanceDiagnostic[],
  model: GovernanceBaselineModel | null,
  provenanceBySourceRecord: ReadonlyMap<string, GovernanceRecordProvenance[]>,
): RecordClassification => {
  const recordDiagnostics = diagnostics.filter(
    ({ path, row }) => path === record.sourcePath && row === record.sourceRowNumber,
  );
  const fileHasBlockingError = diagnostics.some(
    ({ path, row, severity }) =>
      path === record.sourcePath && severity === 'error' && (row === undefined || row <= 2),
  );
  if (fileHasBlockingError || recordDiagnostics.some(({ severity }) => severity === 'error')) {
    return 'rejected';
  }

  const normalization = model?.normalizationTargets.find(
    ({ importRecordId }) => importRecordId === record.id,
  );
  if (
    record.disposition === 'raw_only' ||
    record.disposition === 'template_only' ||
    normalization?.disposition === 'placeholder_preserved' ||
    (normalization?.disposition === 'reference_only' && normalization.table === null)
  ) {
    return 'quarantined';
  }

  const normalizedRecords = provenanceBySourceRecord.get(record.id) ?? [];
  if (
    recordDiagnostics.some(({ severity }) => severity === 'warning') ||
    normalizedRecords.length === 0 ||
    normalizedRecords.some(({ isPlaceholder, isVerified }) => isPlaceholder || !isVerified)
  ) {
    return 'unverified';
  }

  return 'accepted';
};

const incrementClassification = (
  counts: GovernanceRecordClassificationCounts,
  classification: RecordClassification,
): void => {
  counts.sourceRecords += 1;
  counts[classification] += 1;
  counts.reconciled =
    counts.sourceRecords ===
    counts.accepted + counts.unverified + counts.quarantined + counts.rejected;
};

const createRecordClassificationMatrix = (
  validated: ValidatedGovernanceSources,
  diagnostics: readonly GovernanceDiagnostic[],
  model: GovernanceBaselineModel | null,
): GovernanceValidationReport['recordClassification'] => {
  const provenanceBySourceRecord = normalizedProvenanceBySourceRecord(model);
  const datasetsByPath = new Map(
    validated.datasets.map((dataset) => [dataset.manifest.path, dataset]),
  );
  const totals = emptyClassificationCounts();
  const files: GovernanceFileRecordClassification[] = validated.sourceFiles
    .map((sourceFile) => {
      const counts = emptyClassificationCounts();
      const dataset = datasetsByPath.get(sourceFile.path);
      if (dataset !== undefined) {
        for (const record of dataset.records) {
          const classification = classifySourceRecord(
            record,
            diagnostics,
            model,
            provenanceBySourceRecord,
          );
          incrementClassification(counts, classification);
          incrementClassification(totals, classification);
        }

        for (const metadataRecord of dataset.metadata) {
          const hasError = diagnostics.some(
            ({ path, row, severity }) =>
              path === metadataRecord.sourcePath &&
              severity === 'error' &&
              (row === undefined || row <= 2 || row === metadataRecord.sourceRowNumber),
          );
          const hasWarning = diagnostics.some(
            ({ path, row, severity }) =>
              path === metadataRecord.sourcePath &&
              row === metadataRecord.sourceRowNumber &&
              severity === 'warning',
          );
          const classification: RecordClassification = hasError
            ? 'rejected'
            : hasWarning
              ? 'unverified'
              : 'accepted';
          incrementClassification(counts, classification);
          incrementClassification(totals, classification);
        }
      }

      return {
        id: sourceFile.id,
        path: sourceFile.path,
        ...counts,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));

  totals.reconciled =
    totals.sourceRecords ===
    totals.accepted + totals.unverified + totals.quarantined + totals.rejected;
  return { files, totals };
};

export const createGovernanceValidationReport = (
  loaded: LoadedGovernanceManifest,
  validated: ValidatedGovernanceSources,
  model: GovernanceBaselineModel | null,
  generatedSeed: GovernanceValidationReport['generatedSeed'],
  checksumCompanionPath: string | null = null,
): GovernanceValidationReport => {
  const diagnostics = sortGovernanceDiagnostics(validated.diagnostics);
  const rawSourceRecords = validated.datasets.reduce(
    (total, dataset) => total + dataset.records.length,
    0,
  );
  const metadataRecords = validated.datasets.reduce(
    (total, dataset) => total + dataset.metadata.length,
    0,
  );
  const operationalRecords = validated.datasets
    .filter(({ manifest }) =>
      ['operational', 'operational_placeholder', 'operational_reference'].includes(
        manifest.disposition,
      ),
    )
    .reduce((total, dataset) => total + dataset.records.length, 0);
  const quarantinedRecords = validated.datasets
    .filter(({ manifest }) => ['raw_only', 'template_only'].includes(manifest.disposition))
    .reduce((total, dataset) => total + dataset.records.length, 0);

  return {
    schemaVersion: 2,
    datasetVersion: loaded.manifest.datasetVersion,
    manifestPath: loaded.manifestRepositoryPath,
    manifestSha256: loaded.manifestSha256,
    safeToGenerate: !diagnostics.some(({ severity }) => severity === 'error'),
    counts: {
      sourceFiles: validated.sourceFiles.length,
      rawSourceRecords,
      metadataRecords,
      operationalRecords,
      quarantinedRecords,
      errors: diagnostics.filter(({ severity }) => severity === 'error').length,
      warnings: diagnostics.filter(({ severity }) => severity === 'warning').length,
    },
    sourceFiles: [...validated.sourceFiles].sort((left, right) =>
      left.path.localeCompare(right.path, 'en'),
    ),
    recordClassification: createRecordClassificationMatrix(validated, diagnostics, model),
    diagnostics,
    normalizedRecords: {
      referenceSources: model?.referenceLinks.length ?? 0,
      importRecords: (model?.rawSourceRecords.length ?? 0) + (model?.metadataRecords.length ?? 0),
      authorities: model?.authorities.length ?? 0,
      states: model?.states.length ?? 0,
      districts: model?.districts.length ?? 0,
      talukas: model?.talukas.length ?? 0,
      localBodies: model?.localBodies.length ?? 0,
      localBodyDistricts: model?.localBodyDistricts.length ?? 0,
      wards: model?.wards.length ?? 0,
      departments: model?.departments.length ?? 0,
      offices: model?.offices.length ?? 0,
      officerRoles: model?.officerRoles.length ?? 0,
      officers: 0,
      officerAssignments: 0,
      utilities: model?.utilities.length ?? 0,
      emergencyContacts: model?.emergencyContacts.length ?? 0,
      routingReferences: model?.routingReferences.length ?? 0,
    },
    generatedSeed,
    databaseGeneratedSeedSha256: {
      value: generatedSeed?.sha256 ?? null,
      companionPath: generatedSeed === null ? null : checksumCompanionPath,
      reason:
        generatedSeed === null
          ? 'No generated seed checksum is available because seed generation has not completed.'
          : 'The generated companion records the externally computed main-seed SHA-256 in governance.import_batches without changing the hashed seed bytes.',
    },
  };
};

export const renderGovernanceValidationReport = (report: GovernanceValidationReport): string =>
  `${JSON.stringify(report, null, 2)}\n`;
