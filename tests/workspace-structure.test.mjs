import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');

const applicationNames = [
  'mobile',
  'citizen-web',
  'government-dashboard',
  'admin-console',
  'api',
  'realtime-server',
  'workers',
];

const packageNames = [
  'database',
  'api-client',
  'types',
  'validation',
  'routing-engine',
  'design-system',
  'localization',
  'config',
  'observability',
];

const platformDirectories = [
  'supabase/migrations',
  'supabase/seed',
  'supabase/functions',
  'supabase/policies',
  'supabase/tests',
  'infrastructure/docker',
  'infrastructure/terraform',
  'infrastructure/monitoring',
];

test('all documented applications are workspace packages', async () => {
  for (const applicationName of applicationNames) {
    const manifestPath = resolve(repositoryRoot, 'apps', applicationName, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    assert.equal(manifest.name, `@local-wellness/${applicationName}`);
    assert.equal(manifest.private, true);
  }
});

test('all documented shared packages are workspace packages', async () => {
  for (const packageName of packageNames) {
    const manifestPath = resolve(repositoryRoot, 'packages', packageName, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    assert.equal(manifest.name, `@local-wellness/${packageName}`);
    assert.equal(manifest.private, true);
  }
});

test('all documented platform directories exist', async () => {
  await Promise.all(
    platformDirectories.map((directory) => access(resolve(repositoryRoot, directory))),
  );
});
