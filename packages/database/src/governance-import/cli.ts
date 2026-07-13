#!/usr/bin/env node

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildGovernanceBaselineModel } from './build-seed-model.js';
import { loadGovernanceManifest, parseGovernanceSources } from './load-source.js';
import { createGovernanceValidationReport, renderGovernanceValidationReport } from './report.js';
import { renderGovernanceSeedChecksumSql, renderGovernanceSeedSql } from './render-sql.js';
import { sha256Hex } from './stable-id.js';
import { validateGovernanceSources } from './validate-source.js';

type GovernanceCommand = 'check' | 'generate' | 'validate';

export interface GovernanceCliOptions {
  command: GovernanceCommand;
  checksumOutputPath: string;
  manifestPath: string;
  outputPath: string;
  reportPath: string;
}

export interface GovernancePipelineOutput {
  writeStderr(message: string): void;
  writeStdout(message: string): void;
}

const processOutput: GovernancePipelineOutput = {
  writeStderr: (message) => process.stderr.write(message),
  writeStdout: (message) => process.stdout.write(message),
};

const optionValue = (argumentsList: readonly string[], option: string): string | undefined => {
  const index = argumentsList.indexOf(option);
  return index === -1 ? undefined : argumentsList[index + 1];
};

export const parseGovernanceCliOptions = (
  argumentsList: readonly string[],
): GovernanceCliOptions => {
  const command = argumentsList[0];
  if (command !== 'validate' && command !== 'generate' && command !== 'check') {
    throw new Error('Expected governance command: validate, generate, or check.');
  }

  return {
    command,
    checksumOutputPath:
      optionValue(argumentsList, '--checksum-output') ??
      '../../supabase/seed/21_phase_2_governance_checksum.generated.sql',
    manifestPath:
      optionValue(argumentsList, '--manifest') ??
      '../../resources/governance/manifests/phase-2-baseline.v1.json',
    outputPath:
      optionValue(argumentsList, '--output') ??
      '../../supabase/seed/20_phase_2_governance.generated.sql',
    reportPath:
      optionValue(argumentsList, '--report') ??
      '../../docs/worklogs/phase-2-maharashtra-governance/data-validation.json',
  };
};

const atomicWrite = async (targetPath: string, content: string): Promise<void> => {
  const absolutePath = path.resolve(targetPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = `${absolutePath}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, content, 'utf8');
    await rename(temporaryPath, absolutePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const assertMatches = async (targetPath: string, expected: string): Promise<void> => {
  let actual: string;
  try {
    actual = await readFile(path.resolve(targetPath), 'utf8');
  } catch (error) {
    throw new Error(`Generated artifact is missing: ${targetPath}.`, { cause: error });
  }
  if (actual !== expected) {
    throw new Error(`Generated artifact is stale: ${targetPath}.`);
  }
};

export const runGovernancePipeline = async (
  options: GovernanceCliOptions,
  output: GovernancePipelineOutput = processOutput,
): Promise<void> => {
  const loaded = await loadGovernanceManifest(options.manifestPath);
  const parsed = await parseGovernanceSources(loaded);
  const validated = validateGovernanceSources(loaded, parsed);
  const errors = validated.diagnostics.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    const report = createGovernanceValidationReport(loaded, validated, null, null);
    output.writeStderr(renderGovernanceValidationReport(report));
    throw new Error(`Governance validation failed with ${errors.length} error(s).`);
  }

  const model = buildGovernanceBaselineModel(loaded, validated);
  const preliminaryReport = createGovernanceValidationReport(loaded, validated, model, null);
  const seedSql = renderGovernanceSeedSql(model, loaded.manifest, preliminaryReport);
  const outputRepositoryPath = path
    .relative(loaded.repositoryRoot, path.resolve(options.outputPath))
    .split(path.sep)
    .join('/');
  const checksumOutputRepositoryPath = path
    .relative(loaded.repositoryRoot, path.resolve(options.checksumOutputPath))
    .split(path.sep)
    .join('/');
  const seedSha256 = sha256Hex(seedSql);
  const report = createGovernanceValidationReport(
    loaded,
    validated,
    model,
    {
      path: outputRepositoryPath,
      sha256: seedSha256,
    },
    checksumOutputRepositoryPath,
  );
  const checksumSql = renderGovernanceSeedChecksumSql(model, seedSha256);
  const reportJson = renderGovernanceValidationReport(report);

  if (options.command === 'validate') {
    output.writeStdout(
      `${JSON.stringify({
        safeToGenerate: report.safeToGenerate,
        rawSourceRecords: report.counts.rawSourceRecords,
        metadataRecords: report.counts.metadataRecords,
        warnings: report.counts.warnings,
        referenceSources: report.normalizedRecords.referenceSources,
      })}\n`,
    );
    return;
  }

  if (options.command === 'check') {
    await assertMatches(options.outputPath, seedSql);
    await assertMatches(options.checksumOutputPath, checksumSql);
    await assertMatches(options.reportPath, reportJson);
    output.writeStdout(
      `Governance artifacts are current (${report.generatedSeed?.sha256 ?? 'unknown hash'}).\n`,
    );
    return;
  }

  await atomicWrite(options.outputPath, seedSql);
  await atomicWrite(options.checksumOutputPath, checksumSql);
  await atomicWrite(options.reportPath, reportJson);
  const generatedPaths = [options.outputPath, options.checksumOutputPath, options.reportPath].map(
    (generatedPath) =>
      path.relative(loaded.repositoryRoot, path.resolve(generatedPath)).split(path.sep).join('/'),
  );
  output.writeStdout(
    `Generated ${generatedPaths.join(', ')} (${report.generatedSeed?.sha256 ?? 'unknown hash'}).\n`,
  );
};

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  runGovernancePipeline(parseGovernanceCliOptions(process.argv.slice(2))).catch(
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
