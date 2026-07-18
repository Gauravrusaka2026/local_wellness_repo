import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildMaharashtraBatch0Artifacts } from '../scripts/generate-maharashtra-batch0-governance.mjs';

const operationalTableNames = [
  '05_talukas.csv',
  '06_local_bodies.csv',
  '07_wards.csv',
  '09_departments.csv',
  '10_offices.csv',
  '11_officer_roles.csv',
  '12_officers.csv',
  '13_officer_assignments.csv',
  '14_contact_versions.csv',
  '15_utilities.csv',
  '16_emergency_contacts.csv',
  '17_routing_references.csv',
  '18_assets.csv',
  '19_asset_ownership_versions.csv',
  '25_villages.csv',
];

test('Maharashtra Batch 0 validates its immutable source bundle and exact inventory', async () => {
  const { report, tables } = await buildMaharashtraBatch0Artifacts();

  assert.equal(report.status, 'passed_with_warnings');
  assert.deepEqual(report.archive, {
    path: 'resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip',
    sha256: '731c4aaad413b529ffdbd3638627d222bc4d3cf0714fe130ac54a75e06b1b7e4',
    byteSize: 1_100_841,
    memberCount: 28,
    expandedBytes: 1_324_331,
    internalManifestSha256: '169c56fed8ef0a30221e6217f2ea8d4192129b7aa1424048f7958700cd22971d',
    internalMemberHashesVerified: 27,
  });
  assert.equal(tables.size, 22);
  assert.equal(report.records.rawCsvRecords, 160);
  assert.equal(report.records.importFiles, 29);
  assert.equal(report.records.referenceSources, 38);
  assert.deepEqual(report.dataQuality, {
    malformedRows: 0,
    duplicatePrimaryKeys: 0,
    duplicateRows: 0,
    sourceVerificationCounts: { source_verified: 28, unverified: 5, stale: 5 },
    sourceRowsWithoutArchivedContentHash: 37,
    sourceRowsWithoutExplicitContentEffectiveDate: 38,
    discrepancyObservations: 17,
    discrepancyGroups: 6,
    openDataIssues: 21,
    headerOnlyOperationalCsvFiles: 15,
    wardBoundaryFeatures: 0,
  });
});

test('Batch 0 stages only exact hierarchy enrichments and quarantines ambiguous Mumbai', async () => {
  const { report, tables, importRecords } = await buildMaharashtraBatch0Artifacts();

  assert.equal(report.records.stateRecords, 1);
  assert.equal(report.records.districtRecords, 36);
  assert.equal(report.records.exactDistrictMatches, 35);
  assert.deepEqual(report.records.quarantinedDistricts, [
    {
      sourceId: 'district:lgd:482',
      name: 'Mumbai',
      lgdCode: '482',
      reason: 'No exact canonical name match; reviewed alias crosswalk required.',
    },
  ]);
  assert.ok(tables.get('03_states.csv').rows.every((row) => row.routable === 'false'));
  assert.ok(tables.get('04_districts.csv').rows.every((row) => row.routable === 'false'));
  for (const tableName of operationalTableNames) {
    assert.equal(tables.get(tableName).rows.length, 0, `${tableName} must remain empty`);
  }

  const mumbai = importRecords.find((record) => record.sourceKey === 'district:lgd:482');
  assert.equal(mumbai.disposition, 'reference_only');
  assert.equal(mumbai.normalizedTable, null);
  assert.equal(mumbai.normalizedRecordId, null);
  assert.ok(mumbai.messages.some(({ code }) => code === 'AMBIGUOUS_CANONICAL_NAME'));
  assert.equal(importRecords.filter((record) => record.disposition === 'normalized').length, 36);
});

test('Batch 0 redacts transient security tokens while retaining original row hashes', async () => {
  const { report, importRecords, files } = await buildMaharashtraBatch0Artifacts();
  const seed = [...files].find(([path]) =>
    path.endsWith('supabase/seed/60_maharashtra_batch0_governance.generated.sql'),
  )[1];

  assert.equal(report.records.redactedRecords, 4);
  assert.equal(
    importRecords.filter((record) =>
      record.messages.some(({ code }) => code === 'SENSITIVE_QUERY_REDACTED'),
    ).length,
    4,
  );
  assert.doesNotMatch(seed, /OWASP_CSRFTOKEN=/iu);
  assert.match(seed, /SENSITIVE_QUERY_REDACTED/u);
  assert.ok(importRecords.every((record) => /^[0-9a-f]{64}$/u.test(record.recordSha256)));
});

test('Batch 0 seed cannot activate routing or promote operational entities', async () => {
  const { report, files } = await buildMaharashtraBatch0Artifacts();
  const seed = [...files].find(([path]) =>
    path.endsWith('supabase/seed/60_maharashtra_batch0_governance.generated.sql'),
  )[1];

  assert.equal(report.safeguards.routingActivated, false);
  assert.equal(report.safeguards.externalDeliveryApproved, false);
  assert.doesNotMatch(seed, /is_routing_eligible\s*=\s*true/iu);
  assert.doesNotMatch(
    seed,
    /insert into (?:governance\.(?:wards|offices|officers|officer_assignments|departments)|routing\.)/iu,
  );
  assert.match(seed, /set lgd_code = coalesce\(lgd_code, '27'\)/u);
  assert.match(seed, /MAHARASHTRA_BATCH0_AMBIGUOUS_MUMBAI_PROMOTED/u);
});

test('baseline governance regeneration preserves later LGD enrichments', async () => {
  const seed = await readFile('supabase/seed/20_phase_2_governance.generated.sql', 'utf8');

  assert.match(seed, /lgd_code = coalesce\(governance\.states\.lgd_code, excluded\.lgd_code\)/u);
  assert.match(seed, /lgd_code = coalesce\(governance\.districts\.lgd_code, excluded\.lgd_code\)/u);
});

test('committed Maharashtra Batch 0 artifacts are current', async () => {
  const { files } = await buildMaharashtraBatch0Artifacts();

  for (const [path, expected] of files) {
    assert.equal(await readFile(path, 'utf8'), expected, `${path} is stale`);
  }
});
