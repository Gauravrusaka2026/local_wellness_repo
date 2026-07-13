import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type {
  GovernanceDiagnostic,
  GovernanceImportManifest,
  GovernanceMetadataRecord,
  GovernanceParsedDataset,
  GovernanceSourceFileReport,
  GovernanceSourceRecord,
} from '@local-wellness/types';
import { governanceManifestSchema, normalizeGovernanceText } from '@local-wellness/validation';
import { parse } from 'csv-parse/sync';

import { sha256Hex, stableGovernanceUuid } from './stable-id.js';

export interface LoadedGovernanceManifest {
  manifest: GovernanceImportManifest;
  manifestPath: string;
  manifestRepositoryPath: string;
  manifestSha256: string;
  repositoryRoot: string;
}

export interface ParsedGovernanceSources {
  datasets: GovernanceParsedDataset[];
  diagnostics: GovernanceDiagnostic[];
  sourceFiles: GovernanceSourceFileReport[];
}

interface ParseCsvInput {
  content: Buffer;
  repositoryPath: string;
  manifest: GovernanceImportManifest['datasets'][number];
}

interface ParseCsvResult {
  dataset: GovernanceParsedDataset;
  diagnostics: GovernanceDiagnostic[];
}

const findRepositoryRoot = async (startPath: string): Promise<string> => {
  let current = path.resolve(startPath);
  while (true) {
    try {
      await readFile(path.join(current, 'pnpm-workspace.yaml'));
      return current;
    } catch (error) {
      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error(`Could not find repository root from ${startPath}.`, { cause: error });
      }
      current = parent;
    }
  }
};

export const loadGovernanceManifest = async (
  manifestPath: string,
): Promise<LoadedGovernanceManifest> => {
  const absoluteManifestPath = path.resolve(manifestPath);
  const repositoryRoot = await findRepositoryRoot(path.dirname(absoluteManifestPath));
  const content = await readFile(absoluteManifestPath);
  const manifest = governanceManifestSchema.parse(JSON.parse(content.toString('utf8')));

  return {
    manifest,
    manifestPath: absoluteManifestPath,
    manifestRepositoryPath: path
      .relative(repositoryRoot, absoluteManifestPath)
      .split(path.sep)
      .join('/'),
    manifestSha256: sha256Hex(content),
    repositoryRoot,
  };
};

const rowRecord = (headers: readonly string[], row: readonly string[]): Record<string, string> =>
  Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));

export const parseGovernanceCsv = ({
  content,
  manifest,
  repositoryPath,
}: ParseCsvInput): ParseCsvResult => {
  const diagnostics: GovernanceDiagnostic[] = [];
  let rows: string[][];

  try {
    rows = parse(content, {
      bom: true,
      cast: false,
      relax_column_count: true,
      skip_empty_lines: false,
    }) as string[][];
  } catch (error) {
    return {
      dataset: { manifest, records: [], metadata: [] },
      diagnostics: [
        {
          severity: 'error',
          code: 'CSV_PARSE',
          message: error instanceof Error ? error.message : 'CSV parsing failed.',
          path: repositoryPath,
          datasetId: manifest.id,
        },
      ],
    };
  }

  const titleRow = rows[0] ?? [];
  const headerRow = rows[1] ?? [];
  if (titleRow[0] !== manifest.title || titleRow.slice(1).some((value) => value !== '')) {
    diagnostics.push({
      severity: 'error',
      code: 'TITLE_MISMATCH',
      message: `Expected title row ${JSON.stringify(manifest.title)}.`,
      path: repositoryPath,
      datasetId: manifest.id,
      row: 1,
    });
  }

  if (
    headerRow.length !== manifest.headers.length ||
    headerRow.some((header, index) => header !== manifest.headers[index])
  ) {
    diagnostics.push({
      severity: 'error',
      code: 'HEADER_MISMATCH',
      message: 'CSV headers differ from the hash-pinned manifest contract.',
      path: repositoryPath,
      datasetId: manifest.id,
      row: 2,
    });
  }

  if (manifest.id !== 'readme' && new Set(headerRow).size !== headerRow.length) {
    diagnostics.push({
      severity: 'error',
      code: 'HEADER_MISMATCH',
      message: 'CSV headers must be unique.',
      path: repositoryPath,
      datasetId: manifest.id,
      row: 2,
    });
  }

  const dataRows = rows.slice(2);
  if (dataRows.length !== manifest.expectedRecordCount) {
    diagnostics.push({
      severity: 'error',
      code: 'RECORD_COUNT_MISMATCH',
      message: `Expected ${manifest.expectedRecordCount} records but parsed ${dataRows.length}.`,
      path: repositoryPath,
      datasetId: manifest.id,
    });
  }

  const records: GovernanceSourceRecord[] = [];
  const metadata: GovernanceMetadataRecord[] = [];

  for (const [dataIndex, row] of dataRows.entries()) {
    const sourceRowNumber = dataIndex + 3;
    if (row.length !== manifest.headers.length) {
      diagnostics.push({
        severity: 'error',
        code: 'ROW_WIDTH',
        message: `Expected ${manifest.headers.length} columns but found ${row.length}.`,
        path: repositoryPath,
        datasetId: manifest.id,
        row: sourceRowNumber,
      });
      continue;
    }

    if (manifest.id === 'readme') {
      const key = normalizeGovernanceText(row[0] ?? '');
      const value = normalizeGovernanceText(row[1] ?? '');
      if (key.length === 0) {
        diagnostics.push({
          severity: 'error',
          code: 'REQUIRED_MISSING',
          message: 'README metadata key is required.',
          path: repositoryPath,
          datasetId: manifest.id,
          row: sourceRowNumber,
          field: 'metadata_key',
        });
        continue;
      }
      metadata.push({
        id: stableGovernanceUuid('metadata', `${manifest.sha256}:${sourceRowNumber}:${key}`),
        sourcePath: repositoryPath,
        sourceSha256: manifest.sha256,
        sourceRowNumber,
        key,
        value,
      });
      continue;
    }

    const values = rowRecord(manifest.headers, row);
    const serializedValues = JSON.stringify(
      manifest.headers.map((header) => [header, values[header]]),
    );
    const recordSha256 = sha256Hex(serializedValues);
    records.push({
      id: stableGovernanceUuid(
        'raw-record',
        `${manifest.id}:${manifest.sha256}:${sourceRowNumber}:${recordSha256}`,
      ),
      datasetId: manifest.id,
      disposition: manifest.disposition,
      sourcePath: repositoryPath,
      sourceSha256: manifest.sha256,
      sourceRowNumber,
      recordSha256,
      values,
    });
  }

  return { dataset: { manifest, records, metadata }, diagnostics };
};

const validateManifestCoverage = async (
  loaded: LoadedGovernanceManifest,
): Promise<GovernanceDiagnostic[]> => {
  const csvDirectory = path.join(loaded.repositoryRoot, 'resources/governance/csv');
  const actualFiles = (await readdir(csvDirectory))
    .filter((name) => name.endsWith('.csv'))
    .map((name) => `resources/governance/csv/${name}`)
    .sort();
  const manifestFiles = loaded.manifest.datasets.map(({ path: sourcePath }) => sourcePath).sort();

  if (JSON.stringify(actualFiles) === JSON.stringify(manifestFiles)) {
    return [];
  }

  const actual = new Set(actualFiles);
  const declared = new Set(manifestFiles);
  const missing = actualFiles.filter((file) => !declared.has(file));
  const stale = manifestFiles.filter((file) => !actual.has(file));

  return [
    {
      severity: 'error',
      code: 'DATASET_COVERAGE',
      message: `Manifest coverage differs from canonical CSVs; missing=[${missing.join(', ')}], stale=[${stale.join(', ')}].`,
      path: loaded.manifestRepositoryPath,
    },
  ];
};

export const parseGovernanceSources = async (
  loaded: LoadedGovernanceManifest,
): Promise<ParsedGovernanceSources> => {
  const diagnostics = await validateManifestCoverage(loaded);
  const datasets: GovernanceParsedDataset[] = [];
  const sourceFiles: GovernanceSourceFileReport[] = [];

  const workbookPath = path.join(loaded.repositoryRoot, loaded.manifest.workbook.path);
  try {
    const workbook = await readFile(workbookPath);
    const actualHash = sha256Hex(workbook);
    if (actualHash !== loaded.manifest.workbook.sha256) {
      diagnostics.push({
        severity: 'error',
        code: 'HASH_MISMATCH',
        message: `Expected ${loaded.manifest.workbook.sha256} but found ${actualHash}.`,
        path: loaded.manifest.workbook.path,
      });
    }
    sourceFiles.push({
      id: 'workbook',
      path: loaded.manifest.workbook.path,
      sha256: actualHash,
      recordCount: 0,
      disposition: 'human_reference',
    });
  } catch (error) {
    diagnostics.push({
      severity: 'error',
      code: 'WORKBOOK_MISSING',
      message: error instanceof Error ? error.message : 'Workbook could not be read.',
      path: loaded.manifest.workbook.path,
    });
  }

  for (const datasetManifest of loaded.manifest.datasets) {
    const absolutePath = path.join(loaded.repositoryRoot, datasetManifest.path);
    let content: Buffer;
    try {
      content = await readFile(absolutePath);
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'DATASET_COVERAGE',
        message: error instanceof Error ? error.message : 'Source file could not be read.',
        path: datasetManifest.path,
        datasetId: datasetManifest.id,
      });
      continue;
    }

    const actualHash = sha256Hex(content);
    if (actualHash !== datasetManifest.sha256) {
      diagnostics.push({
        severity: 'error',
        code: 'HASH_MISMATCH',
        message: `Expected ${datasetManifest.sha256} but found ${actualHash}.`,
        path: datasetManifest.path,
        datasetId: datasetManifest.id,
      });
    }

    const parsed = parseGovernanceCsv({
      content,
      repositoryPath: datasetManifest.path,
      manifest: datasetManifest,
    });
    datasets.push(parsed.dataset);
    diagnostics.push(...parsed.diagnostics);
    sourceFiles.push({
      id: datasetManifest.id,
      path: datasetManifest.path,
      sha256: actualHash,
      recordCount:
        datasetManifest.id === 'readme'
          ? parsed.dataset.metadata.length
          : parsed.dataset.records.length,
      disposition: datasetManifest.disposition,
    });
  }

  return { datasets, diagnostics, sourceFiles };
};
