import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/20260714110000_governance_sync_scheduling_and_contacts.sql',
  import.meta.url,
);

test('source contract hashes use an additive backfill before NOT NULL enforcement', async () => {
  const migration = await readFile(migrationUrl, 'utf8');
  const nullableColumn = migration.indexOf('add column source_contract_sha256 text,');
  const hashTrigger = migration.indexOf('create trigger source_endpoints_contract_hash');
  const backfill = migration.indexOf(
    'update governance.source_endpoints\nset source_contract_sha256 = source_contract_sha256;',
  );
  const notNull = migration.indexOf('alter column source_contract_sha256 set not null;');
  const hardenedValidator = migration.indexOf(
    'create or replace function governance.validate_source_endpoint()',
  );

  assert.ok(nullableColumn >= 0, 'the new column must initially accept existing rows');
  assert.ok(hashTrigger > nullableColumn, 'the deterministic hash trigger must exist first');
  assert.ok(backfill > hashTrigger, 'existing rows must be passed through the hash trigger');
  assert.ok(notNull > backfill, 'NOT NULL must be enforced only after backfill');
  assert.ok(
    hardenedValidator > notNull,
    'legacy rows must be hashed before stricter source-contract validation is installed',
  );
  assert.doesNotMatch(migration, /add column source_contract_sha256 text not null/u);
});
