import type {
  GovernanceDiagnostic,
  GovernanceManifestDataset,
  GovernanceSourceRecord,
} from '@local-wellness/types';

import { normalizeGovernanceKey } from './normalize.js';

export const governanceNaturalKey = (
  record: Pick<GovernanceSourceRecord, 'values'>,
  fields: readonly string[],
): string =>
  fields.map((field) => normalizeGovernanceKey(record.values[field] ?? '')).join('\u001f');

export const findGovernanceDuplicateKeys = (
  manifest: GovernanceManifestDataset,
  records: readonly GovernanceSourceRecord[],
): GovernanceDiagnostic[] => {
  const firstRows = new Map<string, number>();
  const diagnostics: GovernanceDiagnostic[] = [];

  for (const record of records) {
    const key = governanceNaturalKey(record, manifest.naturalKey);
    const firstRow = firstRows.get(key);
    if (firstRow !== undefined) {
      diagnostics.push({
        severity: 'error',
        code: 'DUPLICATE_KEY',
        message: `Natural key duplicates row ${firstRow}.`,
        path: manifest.path,
        datasetId: manifest.id,
        row: record.sourceRowNumber,
        field: manifest.naturalKey.join(', '),
      });
    } else {
      firstRows.set(key, record.sourceRowNumber);
    }
  }

  return diagnostics;
};

export const governanceRecordIndex = (
  records: readonly GovernanceSourceRecord[],
  field: string,
): ReadonlySet<string> =>
  new Set(records.map((record) => normalizeGovernanceKey(record.values[field] ?? '')));
