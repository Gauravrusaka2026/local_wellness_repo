#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const bmcRoutingAssetSourceManifestPath = path.join(
  repositoryRoot,
  'resources/governance/manifests/bmc-routing-asset-sources.v1.json',
);

const officialServiceBaseUrl =
  'https://prsrvgisapp.mcgm.gov.in/server/rest/services/mcgm/MCGMGIS_Departments_Master_All_Layers_WGS/MapServer';

const expectedLayerContracts = new Map([
  [3, ['Manhole', 'esriGeometryPoint', 82926]],
  [4, ['Sewer Line', 'esriGeometryPolyline', 83273]],
  [6, ['Storm Water Manholes', 'esriGeometryPoint', 34431]],
  [7, ['Storm Water Drains', 'esriGeometryPolyline', 34711]],
  [22, ['Roadway', 'esriGeometryPolygon', 15209]],
  [66, ['Trees', 'esriGeometryPoint', 1959448]],
  [219, ['Pipeline', 'esriGeometryPolyline', 23417]],
  [283, ['Building', 'esriGeometryPolygon', 304939]],
  [291, ['Street Light', 'esriGeometryPoint', 100410]],
]);

const expectedPilotCategoryCodes = [
  'garbage_dump',
  'missed_sweeping',
  'pothole',
  'blocked_drain',
  'sewage_overflow',
  'water_leakage',
  'broken_streetlight',
  'open_manhole',
  'mosquito_breeding',
  'illegal_construction',
  'encroachment',
  'fallen_tree',
];

const expectedOperationalCategoryCodes = ['garbage_dump', 'missed_sweeping', 'mosquito_breeding'];

const expectedCandidateCategoryContracts = new Map([
  ['pothole', ['BMC_R003', 'municipal_road', [22]]],
  ['blocked_drain', ['BMC_R004', 'storm_water_drain', [6, 7]]],
  ['sewage_overflow', ['BMC_R005', 'sanitary_sewer', [3, 4]]],
  ['water_leakage', ['BMC_R006', 'water_distribution_asset', [219]]],
  ['broken_streetlight', ['BMC_R007', 'streetlight', [291]]],
  ['open_manhole', ['BMC_R008', 'unknown_manhole', [3, 6]]],
  ['illegal_construction', ['BMC_R010', 'building', [283]]],
  ['encroachment', ['BMC_R011', 'public_land_or_road', [22, 283]]],
  ['fallen_tree', ['BMC_R012', 'tree_or_garden_asset', [66]]],
]);

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const sorted = (values) =>
  [...values].sort((left, right) => String(left).localeCompare(String(right)));

const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
};

const validateUniqueStringArray = (errors, value, pathLabel, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value)) {
    errors.push(`${pathLabel} must be an array.`);
    return [];
  }

  if (!allowEmpty && value.length === 0) {
    errors.push(`${pathLabel} must not be empty.`);
  }

  const strings = value.filter((item) => typeof item === 'string' && item.length > 0);
  if (strings.length !== value.length) {
    errors.push(`${pathLabel} must contain only non-empty strings.`);
  }
  if (new Set(strings).size !== strings.length) {
    errors.push(`${pathLabel} must not contain duplicates.`);
  }
  return strings;
};

const validateExactSet = (errors, actual, expected, pathLabel) => {
  if (
    actual.length !== expected.length ||
    sorted(actual).some((value, index) => value !== sorted(expected)[index])
  ) {
    errors.push(`${pathLabel} does not match the pinned V1 contract.`);
  }
};

const validateOfficialMetadataUrl = (errors, value, layerId, pathLabel) => {
  if (value !== `${officialServiceBaseUrl}/${layerId}?f=pjson`) {
    errors.push(`${pathLabel} must use the pinned official MCGM layer metadata endpoint.`);
    return;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'prsrvgisapp.mcgm.gov.in') {
      errors.push(`${pathLabel} must use HTTPS on the official MCGM GIS host.`);
    }
  } catch {
    errors.push(`${pathLabel} must be a valid URL.`);
  }
};

export const validateBmcRoutingAssetSourceManifest = (manifest) => {
  const errors = [];
  if (!isRecord(manifest)) return ['manifest must be an object.'];

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must equal 1.');
  if (manifest.manifestVersion !== 'BMC_ROUTING_ASSET_SOURCES_V1') {
    errors.push('manifestVersion must identify the pinned V1 source contract.');
  }
  if (manifest.authority?.code !== 'BMC') errors.push('authority.code must equal BMC.');
  if (manifest.authority?.publisher !== 'Municipal Corporation of Greater Mumbai') {
    errors.push('authority.publisher must identify the official municipal publisher.');
  }

  const registration = manifest.sourceRegistration;
  if (!isRecord(registration)) {
    errors.push('sourceRegistration must be an object.');
  } else {
    if (registration.sourceKind !== 'official_api') {
      errors.push('sourceRegistration.sourceKind must equal official_api.');
    }
    if (registration.datasetKind !== 'routing_asset_inventory') {
      errors.push('sourceRegistration.datasetKind must equal routing_asset_inventory.');
    }
    if (registration.publicationStatus !== 'not_published') {
      errors.push('sourceRegistration.publicationStatus must remain not_published.');
    }
    if (registration.verificationStatus !== 'unverified') {
      errors.push('sourceRegistration.verificationStatus must remain unverified.');
    }
    if (registration.automaticFetchEnabled !== false) {
      errors.push('sourceRegistration.automaticFetchEnabled must remain false.');
    }
    if (registration.refreshCadence !== null) {
      errors.push('sourceRegistration.refreshCadence must remain null until reviewed.');
    }
  }

  const service = manifest.service;
  if (!isRecord(service)) {
    errors.push('service must be an object.');
  } else {
    if (service.serviceType !== 'arcgis_map_server') {
      errors.push('service.serviceType must equal arcgis_map_server.');
    }
    if (service.baseUrl !== officialServiceBaseUrl) {
      errors.push('service.baseUrl must equal the pinned official MCGM ArcGIS service.');
    }
    if (service.publisherClassification !== 'official') {
      errors.push('service.publisherClassification must equal official.');
    }
    if (!isIsoDate(service.metadataObservedOn)) {
      errors.push('service.metadataObservedOn must be an ISO calendar date.');
    }
    if (service.termsReviewStatus !== 'pending') {
      errors.push('service.termsReviewStatus must remain pending.');
    }
    if (service.bulkFeatureDownloadApproved !== false) {
      errors.push('service.bulkFeatureDownloadApproved must remain false.');
    }
  }

  const scope = manifest.scope;
  if (!isRecord(scope)) {
    errors.push('scope must be an object.');
  } else {
    const pilotCodes = validateUniqueStringArray(
      errors,
      scope.pilotCategoryCodes,
      'scope.pilotCategoryCodes',
    );
    const operationalCodes = validateUniqueStringArray(
      errors,
      scope.alreadyOperationalCategoryCodes,
      'scope.alreadyOperationalCategoryCodes',
    );
    validateExactSet(errors, pilotCodes, expectedPilotCategoryCodes, 'scope.pilotCategoryCodes');
    validateExactSet(
      errors,
      operationalCodes,
      expectedOperationalCategoryCodes,
      'scope.alreadyOperationalCategoryCodes',
    );
    if (scope.candidateCategoryCount !== expectedCandidateCategoryContracts.size) {
      errors.push(
        `scope.candidateCategoryCount must equal ${expectedCandidateCategoryContracts.size}.`,
      );
    }
    if (scope.activationPolicy !== 'source_discovery_only') {
      errors.push('scope.activationPolicy must remain source_discovery_only.');
    }
    if (scope.canonicalBootstrapFilesModified !== false) {
      errors.push('scope.canonicalBootstrapFilesModified must remain false.');
    }
  }

  if (!Array.isArray(manifest.layers)) {
    errors.push('layers must be an array.');
  }

  const layers = Array.isArray(manifest.layers) ? manifest.layers : [];
  const layersById = new Map();
  for (const [index, layer] of layers.entries()) {
    const pathLabel = `layers[${index}]`;
    if (!isRecord(layer)) {
      errors.push(`${pathLabel} must be an object.`);
      continue;
    }
    if (!Number.isInteger(layer.id)) {
      errors.push(`${pathLabel}.id must be an integer.`);
      continue;
    }
    if (layersById.has(layer.id)) errors.push(`${pathLabel}.id must be unique.`);
    layersById.set(layer.id, layer);

    const expected = expectedLayerContracts.get(layer.id);
    if (!expected) {
      errors.push(`${pathLabel}.id is not part of the pinned V1 layer set.`);
      continue;
    }

    const [expectedName, expectedGeometryType, expectedFeatureCount] = expected;
    if (layer.name !== expectedName) errors.push(`${pathLabel}.name does not match metadata.`);
    if (layer.geometryType !== expectedGeometryType) {
      errors.push(`${pathLabel}.geometryType does not match metadata.`);
    }
    validateOfficialMetadataUrl(errors, layer.metadataUrl, layer.id, `${pathLabel}.metadataUrl`);
    if (layer.observedFeatureCount !== expectedFeatureCount) {
      errors.push(`${pathLabel}.observedFeatureCount does not match the pinned observation.`);
    }
    if (!isIsoDate(layer.featureCountObservedOn)) {
      errors.push(`${pathLabel}.featureCountObservedOn must be an ISO calendar date.`);
    }
    if (layer.stableIdentifierReviewStatus !== 'pending') {
      errors.push(`${pathLabel}.stableIdentifierReviewStatus must remain pending.`);
    }

    const fields = validateUniqueStringArray(
      errors,
      layer.reviewedFields,
      `${pathLabel}.reviewedFields`,
    );
    if (!fields.includes('OBJECTID'))
      errors.push(`${pathLabel}.reviewedFields must include OBJECTID.`);
    if (!fields.includes('SHAPE')) errors.push(`${pathLabel}.reviewedFields must include SHAPE.`);
    const ownershipFields = validateUniqueStringArray(
      errors,
      layer.ownershipFieldCandidates,
      `${pathLabel}.ownershipFieldCandidates`,
      { allowEmpty: true },
    );
    for (const field of ownershipFields) {
      if (!fields.includes(field)) {
        errors.push(`${pathLabel}.ownershipFieldCandidates references undeclared field ${field}.`);
      }
    }
  }
  validateExactSet(
    errors,
    [...layersById.keys()],
    [...expectedLayerContracts.keys()],
    'layers[].id',
  );

  if (!Array.isArray(manifest.categories)) {
    errors.push('categories must be an array.');
  }
  const categories = Array.isArray(manifest.categories) ? manifest.categories : [];
  const categoryCodes = [];
  for (const [index, category] of categories.entries()) {
    const pathLabel = `categories[${index}]`;
    if (!isRecord(category)) {
      errors.push(`${pathLabel} must be an object.`);
      continue;
    }
    if (typeof category.categoryCode !== 'string') {
      errors.push(`${pathLabel}.categoryCode must be a string.`);
      continue;
    }
    categoryCodes.push(category.categoryCode);
    const expected = expectedCandidateCategoryContracts.get(category.categoryCode);
    if (!expected) {
      errors.push(`${pathLabel}.categoryCode is not one of the nine blocked pilot categories.`);
      continue;
    }
    const [expectedRoutingReference, expectedAssetType, expectedLayerIds] = expected;
    if (category.routingReferenceCode !== expectedRoutingReference) {
      errors.push(`${pathLabel}.routingReferenceCode does not match the canonical BMC reference.`);
    }
    if (category.assetType !== expectedAssetType) {
      errors.push(`${pathLabel}.assetType does not match the canonical BMC reference.`);
    }
    if (category.requiresAssetOwnership !== true) {
      errors.push(`${pathLabel}.requiresAssetOwnership must equal true.`);
    }
    if (category.importStatus !== 'not_started') {
      errors.push(`${pathLabel}.importStatus must remain not_started.`);
    }
    if (category.ownershipReviewStatus !== 'pending') {
      errors.push(`${pathLabel}.ownershipReviewStatus must remain pending.`);
    }
    if (category.entityMatchingStatus !== 'pending') {
      errors.push(`${pathLabel}.entityMatchingStatus must remain pending.`);
    }
    if (category.routingActivationStatus !== 'blocked') {
      errors.push(`${pathLabel}.routingActivationStatus must remain blocked.`);
    }
    if (category.productionRoutable !== false) {
      errors.push(`${pathLabel}.productionRoutable must remain false.`);
    }
    if (category.externalDeliveryApproved !== false) {
      errors.push(`${pathLabel}.externalDeliveryApproved must remain false.`);
    }

    const blockingRequirements = validateUniqueStringArray(
      errors,
      category.blockingRequirements,
      `${pathLabel}.blockingRequirements`,
    );
    for (const requiredBlocker of [
      'department_role_assignment_review',
      'snapshot_parser_and_entity_matching_review',
    ]) {
      if (!blockingRequirements.includes(requiredBlocker)) {
        errors.push(`${pathLabel}.blockingRequirements must include ${requiredBlocker}.`);
      }
    }

    if (!Array.isArray(category.layerMappings) || category.layerMappings.length === 0) {
      errors.push(`${pathLabel}.layerMappings must be a non-empty array.`);
      continue;
    }
    const actualLayerIds = [];
    for (const [mappingIndex, mapping] of category.layerMappings.entries()) {
      const mappingPath = `${pathLabel}.layerMappings[${mappingIndex}]`;
      if (!isRecord(mapping) || !Number.isInteger(mapping.layerId)) {
        errors.push(`${mappingPath} must identify an integer layerId.`);
        continue;
      }
      actualLayerIds.push(mapping.layerId);
      const layer = layersById.get(mapping.layerId);
      if (!layer) {
        errors.push(`${mappingPath}.layerId references an undeclared layer.`);
        continue;
      }
      if (typeof mapping.purpose !== 'string' || mapping.purpose.length < 20) {
        errors.push(`${mappingPath}.purpose must explain the bounded source use.`);
      }

      const selectedFields = new Set();
      for (const fieldGroup of [
        ['identifierFields', false],
        ['jurisdictionFields', true],
        ['ownershipFields', true],
        ['matchingFields', false],
      ]) {
        const [fieldGroupName, allowEmpty] = fieldGroup;
        const values = validateUniqueStringArray(
          errors,
          mapping[fieldGroupName],
          `${mappingPath}.${fieldGroupName}`,
          { allowEmpty },
        );
        for (const field of values) {
          if (!layer.reviewedFields.includes(field)) {
            errors.push(`${mappingPath}.${fieldGroupName} references undeclared field ${field}.`);
          }
          if (selectedFields.has(field)) {
            errors.push(`${mappingPath} assigns field ${field} to more than one semantic group.`);
          }
          selectedFields.add(field);
        }
      }
      for (const field of mapping.ownershipFields ?? []) {
        if (!layer.ownershipFieldCandidates.includes(field)) {
          errors.push(`${mappingPath}.ownershipFields includes unreviewed owner field ${field}.`);
        }
      }
    }
    validateExactSet(
      errors,
      actualLayerIds,
      expectedLayerIds,
      `${pathLabel}.layerMappings[].layerId`,
    );
  }
  validateExactSet(
    errors,
    categoryCodes,
    [...expectedCandidateCategoryContracts.keys()],
    'categories[].categoryCode',
  );
  if (new Set(categoryCodes).size !== categoryCodes.length) {
    errors.push('categories[].categoryCode must be unique.');
  }

  validateUniqueStringArray(
    errors,
    manifest.globalBlockingRequirements,
    'globalBlockingRequirements',
  );
  validateUniqueStringArray(errors, manifest.limitations, 'limitations');

  return errors;
};

export const loadBmcRoutingAssetSourceManifest = async (
  manifestPath = bmcRoutingAssetSourceManifestPath,
) => JSON.parse(await readFile(manifestPath, 'utf8'));

export const formatBmcRoutingAssetSourceValidation = (errors) =>
  errors.length === 0
    ? 'BMC routing-asset source manifest validation passed: 9 categories remain review-gated across 9 official metadata layers.'
    : [
        `BMC routing-asset source manifest validation failed with ${errors.length} error(s):`,
        ...errors.map((error) => `- ${error}`),
      ].join('\n');

const isMainModule =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  try {
    const manifest = await loadBmcRoutingAssetSourceManifest();
    const errors = validateBmcRoutingAssetSourceManifest(manifest);
    const output = formatBmcRoutingAssetSourceValidation(errors);
    (errors.length === 0 ? process.stdout : process.stderr).write(`${output}\n`);
    if (errors.length > 0) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error.';
    process.stderr.write(`BMC routing-asset source manifest could not be loaded: ${message}\n`);
    process.exitCode = 2;
  }
}
