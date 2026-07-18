import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { buildCurrentSessionSupabaseUpgradeArtifacts } from '../scripts/generate-current-session-supabase-upgrade.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const deploymentDirectory = resolve(repositoryRoot, 'supabase/deploy/current-session');
const migrationPath = resolve(deploymentDirectory, '01_migrations_39_through_43.sql');
const expectedMigrationNames = [
  '20260716116000_phase_10_complaint_location_proximity.sql',
  '20260716117000_phase_10_routing_delivery_readiness.sql',
  '20260716118000_bmc_ward_relationship_versions.sql',
  '20260716119000_government_invitation_scope_options.sql',
  '20260717100000_public_complaint_engagements.sql',
];

const sourceMarkers = (sql, marker) =>
  [...sql.matchAll(new RegExp(`^-- ${marker} SOURCE MIGRATION: (.+\\.sql)$`, 'gmu'))].map(
    (match) => match[1],
  );

test('current-session Supabase upgrade artifacts are current', async () => {
  const artifacts = await buildCurrentSessionSupabaseUpgradeArtifacts();

  for (const [path, expected] of artifacts) {
    assert.equal(await readFile(path, 'utf8'), expected, `${path} is stale`);
  }
});

test('compact upgrade contains exact source migrations 39 through 43 in order', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.deepEqual(sourceMarkers(sql, 'BEGIN'), expectedMigrationNames);
  assert.deepEqual(sourceMarkers(sql, 'END'), expectedMigrationNames);

  for (const migrationName of expectedMigrationNames) {
    const source = await readFile(
      resolve(repositoryRoot, 'supabase/migrations', migrationName),
      'utf8',
    );
    const identifier = migrationName.replace(/\.sql$/u, '');
    const start = `execute $migration_${identifier}$\n`;
    const end = `$migration_${identifier}$;`;
    const startIndex = sql.indexOf(start);
    const endIndex = sql.indexOf(end, startIndex + start.length);

    assert.notEqual(startIndex, -1, `${migrationName} source start is missing`);
    assert.notEqual(endIndex, -1, `${migrationName} source end is missing`);
    assert.equal(
      sql.slice(startIndex + start.length, endIndex),
      source,
      `${migrationName} bytes differ from the immutable source migration`,
    );
  }
});

test('compact upgrade is atomic, adaptive, and has final verification', async () => {
  const [sql, masterPart2] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(resolve(repositoryRoot, 'supabase/master.part-2.sql'), 'utf8'),
  ]);

  assert.equal(sql.match(/^begin;\s*$/gimu)?.length, 1);
  assert.equal(sql.match(/^commit;\s*$/gimu)?.length, 1);
  assert.match(sql, /\ncommit;\s*$/u);
  assert.equal(sql.match(/pg_catalog\.pg_advisory_xact_lock/gu)?.length, 1);
  assert.match(sql, /LOCAL_WELLNESS_MIGRATION_38_BASELINE_REQUIRED/u);
  assert.match(sql, /LOCAL_WELLNESS_PARTIAL_MIGRATION/u);
  assert.match(sql, /LOCAL_WELLNESS_NONCONTIGUOUS_MIGRATION_HISTORY/u);
  assert.match(sql, /Skipping already-complete migration/u);
  assert.match(sql, /LOCAL_WELLNESS_MIGRATION_43_VERIFICATION_FAILED/u);
  assert.match(sql, /public\.api_readiness_check\(\)/u);
  assert.doesNotMatch(sql, /supabase_migrations\.schema_migrations/u);
  assert.ok(Buffer.byteLength(sql, 'utf8') < Buffer.byteLength(masterPart2, 'utf8') / 4);
});
