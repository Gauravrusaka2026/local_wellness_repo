import type {
  GovernanceDatasetId,
  GovernanceDiagnostic,
  GovernanceParsedDataset,
  GovernanceSourceRecord,
} from '@local-wellness/types';
import {
  findGovernanceDuplicateKeys,
  governanceDateSchema,
  governanceHttpsUrlSchema,
  governanceRecordIndex,
  isGovernancePlaceholder,
  isVerifiedGovernanceStatus,
  normalizeGovernanceKey,
  normalizeGovernanceText,
} from '@local-wellness/validation';

import type { LoadedGovernanceManifest, ParsedGovernanceSources } from './load-source.js';

export interface ValidatedGovernanceSources extends ParsedGovernanceSources {
  diagnostics: GovernanceDiagnostic[];
}

const dateFields = new Set(['Last Checked', 'Last Verified']);
const urlFields = new Set(['Official Source', 'Source URL', 'URL']);

const recordValue = (record: GovernanceSourceRecord, field: string): string =>
  normalizeGovernanceText(record.values[field] ?? '');

const byId = (
  datasets: readonly GovernanceParsedDataset[],
  id: GovernanceDatasetId,
): GovernanceParsedDataset => {
  const dataset = datasets.find(({ manifest }) => manifest.id === id);
  if (dataset === undefined) {
    throw new Error(`Required governance dataset ${id} was not parsed.`);
  }
  return dataset;
};

const missingParentDiagnostic = (
  record: GovernanceSourceRecord,
  field: string,
  parentType: string,
): GovernanceDiagnostic => ({
  severity: 'error',
  code: 'MISSING_PARENT',
  message: `${parentType} ${JSON.stringify(recordValue(record, field))} does not exist.`,
  path: record.sourcePath,
  datasetId: record.datasetId,
  row: record.sourceRowNumber,
  field,
});

export const validateGovernanceDatasetRecords = (
  dataset: GovernanceParsedDataset,
): GovernanceDiagnostic[] => {
  const diagnostics: GovernanceDiagnostic[] = [];

  for (const record of dataset.records) {
    for (const field of dataset.manifest.naturalKey) {
      if (recordValue(record, field).length === 0) {
        diagnostics.push({
          severity: 'error',
          code: 'REQUIRED_MISSING',
          message: 'Natural-key values cannot be empty.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field,
        });
      }
    }

    for (const [field, sourceValue] of Object.entries(record.values)) {
      const value = normalizeGovernanceText(sourceValue);
      if (value.length === 0) {
        diagnostics.push({
          severity: 'warning',
          code: 'UNVERIFIED_VALUE',
          message: 'Empty source value is retained only in raw provenance.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field,
        });
        continue;
      }

      if (isGovernancePlaceholder(value)) {
        diagnostics.push({
          severity: 'warning',
          code: 'PLACEHOLDER_VALUE',
          message: 'Placeholder value is quarantined or normalized to NULL/non-routable state.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field,
        });
      }

      if (dateFields.has(field) && !governanceDateSchema.safeParse(value).success) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_DATE',
          message: 'Expected an ISO calendar date.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field,
        });
      }

      if (
        urlFields.has(field) &&
        !isGovernancePlaceholder(value) &&
        !governanceHttpsUrlSchema.safeParse(value).success
      ) {
        diagnostics.push({
          severity: 'error',
          code: 'INVALID_URL',
          message: 'Expected an HTTPS source URL.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field,
        });
      }
    }

    const verificationStatus = record.values['Verification Status'];
    if (
      verificationStatus !== undefined &&
      !isVerifiedGovernanceStatus(verificationStatus) &&
      !isGovernancePlaceholder(verificationStatus)
    ) {
      diagnostics.push({
        severity: 'warning',
        code: 'UNVERIFIED_VALUE',
        message: 'Source verification status is not fully verified.',
        path: record.sourcePath,
        datasetId: record.datasetId,
        row: record.sourceRowNumber,
        field: 'Verification Status',
      });
    }
  }

  diagnostics.push(...findGovernanceDuplicateKeys(dataset.manifest, dataset.records));
  return diagnostics;
};

export const validateGovernanceReferences = (
  loaded: LoadedGovernanceManifest,
  datasets: readonly GovernanceParsedDataset[],
): GovernanceDiagnostic[] => {
  const diagnostics: GovernanceDiagnostic[] = [];
  const districts = byId(datasets, 'districts');
  const districtNames = governanceRecordIndex(districts.records, 'District');
  const talukas = byId(datasets, 'talukas');
  const talukaKeys = new Set(
    talukas.records.map(
      (record) =>
        `${normalizeGovernanceKey(record.values['District'] ?? '')}\u001f${normalizeGovernanceKey(record.values['Taluka/Tehsil'] ?? '')}`,
    ),
  );

  for (const record of talukas.records) {
    if (!districtNames.has(normalizeGovernanceKey(record.values['District'] ?? ''))) {
      diagnostics.push(missingParentDiagnostic(record, 'District', 'District'));
    }
  }

  for (const datasetId of [
    'municipal_corporations',
    'municipal_councils',
    'nagar_panchayats',
  ] as const) {
    for (const record of byId(datasets, datasetId).records) {
      const nameField =
        datasetId === 'municipal_corporations'
          ? 'Corporation'
          : datasetId === 'municipal_councils'
            ? 'Municipal Council'
            : 'Nagar Panchayat';
      const name = recordValue(record, nameField);
      const districtValue = recordValue(record, 'District');
      const expandedDistricts = loaded.manifest.multiDistrictLocalBodies[name] ?? [districtValue];

      for (const district of expandedDistricts) {
        if (!districtNames.has(normalizeGovernanceKey(district))) {
          diagnostics.push(missingParentDiagnostic(record, 'District', 'District'));
        }
      }

      if (
        districtValue.includes('/') &&
        loaded.manifest.multiDistrictLocalBodies[name] === undefined
      ) {
        diagnostics.push({
          severity: 'error',
          code: 'UNRESOLVED_REFERENCE',
          message: 'Multi-district local body requires an explicit manifest expansion.',
          path: record.sourcePath,
          datasetId: record.datasetId,
          row: record.sourceRowNumber,
          field: 'District',
        });
      }
    }
  }

  const localBodyRecords = [
    ...byId(datasets, 'municipal_corporations').records.map((record) => ({
      name: recordValue(record, 'Corporation'),
      record,
    })),
    ...byId(datasets, 'municipal_councils').records.map((record) => ({
      name: recordValue(record, 'Municipal Council'),
      record,
    })),
    ...byId(datasets, 'nagar_panchayats').records.map((record) => ({
      name: recordValue(record, 'Nagar Panchayat'),
      record,
    })),
  ];
  const localBodies = new Map(
    localBodyRecords.map(({ name, record }) => [normalizeGovernanceKey(name), record]),
  );

  for (const record of byId(datasets, 'wards').records) {
    const rawLocalBody = recordValue(record, 'Local Body');
    const canonicalLocalBody = loaded.manifest.aliases.localBodies[rawLocalBody] ?? rawLocalBody;
    if (!localBodies.has(normalizeGovernanceKey(canonicalLocalBody))) {
      diagnostics.push(missingParentDiagnostic(record, 'Local Body', 'Local body'));
    }
  }

  for (const record of byId(datasets, 'gram_panchayats').records) {
    const district = normalizeGovernanceKey(record.values['District'] ?? '');
    const taluka = normalizeGovernanceKey(record.values['Taluka/Block'] ?? '');
    if (!talukaKeys.has(`${district}\u001f${taluka}`)) {
      diagnostics.push(missingParentDiagnostic(record, 'Taluka/Block', 'Taluka'));
    }
  }

  for (const record of byId(datasets, 'villages').records) {
    const district = normalizeGovernanceKey(record.values['District'] ?? '');
    const taluka = normalizeGovernanceKey(record.values['Taluka'] ?? '');
    if (!talukaKeys.has(`${district}\u001f${taluka}`)) {
      diagnostics.push(missingParentDiagnostic(record, 'Taluka', 'Taluka'));
    }
  }

  for (const record of byId(datasets, 'offices').records) {
    if (
      normalizeGovernanceKey(record.values['Level'] ?? '') === 'district' &&
      !districtNames.has(normalizeGovernanceKey(record.values['Jurisdiction'] ?? ''))
    ) {
      diagnostics.push(missingParentDiagnostic(record, 'Jurisdiction', 'District'));
    }
  }

  return diagnostics;
};

export const validateGovernanceSources = (
  loaded: LoadedGovernanceManifest,
  parsed: ParsedGovernanceSources,
): ValidatedGovernanceSources => {
  const diagnostics = [...parsed.diagnostics];

  for (const dataset of parsed.datasets) {
    if (dataset.manifest.id !== 'readme') {
      diagnostics.push(...validateGovernanceDatasetRecords(dataset));
    }
  }

  const rawSourceRecordCount = parsed.datasets.reduce(
    (total, dataset) => total + dataset.records.length,
    0,
  );
  const metadataRecordCount = parsed.datasets.reduce(
    (total, dataset) => total + dataset.metadata.length,
    0,
  );

  if (rawSourceRecordCount !== loaded.manifest.expectedRawRecordCount) {
    diagnostics.push({
      severity: 'error',
      code: 'RECORD_COUNT_MISMATCH',
      message: `Manifest expects ${loaded.manifest.expectedRawRecordCount} raw records but parsed ${rawSourceRecordCount}.`,
      path: loaded.manifestRepositoryPath,
    });
  }

  if (metadataRecordCount !== loaded.manifest.expectedMetadataRecordCount) {
    diagnostics.push({
      severity: 'error',
      code: 'RECORD_COUNT_MISMATCH',
      message: `Manifest expects ${loaded.manifest.expectedMetadataRecordCount} metadata records but parsed ${metadataRecordCount}.`,
      path: loaded.manifestRepositoryPath,
    });
  }

  if (parsed.datasets.length === loaded.manifest.datasets.length) {
    diagnostics.push(...validateGovernanceReferences(loaded, parsed.datasets));
  }

  return { ...parsed, diagnostics };
};
