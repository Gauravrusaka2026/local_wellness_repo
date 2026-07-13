import type {
  GovernanceBaselineModel,
  GovernanceDiagnostic,
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
    schemaVersion: 1,
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
