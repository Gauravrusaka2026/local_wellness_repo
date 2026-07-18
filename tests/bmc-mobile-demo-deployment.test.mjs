import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { buildBmcMobileDemoDeploymentArtifacts } from '../scripts/generate-bmc-mobile-demo-deployment.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const deploymentDirectory = resolve(repositoryRoot, 'supabase/deploy/bmc-mobile-demo');
const expectedSqlNames = [
  '01_baseline_categories_and_core.sql',
  '02_official_boundaries.sql',
  '03_ward_crosswalk_and_governance_verify.sql',
  '04_routing_activation_and_verify.sql',
];
const sqlEditorPartBudgetBytes = 950 * 1024;

const readSqlParts = async () =>
  Promise.all(
    expectedSqlNames.map(async (name) => ({
      name,
      sql: await readFile(resolve(deploymentDirectory, name), 'utf8'),
    })),
  );

test('BMC mobile demo deployment artifacts are current', async () => {
  const artifacts = await buildBmcMobileDemoDeploymentArtifacts();

  for (const [path, expected] of artifacts) {
    assert.equal(await readFile(path, 'utf8'), expected, `${path} is stale`);
  }
});

test('BMC mobile demo deployment exposes exactly four ordered SQL Editor parts', async () => {
  const names = (await readdir(deploymentDirectory)).sort((left, right) =>
    left.localeCompare(right),
  );

  assert.deepEqual(names, [...expectedSqlNames, 'README.md']);
});

test('each BMC mobile demo SQL Editor part is bounded and transaction-atomic', async () => {
  const parts = await readSqlParts();

  for (const { name, sql } of parts) {
    assert.ok(
      Buffer.byteLength(sql, 'utf8') <= sqlEditorPartBudgetBytes,
      `${name} exceeds the repository SQL Editor budget of ${sqlEditorPartBudgetBytes} bytes`,
    );
    assert.equal(
      sql.match(/^begin;\s*$/gimu)?.length,
      1,
      `${name} must start exactly one transaction`,
    );
    assert.equal(
      sql.match(/^commit;\s*$/gimu)?.length,
      1,
      `${name} must commit exactly one transaction`,
    );
    assert.match(sql, /\ncommit;\s*$/u, `${name} must end with its transaction commit`);
    assert.equal(
      sql.match(/pg_catalog\.pg_advisory_xact_lock/gu)?.length,
      1,
      `${name} must hold exactly one deployment transaction lock`,
    );
    assert.match(sql, /BMC_MOBILE_DEMO_SCHEMA_NOT_CURRENT/u);
    assert.doesNotMatch(sql, /^\\(?:connect|copy|echo|i|include|ir|o|set)\b/gimu);
    assert.doesNotMatch(sql, /\bcreate\s+(?:unique\s+)?index\s+concurrently\b/iu);
    assert.doesNotMatch(sql, /\b(?:alter\s+system|cluster|reindex|vacuum)\b/iu);
  }
});

test('BMC mobile demo parts keep baseline, geometry, crosswalk, and routing stages separated', async () => {
  const parts = new Map((await readSqlParts()).map(({ name, sql }) => [name, sql]));
  const baseline = parts.get(expectedSqlNames[0]);
  const boundaries = parts.get(expectedSqlNames[1]);
  const crosswalk = parts.get(expectedSqlNames[2]);
  const routing = parts.get(expectedSqlNames[3]);

  assert.match(baseline, /-- SECTION: canonical Maharashtra\/BMC deployment baseline/u);
  assert.match(baseline, /-- SECTION: pilot complaint category catalog/u);
  assert.match(baseline, /-- SECTION: BMC governance core and immutable import evidence/u);
  assert.match(baseline, /governance\.states/u);
  assert.match(baseline, /governance\.local_bodies/u);
  assert.match(baseline, /routing\.issue_categories/u);
  assert.doesNotMatch(baseline, /routing\.route_rules/u);

  assert.match(boundaries, /-- SECTION: official BMC jurisdiction boundaries/u);
  assert.match(boundaries, /governance\.jurisdiction_boundary_versions/u);
  assert.doesNotMatch(boundaries, /routing\.route_rules/u);

  assert.match(
    crosswalk,
    /-- SECTION: versioned ward crosswalks and governance routing references/u,
  );
  assert.match(crosswalk, /-- SECTION: generated governance source checksum/u);
  assert.match(crosswalk, /governance\.ward_boundary_crosswalk_versions/u);
  assert.match(crosswalk, /generated_seed_sha256/u);
  assert.doesNotMatch(crosswalk, /routing\.route_rules/u);

  assert.match(routing, /-- SECTION: BMC internal routing activation/u);
  assert.match(routing, /-- SECTION: end-to-end point-resolution verification/u);
  assert.match(routing, /routing\.route_rules/u);
  assert.match(routing, /BMC_ROUTING_OPERATIONAL_CATEGORY_COUNT_INVALID/u);
  assert.match(routing, /BMC_ROUTING_POINT_RESOLUTION_FAILED/u);
});
