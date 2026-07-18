import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  bmcRoutingAssetSourceManifestPath,
  loadBmcRoutingAssetSourceManifest,
  validateBmcRoutingAssetSourceManifest,
} from '../scripts/validate-bmc-routing-asset-sources.mjs';

const expectedCategoryCodes = [
  'blocked_drain',
  'broken_streetlight',
  'encroachment',
  'fallen_tree',
  'illegal_construction',
  'open_manhole',
  'pothole',
  'sewage_overflow',
  'water_leakage',
];

test('BMC routing-asset source manifest satisfies the fail-closed V1 contract', async () => {
  const manifest = await loadBmcRoutingAssetSourceManifest();

  assert.deepEqual(validateBmcRoutingAssetSourceManifest(manifest), []);
  assert.deepEqual(
    manifest.categories.map(({ categoryCode }) => categoryCode).sort(),
    expectedCategoryCodes,
  );
  assert.equal(manifest.layers.length, 9);
  assert.ok(manifest.categories.every(({ requiresAssetOwnership }) => requiresAssetOwnership));
  assert.ok(
    manifest.categories.every(
      ({
        externalDeliveryApproved,
        importStatus,
        ownershipReviewStatus,
        productionRoutable,
        routingActivationStatus,
      }) =>
        externalDeliveryApproved === false &&
        importStatus === 'not_started' &&
        ownershipReviewStatus === 'pending' &&
        productionRoutable === false &&
        routingActivationStatus === 'blocked',
    ),
  );
});

test('BMC routing-asset source manifest contains metadata and field selections, not features', async () => {
  const bytes = await readFile(bmcRoutingAssetSourceManifestPath);
  const source = bytes.toString('utf8');

  assert.ok(bytes.byteLength < 64 * 1024, 'source metadata manifest must remain bounded');
  assert.doesNotMatch(source, /"features"\s*:/u);
  assert.doesNotMatch(source, /"records"\s*:/u);
  assert.doesNotMatch(source, /\/query\?/u);
  assert.match(source, /\/MapServer\/219\?f=pjson/u);
  assert.match(source, /"OWNERSHIP"/u);
  assert.match(source, /"MAINTAINED_BY"/u);
});

test('BMC routing-asset validator rejects automatic activation and unofficial endpoints', async () => {
  const manifest = await loadBmcRoutingAssetSourceManifest();
  const activated = structuredClone(manifest);
  activated.categories[0].routingActivationStatus = 'active';
  activated.categories[0].productionRoutable = true;
  activated.sourceRegistration.automaticFetchEnabled = true;
  activated.service.bulkFeatureDownloadApproved = true;

  const activationErrors = validateBmcRoutingAssetSourceManifest(activated).join('\n');
  assert.match(activationErrors, /routingActivationStatus must remain blocked/u);
  assert.match(activationErrors, /productionRoutable must remain false/u);
  assert.match(activationErrors, /automaticFetchEnabled must remain false/u);
  assert.match(activationErrors, /bulkFeatureDownloadApproved must remain false/u);

  const unofficial = structuredClone(manifest);
  unofficial.layers[0].metadataUrl = 'https://example.com/MapServer/3?f=pjson';
  assert.match(
    validateBmcRoutingAssetSourceManifest(unofficial).join('\n'),
    /official MCGM layer metadata endpoint/u,
  );
});

test('BMC routing-asset validator rejects undeclared source fields and incomplete category coverage', async () => {
  const manifest = await loadBmcRoutingAssetSourceManifest();
  const unknownField = structuredClone(manifest);
  unknownField.categories[0].layerMappings[0].matchingFields.push('INVENTED_OWNER');
  assert.match(
    validateBmcRoutingAssetSourceManifest(unknownField).join('\n'),
    /references undeclared field INVENTED_OWNER/u,
  );

  const incomplete = structuredClone(manifest);
  incomplete.categories.pop();
  assert.match(
    validateBmcRoutingAssetSourceManifest(incomplete).join('\n'),
    /categories\[\]\.categoryCode does not match the pinned V1 contract/u,
  );
});
