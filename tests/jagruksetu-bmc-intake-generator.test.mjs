import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
const routeMapPath =
  'resources/governance/generated/jagruksetu-bmc-intake-v1/taxonomy-route-map.csv';
const importReadyPath = 'resources/governance/generated/jagruksetu-bmc-intake-v1/import-ready.json';
const validationReportPath =
  'resources/governance/generated/jagruksetu-bmc-intake-v1/validation-report.json';
const manifestPath = 'resources/governance/manifests/jagruksetu-bmc-intake-v1.json';
const manifestValidationPath =
  'resources/governance/manifests/jagruksetu-bmc-intake-v1.validation.json';
const migrationPath = 'supabase/migrations/20260724110000_v1_bmc_general_intake_and_handoffs.sql';
const seedPath = 'supabase/seed/56_jagruksetu_bmc_intake.generated.sql';
const deploymentPath = 'supabase/deploy/jagruksetu-bmc-intake-v1.sql';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('JagrukSetu BMC intake generator check mode detects no drift', async () => {
  const { stdout } = await executeFile('node', [
    'scripts/generate-jagruksetu-bmc-intake.mjs',
    '--check',
  ]);

  assert.match(
    stdout,
    /Checked 340 JagrukSetu BMC V1 mappings: 13 specialized ward, 243 generic ward, 84 protected handoff\./u,
  );
});

test('generated route map classifies every taxonomy leaf exactly once', async () => {
  const [routeMap, importReadySource, validationSource] = await Promise.all([
    readFile(routeMapPath, 'utf8'),
    readFile(importReadyPath, 'utf8'),
    readFile(validationReportPath, 'utf8'),
  ]);
  const importReady = JSON.parse(importReadySource);
  const validation = JSON.parse(validationSource);

  assert.equal(routeMap.trimEnd().split('\n').length - 1, 340);
  assert.equal(importReady.mappings.length, 340);
  assert.equal(new Set(importReady.mappings.map(({ taxonomyCode }) => taxonomyCode)).size, 340);
  assert.equal(
    importReady.mappings.filter(({ routeMode }) => routeMode === 'specialized_ward').length,
    13,
  );
  assert.equal(
    importReady.mappings.filter(({ routeMode }) => routeMode === 'generic_ward').length,
    243,
  );
  assert.equal(
    importReady.mappings.filter(({ routeMode }) => routeMode === 'protected_handoff').length,
    84,
  );
  assert.equal(
    importReady.mappings.filter(({ routingStatus }) =>
      ['pending_verification', 'protected_pending'].includes(routingStatus),
    ).length,
    0,
  );
  assert.equal(validation.valid, true);
  assert.equal(validation.counts.internallyMappedLeaves, 256);
  assert.equal(validation.counts.protectedHandoffLeaves, 84);
  assert.equal(validation.counts.expectedPrivateWardContacts, 338);
});

test('protected handoffs expose only public-safe call and HTTPS browser targets', async () => {
  const importReady = JSON.parse(await readFile(importReadyPath, 'utf8'));
  const actionsByKey = new Map(importReady.handoffActions.map((action) => [action.key, action]));

  assert.ok(importReady.handoffActions.length > 0);
  for (const action of importReady.handoffActions) {
    assert.match(action.key, /^[a-z][a-z0-9_]{1,79}$/u);
    assert.ok(action.priority >= 0 && action.priority <= 32_767);
    assert.doesNotMatch(action.target, /@/u);
    if (action.kind === 'call') {
      assert.match(action.target, /^[0-9]{3,15}$/u);
    } else {
      assert.equal(action.kind, 'browser');
      assert.equal(new URL(action.target).protocol, 'https:');
    }
  }

  for (const mapping of importReady.mappings) {
    if (mapping.routeMode === 'protected_handoff') {
      assert.equal(mapping.submissionAvailable, false);
      assert.equal(mapping.routingProfileCode, null);
      assert.ok(mapping.handoffActionKeys.length > 0);
      assert.ok(mapping.handoffActionKeys.every((key) => actionsByKey.has(key)));
    } else {
      assert.equal(mapping.submissionAvailable, true);
      assert.equal(mapping.handoffActionKeys.length, 0);
    }
  }
  assert.doesNotMatch(JSON.stringify(importReady), /[^\s"@]+@[^\s"]+/u);
});

test('manifest pins all source and generated artifact hashes', async () => {
  const [manifestSource, validationSource] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readFile(manifestValidationPath, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestSource);
  const validation = JSON.parse(validationSource);

  for (const [path, expectedHash] of Object.entries({
    ...manifest.sourceFiles,
    ...manifest.generatedFiles,
  })) {
    assert.equal(sha256(await readFile(path)), expectedHash, `${path} hash differs from manifest.`);
  }
  assert.equal(validation.manifestSha256, sha256(manifestSource));
  assert.equal(validation.internallyMappedLeafCount, 256);
  assert.equal(validation.protectedHandoffLeafCount, 84);
  assert.equal(validation.pendingLeafCount, 0);
  assert.equal(validation.sourceFileCount, 4);
  assert.equal(validation.generatedFileCount, 5);
  assert.equal(manifest.generatedFiles[deploymentPath], sha256(await readFile(deploymentPath)));
});

test('SQL Editor deployment embeds the exact migration and generated seed bytes', async () => {
  const [migration, seed, deployment] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(seedPath, 'utf8'),
    readFile(deploymentPath, 'utf8'),
  ]);
  const migrationStartMarker =
    '-- BEGIN EXACT SOURCE: 20260724110000_v1_bmc_general_intake_and_handoffs.sql\n';
  const migrationEndMarker =
    '-- END EXACT SOURCE: 20260724110000_v1_bmc_general_intake_and_handoffs.sql\n';
  const seedStartMarker = '-- BEGIN EXACT SOURCE: 56_jagruksetu_bmc_intake.generated.sql\n';
  const seedEndMarker = '-- END EXACT SOURCE: 56_jagruksetu_bmc_intake.generated.sql\n';
  const migrationStart = deployment.indexOf(migrationStartMarker);
  const migrationEnd = deployment.indexOf(migrationEndMarker);
  const seedStart = deployment.indexOf(seedStartMarker);
  const seedEnd = deployment.indexOf(seedEndMarker);

  assert.ok(migrationStart >= 0 && migrationEnd > migrationStart);
  assert.ok(seedStart > migrationEnd && seedEnd > seedStart);
  assert.equal(
    deployment.slice(migrationStart + migrationStartMarker.length, migrationEnd),
    migration,
  );
  assert.equal(deployment.slice(seedStart + seedStartMarker.length, seedEnd), seed);
  assert.match(deployment, new RegExp(`Migration source SHA-256: ${sha256(migration)}`, 'u'));
  assert.match(deployment, new RegExp(`Seed source SHA-256: ${sha256(seed)}`, 'u'));
  assert.match(
    deployment,
    new RegExp(`Ordered migration\\+seed payload SHA-256: ${sha256(`${migration}${seed}`)}`, 'u'),
  );
});

test('generated seed adds one generic profile and 26 copied private ward contacts', async () => {
  const seed = await readFile(seedPath, 'utf8');

  assert.match(seed, /'general_ward_complaint'/u);
  assert.match(seed, /'V1_WARD_GENERAL_WARD_COMPLAINT'/u);
  assert.match(seed, /"maximumCaptureDistanceMeters":50/u);
  assert.doesNotMatch(seed, /"maximumCaptureDistanceMeters":(?:5[1-9]|[6-9][0-9]|[1-9][0-9]{2,})/u);
  assert.match(seed, /source_contacts as \([\s\S]*category\.code = 'garbage_dump'/u);
  assert.equal((seed.match(/::uuid, '[A-Z](?:\/[A-Z])?'::text\)/gu) ?? []).length, 26);
  assert.match(seed, /message = 'JAGRUKSETU_MAPPED_LEAF_COUNT_INVALID'/u);
  assert.match(seed, /message = 'JAGRUKSETU_PROTECTED_HANDOFF_LEAF_COUNT_INVALID'/u);
  assert.match(seed, /message = 'JAGRUKSETU_PROTECTED_ROUTE_LEAK_DETECTED'/u);
  assert.match(seed, /message = 'JAGRUKSETU_PROTECTED_HANDOFF_COVERAGE_INVALID'/u);
  assert.match(seed, /<> 338 then/u);
  assert.doesNotMatch(
    seed,
    /insert into routing\.ward_issue_contacts[\s\S]{0,1200}recipient_email\s*=\s*'/u,
  );
});
