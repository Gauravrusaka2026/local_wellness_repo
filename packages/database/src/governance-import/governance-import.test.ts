import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type {
  GovernanceManifestDataset,
  GovernanceParsedDataset,
  GovernanceSourceRecord,
} from '@local-wellness/types';

import { buildGovernanceBaselineModel } from './build-seed-model.js';
import {
  type GovernanceCliOptions,
  type GovernancePipelineOutput,
  runGovernancePipeline,
} from './cli.js';
import {
  loadGovernanceManifest,
  parseGovernanceCsv,
  parseGovernanceSources,
} from './load-source.js';
import { createGovernanceValidationReport } from './report.js';
import {
  governanceSqlText,
  renderGovernanceSeedChecksumSql,
  renderGovernanceSeedSql,
} from './render-sql.js';
import { sha256Hex, stableGovernanceUuid } from './stable-id.js';
import {
  validateGovernanceDatasetRecords,
  validateGovernanceReferences,
  validateGovernanceSources,
} from './validate-source.js';

const canonicalManifestPath = '../../resources/governance/manifests/phase-2-baseline.v1.json';
const canonicalManifestAbsolutePath = path.resolve(canonicalManifestPath);
const repositoryRoot = path.resolve(path.dirname(canonicalManifestAbsolutePath), '../../..');

const silentPipelineOutput: GovernancePipelineOutput = {
  writeStderr: () => undefined,
  writeStdout: () => undefined,
};

const temporaryPipelineOptions = (
  temporaryDirectory: string,
  command: GovernanceCliOptions['command'],
  manifestPath = canonicalManifestPath,
): GovernanceCliOptions => ({
  command,
  checksumOutputPath: path.join(temporaryDirectory, '21_checksum.generated.sql'),
  manifestPath,
  outputPath: path.join(temporaryDirectory, '20_seed.generated.sql'),
  reportPath: path.join(temporaryDirectory, 'validation.json'),
});

const csvManifest: GovernanceManifestDataset = {
  id: 'departments',
  path: 'fixtures/test.csv',
  sha256: '0'.repeat(64),
  title: 'Demo',
  headers: ['Name', 'Notes'],
  expectedRecordCount: 1,
  naturalKey: ['Name'],
  disposition: 'operational',
};

const loadCanonicalPipeline = async () => {
  const loaded = await loadGovernanceManifest(canonicalManifestPath);
  const parsed = await parseGovernanceSources(loaded);
  const validated = validateGovernanceSources(loaded, parsed);
  assert.equal(validated.diagnostics.filter(({ severity }) => severity === 'error').length, 0);
  const model = buildGovernanceBaselineModel(loaded, validated);
  const report = createGovernanceValidationReport(loaded, validated, model, null);
  return { loaded, model, parsed, report, validated };
};

describe('governance CSV import pipeline', () => {
  it('parses a BOM, title row, header row, and quoted comma exactly', () => {
    const result = parseGovernanceCsv({
      content: Buffer.from('\uFEFFDemo,\nName,Notes\nAlpha,"A, B"\n'),
      repositoryPath: csvManifest.path,
      manifest: csvManifest,
    });

    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.dataset.records[0]?.values['Notes'], 'A, B');
    assert.equal(result.dataset.records[0]?.sourceRowNumber, 3);
  });

  it('fails closed for malformed CSV plus title, header, and row-width drift', () => {
    const malformed = parseGovernanceCsv({
      content: Buffer.from('Demo,\nName,Notes\nAlpha,"unterminated\n'),
      repositoryPath: csvManifest.path,
      manifest: csvManifest,
    });
    assert.equal(malformed.diagnostics[0]?.code, 'CSV_PARSE');

    const titleDrift = parseGovernanceCsv({
      content: Buffer.from('Changed,\nName,Notes\nAlpha,Value\n'),
      repositoryPath: csvManifest.path,
      manifest: csvManifest,
    });
    assert.equal(
      titleDrift.diagnostics.some(({ code }) => code === 'TITLE_MISMATCH'),
      true,
    );

    const headerDrift = parseGovernanceCsv({
      content: Buffer.from('Demo,\nName,Changed\nAlpha,Value\n'),
      repositoryPath: csvManifest.path,
      manifest: csvManifest,
    });
    assert.equal(
      headerDrift.diagnostics.some(({ code }) => code === 'HEADER_MISMATCH'),
      true,
    );

    const rowWidthDrift = parseGovernanceCsv({
      content: Buffer.from('Demo,\nName,Notes\nAlpha\n'),
      repositoryPath: csvManifest.path,
      manifest: csvManifest,
    });
    assert.equal(
      rowWidthDrift.diagnostics.some(({ code }) => code === 'ROW_WIDTH'),
      true,
    );
  });

  it('reports source hash drift without modifying the canonical source', async () => {
    const loaded = await loadGovernanceManifest(canonicalManifestPath);
    const mutatedManifest = structuredClone(loaded.manifest);
    const mutatedDataset = mutatedManifest.datasets.find(({ id }) => id === 'departments');
    assert.ok(mutatedDataset);
    const canonicalSourcePath = path.join(loaded.repositoryRoot, mutatedDataset.path);
    const sourceBeforeValidation = await readFile(canonicalSourcePath);
    mutatedDataset.sha256 = '0'.repeat(64);

    const parsed = await parseGovernanceSources({ ...loaded, manifest: mutatedManifest });

    assert.equal(
      parsed.diagnostics.some(
        ({ code, datasetId }) => code === 'HASH_MISMATCH' && datasetId === 'departments',
      ),
      true,
    );
    assert.deepEqual(await readFile(canonicalSourcePath), sourceBeforeValidation);
  });

  it('reports duplicate, incomplete, invalid-date, and invalid-URL source rows', () => {
    const districtManifest: GovernanceManifestDataset = {
      id: 'districts',
      path: 'fixtures/districts.csv',
      sha256: '1'.repeat(64),
      title: 'Districts',
      headers: ['District', 'Last Verified', 'Source URL'],
      expectedRecordCount: 3,
      naturalKey: ['District'],
      disposition: 'operational',
    };
    const sourceRecord = (row: number, values: Record<string, string>): GovernanceSourceRecord => ({
      id: `00000000-0000-5000-8000-${String(row).padStart(12, '0')}`,
      datasetId: 'districts',
      disposition: 'operational',
      sourcePath: districtManifest.path,
      sourceSha256: districtManifest.sha256,
      sourceRowNumber: row,
      recordSha256: String(row).padStart(64, '0'),
      values,
    });
    const dataset: GovernanceParsedDataset = {
      manifest: districtManifest,
      records: [
        sourceRecord(3, {
          District: '',
          'Last Verified': '13/07/2026',
          'Source URL': 'http://example.gov.in',
        }),
        sourceRecord(4, {
          District: 'Pune',
          'Last Verified': '2026-07-13',
          'Source URL': 'https://example.gov.in',
        }),
        sourceRecord(5, {
          District: 'Pune',
          'Last Verified': '2026-07-13',
          'Source URL': 'https://example.gov.in',
        }),
      ],
      metadata: [],
    };

    const codes = new Set(validateGovernanceDatasetRecords(dataset).map(({ code }) => code));
    assert.equal(codes.has('REQUIRED_MISSING'), true);
    assert.equal(codes.has('INVALID_DATE'), true);
    assert.equal(codes.has('INVALID_URL'), true);
    assert.equal(codes.has('DUPLICATE_KEY'), true);
  });

  it('detects missing parents without changing canonical rows', async () => {
    const loaded = await loadGovernanceManifest(canonicalManifestPath);
    const parsed = await parseGovernanceSources(loaded);
    const copiedDatasets = structuredClone(parsed.datasets);
    const talukas = copiedDatasets.find(({ manifest }) => manifest.id === 'talukas');
    assert.ok(talukas?.records[0]);
    talukas.records[0].values['District'] = 'Missing District';

    const diagnostics = validateGovernanceReferences(loaded, copiedDatasets);
    assert.equal(
      diagnostics.some(({ code }) => code === 'MISSING_PARENT'),
      true,
    );
  });

  it('builds the safe baseline with explicit aliases, quarantine, and provenance', async () => {
    const { model, report } = await loadCanonicalPipeline();

    assert.equal(model.rawSourceRecords.length, 887);
    assert.equal(model.metadataRecords.length, 14);
    assert.equal(model.referenceLinks.length, 22);
    assert.equal(model.states.length, 1);
    assert.equal(model.districts.length, 36);
    assert.equal(model.talukas.length, 359);
    assert.equal(model.localBodies.length, 190);
    assert.equal(model.localBodyDistricts.length, 191);
    assert.equal(model.wards.length, 70);
    assert.equal(model.departments.length, 16);
    assert.equal(model.offices.length, 38);
    assert.equal(model.officerRoles.length, 23);
    assert.equal(model.utilities.length, 10);
    assert.equal(model.emergencyContacts.length, 14);
    assert.equal(model.routingReferences.length, 18);
    assert.equal(report.counts.quarantinedRecords, 98);
    assert.equal(report.schemaVersion, 2);
    assert.equal(report.recordClassification.totals.sourceRecords, 901);
    assert.equal(report.recordClassification.totals.rejected, 0);
    assert.equal(report.recordClassification.totals.reconciled, true);
    assert.equal(
      report.recordClassification.files.every(
        ({ accepted, quarantined, reconciled, rejected, sourceRecords, unverified }) =>
          reconciled && sourceRecords === accepted + unverified + quarantined + rejected,
      ),
      true,
    );
    assert.deepEqual(
      report.recordClassification.files.find(({ id }) => id === 'wards'),
      {
        id: 'wards',
        path: 'resources/governance/csv/Wards.csv',
        sourceRecords: 70,
        accepted: 0,
        unverified: 0,
        quarantined: 70,
        rejected: 0,
        reconciled: true,
      },
    );
    assert.deepEqual(
      report.recordClassification.files.find(({ id }) => id === 'readme'),
      {
        id: 'readme',
        path: 'resources/governance/csv/README.csv',
        sourceRecords: 14,
        accepted: 14,
        unverified: 0,
        quarantined: 0,
        rejected: 0,
        reconciled: true,
      },
    );
    assert.equal(report.normalizedRecords.officers, 0);
    assert.equal(report.normalizedRecords.officerAssignments, 0);

    const vasaiWard = model.wards.find(({ sourceWardId }) => sourceWardId === 'VASA-W01');
    const vasaiBody = model.localBodies.find(
      ({ name }) => name === 'Vasai-Virar Municipal Corporation',
    );
    assert.equal(vasaiWard?.localBodyId, vasaiBody?.id);

    const bmc = model.localBodies.find(({ name }) => name === 'Brihanmumbai Municipal Corporation');
    assert.equal(
      model.localBodyDistricts.filter(({ localBodyId }) => localBodyId === bmc?.id).length,
      2,
    );
    assert.equal(
      model.localBodyDistricts.filter(
        ({ isPrimary, localBodyId }) => localBodyId === bmc?.id && isPrimary,
      ).length,
      0,
    );
  });

  it('normalizes placeholders and expands machine-safe emergency numbers', async () => {
    const { model } = await loadCanonicalPipeline();
    const dmaOffice = model.offices.find(
      ({ name }) => name === 'Directorate of Municipal Administration',
    );
    assert.equal(dmaOffice?.address, null);
    assert.equal(dmaOffice?.officialPhone, null);
    assert.equal(dmaOffice?.officialEmail, null);
    assert.equal(
      model.talukas.every(({ code }) => code === null),
      true,
    );
    assert.equal(
      model.wards.every(({ isPlaceholder, isRoutable }) => isPlaceholder && !isRoutable),
      true,
    );

    const districtFramework = model.emergencyContacts.find(
      ({ service }) => service === 'District Emergency Operation Centre',
    );
    assert.equal(districtFramework?.contact, null);
    assert.equal(districtFramework?.isPlaceholder, true);

    const police = model.emergencyContacts
      .filter(({ service }) => service === 'Police')
      .map(({ contact }) => contact);
    assert.deepEqual(police, ['100', '112']);
    assert.equal(
      model.emergencyContacts
        .filter(({ contact }) => contact !== null)
        .every(({ contact }) => /^\d+$/u.test(contact ?? '')),
      true,
    );
  });

  it('keeps routing references version 1, unresolved, non-routable, and emergency-aware', async () => {
    const { model } = await loadCanonicalPipeline();
    assert.equal(
      model.routingReferences.every(
        ({ isRoutable, resolutionStatus, status, version }) =>
          version === 1 && !isRoutable && resolutionStatus === 'unresolved' && status === 'draft',
      ),
      true,
    );
    assert.equal(model.routingReferences.filter(({ isEmergency }) => isEmergency).length, 3);
  });

  it('uses stable UUIDs and escapes PostgreSQL text literals', () => {
    assert.equal(
      stableGovernanceUuid('authority', 'state:mh'),
      '984805ee-52b9-5be0-bed2-3951cc6cab2d',
    );
    assert.equal(governanceSqlText("Collector O'Brien"), "'Collector O''Brien'");
  });

  it('renders byte-identical SQL independent of parsed dataset order', async () => {
    const first = await loadCanonicalPipeline();
    const reversedParsed = {
      ...first.parsed,
      datasets: [...first.parsed.datasets]
        .reverse()
        .map((dataset) => ({ ...dataset, records: [...dataset.records].reverse() })),
    };
    const reversedValidated = validateGovernanceSources(first.loaded, reversedParsed);
    const reversedModel = buildGovernanceBaselineModel(first.loaded, reversedValidated);
    const reversedReport = createGovernanceValidationReport(
      first.loaded,
      reversedValidated,
      reversedModel,
      null,
    );

    const firstSql = renderGovernanceSeedSql(first.model, first.loaded.manifest, first.report);
    const reversedSql = renderGovernanceSeedSql(
      reversedModel,
      first.loaded.manifest,
      reversedReport,
    );
    assert.equal(reversedSql, firstSql);
    assert.match(
      firstSql,
      /insert into governance\.import_files[\s\S]*?on conflict \(id\) do nothing;/u,
    );
    assert.match(
      firstSql,
      /insert into governance\.import_records[\s\S]*?on conflict \(id\) do nothing;/u,
    );
    assert.match(
      firstSql,
      /insert into governance\.complaint_routing_references[\s\S]*?on conflict \(id\) do nothing;/u,
    );
    assert.doesNotMatch(firstSql, /insert into governance\.officers\b/u);
    assert.doesNotMatch(firstSql, /insert into governance\.officer_assignments\b/u);

    const importBatchStatement = firstSql.match(
      /insert into governance\.import_batches[\s\S]*?;/u,
    )?.[0];
    assert.ok(importBatchStatement);
    assert.doesNotMatch(
      importBatchStatement,
      /generated_seed_sha256 = excluded\.generated_seed_sha256/u,
    );

    const seedSha256 = sha256Hex(firstSql);
    const checksumSql = renderGovernanceSeedChecksumSql(first.model, seedSha256);
    assert.match(checksumSql, new RegExp(`set generated_seed_sha256 = '${seedSha256}'`, 'u'));
    assert.match(checksumSql, /generated_seed_sha256 is null/u);
    assert.match(checksumSql, /get diagnostics affected_rows = row_count/u);
    assert.equal(renderGovernanceSeedChecksumSql(first.model, seedSha256), checksumSql);
  });

  it('reports missing and stale generated artifacts, including the checksum companion', async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'governance-artifacts-'));
    try {
      const checkOptions = temporaryPipelineOptions(temporaryDirectory, 'check');
      await assert.rejects(
        runGovernancePipeline(checkOptions, silentPipelineOutput),
        /Generated artifact is missing/u,
      );

      await runGovernancePipeline(
        temporaryPipelineOptions(temporaryDirectory, 'generate'),
        silentPipelineOutput,
      );
      await rm(checkOptions.checksumOutputPath);
      await assert.rejects(
        runGovernancePipeline(checkOptions, silentPipelineOutput),
        new RegExp(`Generated artifact is missing: ${checkOptions.checksumOutputPath}`, 'u'),
      );

      await runGovernancePipeline(
        temporaryPipelineOptions(temporaryDirectory, 'generate'),
        silentPipelineOutput,
      );
      await writeFile(checkOptions.checksumOutputPath, '-- stale checksum companion\n', 'utf8');
      await assert.rejects(
        runGovernancePipeline(checkOptions, silentPipelineOutput),
        new RegExp(`Generated artifact is stale: ${checkOptions.checksumOutputPath}`, 'u'),
      );

      await runGovernancePipeline(
        temporaryPipelineOptions(temporaryDirectory, 'generate'),
        silentPipelineOutput,
      );
      await writeFile(checkOptions.outputPath, '-- stale main seed\n', 'utf8');
      await assert.rejects(
        runGovernancePipeline(checkOptions, silentPipelineOutput),
        new RegExp(`Generated artifact is stale: ${checkOptions.outputPath}`, 'u'),
      );
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it('preserves every existing artifact when source validation fails', async () => {
    const artifactDirectory = await mkdtemp(path.join(tmpdir(), 'governance-preservation-'));
    const manifestDirectory = await mkdtemp(
      path.join(repositoryRoot, '.governance-manifest-test-'),
    );
    try {
      const validOptions = temporaryPipelineOptions(artifactDirectory, 'generate');
      await runGovernancePipeline(validOptions, silentPipelineOutput);
      const artifactPaths = [
        validOptions.outputPath,
        validOptions.checksumOutputPath,
        validOptions.reportPath,
      ];
      const artifactsBeforeFailure = await Promise.all(
        artifactPaths.map((artifactPath) => readFile(artifactPath)),
      );

      const invalidManifest = JSON.parse(await readFile(canonicalManifestAbsolutePath, 'utf8')) as {
        datasets: Array<{ id: string; sha256: string }>;
      };
      const departments = invalidManifest.datasets.find(({ id }) => id === 'departments');
      assert.ok(departments);
      departments.sha256 = '0'.repeat(64);
      const invalidManifestPath = path.join(manifestDirectory, 'invalid-hash-manifest.json');
      await writeFile(invalidManifestPath, `${JSON.stringify(invalidManifest, null, 2)}\n`, 'utf8');

      let validationFailureOutput = '';
      const capturingOutput: GovernancePipelineOutput = {
        writeStderr: (message) => {
          validationFailureOutput += message;
        },
        writeStdout: () => undefined,
      };
      await assert.rejects(
        runGovernancePipeline(
          {
            ...temporaryPipelineOptions(artifactDirectory, 'generate'),
            manifestPath: invalidManifestPath,
          },
          capturingOutput,
        ),
        /Governance validation failed with 1 error/u,
      );
      assert.match(validationFailureOutput, /"code": "HASH_MISMATCH"/u);

      const artifactsAfterFailure = await Promise.all(
        artifactPaths.map((artifactPath) => readFile(artifactPath)),
      );
      assert.deepEqual(artifactsAfterFailure, artifactsBeforeFailure);
    } finally {
      await rm(artifactDirectory, { force: true, recursive: true });
      await rm(manifestDirectory, { force: true, recursive: true });
    }
  });
});
