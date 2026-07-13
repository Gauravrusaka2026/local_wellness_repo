import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(
  repositoryRoot,
  'resources/governance/manifests/phase-2-baseline.v1.json',
);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

describe('canonical governance resource contract', () => {
  it('covers every canonical CSV exactly once and pins all source bytes', async () => {
    const manifestBytes = await readFile(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const actualCsvPaths = (await readdir(path.join(repositoryRoot, 'resources/governance/csv')))
      .filter((name) => name.endsWith('.csv'))
      .map((name) => `resources/governance/csv/${name}`)
      .sort();
    const declaredCsvPaths = manifest.datasets.map(({ path: sourcePath }) => sourcePath).sort();

    assert.deepEqual(declaredCsvPaths, actualCsvPaths);
    assert.equal(new Set(declaredCsvPaths).size, declaredCsvPaths.length);
    for (const dataset of manifest.datasets) {
      const source = await readFile(path.join(repositoryRoot, dataset.path));
      assert.equal(sha256(source), dataset.sha256, dataset.path);
    }
    const workbook = await readFile(path.join(repositoryRoot, manifest.workbook.path));
    assert.equal(sha256(workbook), manifest.workbook.sha256);
  });

  it('pins the explicit alias and multi-district expansion without rewriting source rows', async () => {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(
      manifest.aliases.localBodies['Vasai-Virar City Municipal Corporation'],
      'Vasai-Virar Municipal Corporation',
    );
    assert.deepEqual(manifest.multiDistrictLocalBodies['Brihanmumbai Municipal Corporation'], [
      'Mumbai City',
      'Mumbai Suburban',
    ]);

    const wards = await readFile(
      path.join(repositoryRoot, 'resources/governance/csv/Wards.csv'),
      'utf8',
    );
    assert.match(wards, /Vasai-Virar City Municipal Corporation/u);
    assert.match(wards, /Mumbai City \/ Mumbai Suburban/u);
  });

  it('publishes a checked external seed hash, its database companion, and all sources', async () => {
    const report = JSON.parse(
      await readFile(
        path.join(
          repositoryRoot,
          'docs/worklogs/phase-2-maharashtra-governance/data-validation.json',
        ),
        'utf8',
      ),
    );
    const seed = await readFile(
      path.join(repositoryRoot, 'supabase/seed/20_phase_2_governance.generated.sql'),
    );
    const checksumCompanion = await readFile(
      path.join(repositoryRoot, 'supabase/seed/21_phase_2_governance_checksum.generated.sql'),
      'utf8',
    );

    assert.equal(report.normalizedRecords.referenceSources, 22);
    assert.equal(report.generatedSeed.sha256, sha256(seed));
    assert.match(
      checksumCompanion,
      new RegExp(`set generated_seed_sha256 = '${report.generatedSeed.sha256}'`, 'u'),
    );
    assert.match(checksumCompanion, /get diagnostics affected_rows = row_count/u);
    assert.equal(report.databaseGeneratedSeedSha256.value, report.generatedSeed.sha256);
    assert.equal(
      report.databaseGeneratedSeedSha256.companionPath,
      'supabase/seed/21_phase_2_governance_checksum.generated.sql',
    );
    assert.match(
      report.databaseGeneratedSeedSha256.reason,
      /generated companion records the externally computed main-seed SHA-256/u,
    );
  });
});
