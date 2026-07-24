import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildBmcDemoGovernanceArtifacts } from '../scripts/generate-bmc-demo-governance.mjs';

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');

test('BMC governance generator preserves the reviewed source contract', async () => {
  const { manifest, report, workbook } = await buildBmcDemoGovernanceArtifacts();

  assert.equal(manifest.expectedRawRecordCount, 114);
  assert.equal(manifest.datasets.length, 10);
  assert.equal(report.status, 'passed_with_warnings');
  assert.deepEqual(report.counts, {
    tables: 10,
    rawSourceRecords: 114,
    geometryFeatures: 24,
    errors: 0,
    warnings: 6,
  });
  assert.deepEqual(report.geometry, {
    nativeCrs: 'EPSG:32643',
    storedCrs: 'EPSG:4326',
    bounds: {
      minLongitude: 72.77610547881443,
      minLatitude: 18.892731281374942,
      maxLongitude: 72.98097315599925,
      maxLatitude: 19.270219192059148,
    },
    operationalWardCount: 26,
    legacyGeometryWardCount: 24,
    unconditionalDemoWardCount: 22,
    conditionalDemoWardCount: 4,
  });
  assert.equal(report.generatedSeed.externalDeliveryApproved, false);

  const wardRows = workbook.tables.get('Ward Offices').rows;
  const conditionalWardCodes = wardRows
    .filter(({ values }) => values.demo_routable === 'conditional')
    .map(({ values }) => values.operational_ward_code)
    .sort();
  assert.deepEqual(conditionalWardCodes, ['K/N', 'K/S', 'P/E', 'P/W']);
  assert.ok(wardRows.every(({ values }) => values.production_routable === 'false'));
});

test('BMC governance artifacts pin their official inputs and exact geometry source', async () => {
  const { manifest } = await buildBmcDemoGovernanceArtifacts();
  const workbook = await readFile(manifest.workbook.path);
  const guide = await readFile(manifest.guide.path);
  const geometry = await readFile(manifest.geometry.path);

  assert.equal(
    sha256(workbook),
    'f86b70b239807316f26d9d0164958dcc49953240a519a5edff65b04a1b829b26',
  );
  assert.equal(sha256(guide), '24e9e176c97115243106401998676e751812323f3dbe19128df18b27c2655cd8');
  assert.equal(
    sha256(geometry),
    'ca6f81f168159aa90a897680a6bed176f3d421acdc8841beeabf5c1aa751e1f0',
  );
  assert.equal(
    manifest.geometry.sourceUrl,
    'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer/238/query?where=1%3d1&outFields=GISMASTER.Wards.OBJECTID%2cGISMASTER.Wards.NAME%2cGISMASTER.Wards.FLAGID%2cGISMASTER.Wards.ZONE&returnGeometry=true&outSR=4326&orderByFields=GISMASTER.Wards.NAME&f=geojson',
  );
});

test('BMC governance seed normalizes internal-demo evidence without approving external delivery', async () => {
  const { files, report } = await buildBmcDemoGovernanceArtifacts();
  const [, seed] = [...files].find(([path]) =>
    path.endsWith('supabase/seed/50_bmc_demo_governance.generated.sql'),
  );

  assert.equal(sha256(seed), report.generatedSeed.sha256);
  const [, checksumSeed] = [...files].find(([path]) =>
    path.endsWith('supabase/seed/51_bmc_demo_governance_checksum.generated.sql'),
  );
  assert.match(checksumSeed, new RegExp(report.generatedSeed.sha256));
  assert.match(checksumSeed, /generated_seed_sha256 is null/);
  assert.match(seed, /'fa1e71b4-01e3-5e72-92e8-1476eec1adcd'/);
  assert.match(seed, /extensions\.st_unaryunion\(extensions\.st_collect\(boundary\)\)/);
  assert.match(seed, /externalDeliveryApproved":false/);
  assert.doesNotMatch(seed, /is_complaint_delivery_approved\s*=\s*true/i);

  const officersSection = seed.slice(
    seed.indexOf('insert into governance.officers'),
    seed.indexOf('insert into governance.officer_assignments'),
  );
  assert.doesNotMatch(officersSection, /'Vacant'/);
});

test('BMC routing seed activates only reviewed asset-independent internal routes', async () => {
  const { files, report } = await buildBmcDemoGovernanceArtifacts();
  const [, routingSeed] = [...files].find(([path]) =>
    path.endsWith('supabase/seed/52_bmc_demo_routing.generated.sql'),
  );
  const [, verificationSeed] = [...files].find(([path]) =>
    path.endsWith('supabase/seed/53_bmc_demo_routing_verification.generated.sql'),
  );

  assert.deepEqual(report.generatedRoutingSeed, {
    path: 'supabase/seed/52_bmc_demo_routing.generated.sql',
    sha256: sha256(routingSeed),
    verificationPath: 'supabase/seed/53_bmc_demo_routing_verification.generated.sql',
    verificationSha256: sha256(verificationSeed),
    operationalCategoryCount: 3,
    operationalWardCount: 22,
    routeRuleCount: 66,
    externalDeliveryApproved: false,
  });
  assert.match(verificationSeed, new RegExp(report.generatedRoutingSeed.sha256));
  assert.equal((routingSeed.match(/'BMC_INTERNAL_[A-Z0-9_]+'/gu) ?? []).length, 66);
  assert.equal((routingSeed.match(/'none', false, 100, 0, '\{\}'::uuid\[\]/gu) ?? []).length, 66);
  assert.match(routingSeed, /where code = 'garbage_dump';/u);
  assert.match(routingSeed, /where code = 'missed_sweeping';/u);
  assert.match(routingSeed, /where code = 'mosquito_breeding';/u);
  assert.doesNotMatch(routingSeed, /'BMC_INTERNAL_[A-Z0-9_]+_(?:K_S|K_N|P_E|P_W)'/u);
  assert.match(routingSeed, /BMC_ROUTING_SPLIT_CHILD_BECAME_ELIGIBLE/u);
  assert.match(routingSeed, /on conflict \(route_rule_id, version\) do nothing/u);
  assert.match(routingSeed, /external BMC delivery/u);
  assert.doesNotMatch(routingSeed, /is_complaint_delivery_approved\s*=\s*true/iu);
  assert.match(verificationSeed, /candidate_count <> 66 or covered_case_count <> 66/u);
  assert.doesNotMatch(
    verificationSeed,
    /governance\.(?:contact_channels|contact_channel_versions)/u,
  );
});

test('committed BMC governance artifacts are current', async () => {
  const { files } = await buildBmcDemoGovernanceArtifacts();

  for (const [path, expected] of files) {
    assert.equal(await readFile(path, 'utf8'), expected, `${path} is stale`);
  }
});
