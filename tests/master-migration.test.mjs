import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');
const migrationsDirectory = resolve(repositoryRoot, 'supabase/migrations');
const reviewedPart1Cutoff = '20260714124000_phase_5_government_workflow_security_and_rpc.sql';

const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/u.test(name))
  .sort((left, right) => left.localeCompare(right));

const [completeMaster, part1, part2] = await Promise.all(
  ['master.sql', 'master.part-1.sql', 'master.part-2.sql'].map((name) =>
    readFile(resolve(repositoryRoot, 'supabase', name), 'utf8'),
  ),
);

const sourceMarkers = (sql, marker) =>
  [...sql.matchAll(new RegExp(`^-- ${marker} SOURCE MIGRATION: (.+\\.sql)$`, 'gmu'))].map(
    (match) => match[1],
  );

const manifestNames = (sql) =>
  [...sql.matchAll(/^-- [a-f0-9]{64} {2}(.+\.sql)$/gmu)].map((match) => match[1]);

test('complete master contains every ordered migration exactly once', () => {
  assert.deepEqual(sourceMarkers(completeMaster, 'BEGIN'), migrationNames);
  assert.deepEqual(sourceMarkers(completeMaster, 'END'), migrationNames);
  assert.deepEqual(manifestNames(completeMaster), migrationNames);
});

test('adaptive parts preserve exact ordered full-history coverage without overlap', () => {
  const part1Migrations = sourceMarkers(part1, 'BEGIN');
  const part2Migrations = sourceMarkers(part2, 'BEGIN');
  const combinedMigrations = [...part1Migrations, ...part2Migrations];

  assert.ok(part1Migrations.length > 0);
  assert.ok(part2Migrations.length > 0);
  assert.equal(part1Migrations.at(-1), reviewedPart1Cutoff);
  assert.deepEqual(combinedMigrations, migrationNames);
  assert.equal(new Set(combinedMigrations).size, migrationNames.length);
  assert.deepEqual(sourceMarkers(part1, 'END'), part1Migrations);
  assert.deepEqual(sourceMarkers(part2, 'END'), part2Migrations);
  assert.deepEqual(manifestNames(part1), part1Migrations);
  assert.deepEqual(manifestNames(part2), part2Migrations);
});

test('adaptive parts are transaction-atomic and fail closed on partial history', () => {
  for (const part of [part1, part2]) {
    assert.equal(part.match(/\nbegin;\n\nselect pg_catalog\.pg_advisory_xact_lock/gmu)?.length, 1);
    assert.match(part, /\ncommit;\n$/u);
    assert.match(part, /LOCAL_WELLNESS_PARTIAL_MIGRATION/u);
    assert.match(part, /LOCAL_WELLNESS_NONCONTIGUOUS_MIGRATION_HISTORY/u);
    assert.match(part, /Skipping already-complete migration/u);
    assert.match(part, /local_wellness_bundle_fingerprints/u);
  }

  assert.match(part1, /create table public\.profiles/u);
  assert.match(part2, /LOCAL_WELLNESS_PART_1_REQUIRED/u);
  assert.match(part2, /LOCAL_WELLNESS_FINAL_READINESS_FAILED/u);
});

test('each SQL Editor part is smaller than the complete master', () => {
  const completeBytes = Buffer.byteLength(completeMaster, 'utf8');

  assert.ok(Buffer.byteLength(part1, 'utf8') < completeBytes);
  assert.ok(Buffer.byteLength(part2, 'utf8') < completeBytes);
});
