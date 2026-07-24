import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260723110000_prune_deferred_v1_subsystems.sql';

const loadMigration = () => readFile(migrationPath, 'utf8');

test('V1 database prune fails closed before destructive table drops', async () => {
  const migration = await loadMigration();

  assert.match(migration, /V1_PRUNE_WARD_CONTACT_MATRIX_REQUIRED/u);
  assert.match(migration, /V1_PRUNE_WARD_CONTACT_PROVENANCE_REQUIRED/u);
  assert.match(migration, /V1_PRUNE_WARD_CONTACT_MATRIX_INCOMPLETE/u);
  assert.match(migration, /V1_PRUNE_COMPLAINT_COMMENT_HISTORY_PRESENT/u);
  assert.match(migration, /lock table governance\.sync_source_leases in access exclusive mode/u);

  const firstDrop = migration.indexOf('drop table');
  assert.ok(firstDrop > migration.indexOf('V1_PRUNE_COMPLAINT_COMMENT_HISTORY_PRESENT'));
  assert.ok(firstDrop > migration.indexOf('V1_PRUNE_WARD_CONTACT_MATRIX_INCOMPLETE'));
});

test('V1 database prune does not cascade through unknown hosted dependencies', async () => {
  const migration = await loadMigration();

  assert.doesNotMatch(migration, /\bdrop (?:table|view)[^;]*\bcascade\b/iu);
  assert.match(
    migration,
    /create or replace function governance\.resolve_complaint_contact_readiness[\s\S]*drop view if exists governance\.current_verified_contacts;/u,
  );
});
