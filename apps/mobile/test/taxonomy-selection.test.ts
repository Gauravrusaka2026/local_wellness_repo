import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ComplaintDraft, ComplaintTaxonomyCatalogItem } from '@local-wellness/types';

import {
  buildComplaintTaxonomyAttributes,
  formatComplaintWorkflowType,
  getSelectedComplaintTaxonomyItem,
  listComplaintTaxonomyPrimaryOptions,
  listComplaintTaxonomySubcategories,
} from '../src/complaints/taxonomy-selection';

const routeCategoryId = '11111111-1111-4111-8111-111111111111';

const item = (
  overrides: Partial<ComplaintTaxonomyCatalogItem> = {},
): ComplaintTaxonomyCatalogItem => ({
  handoffActions: [],
  id: '22222222-2222-4222-8222-222222222222',
  primaryCategoryId: '33333333-3333-4333-8333-333333333333',
  primaryCode: 'SWM',
  primaryName: 'Solid Waste Management',
  subcategoryCode: 'SWM-001',
  subcategoryName: 'Garbage dump',
  subcategoryDescription: 'Garbage accumulated in a public place.',
  workflowType: 'PUBLIC_HEALTH',
  sensitivityClass: 'PUBLIC',
  routingStatus: 'mapped',
  routingProfileCategoryId: routeCategoryId,
  routingProfileCode: 'garbage_dump',
  routingProfileName: 'Garbage dump',
  submissionAvailability: 'available',
  requiresAsset: false,
  requiresLocation: true,
  isEmergency: false,
  minimumMediaCount: 1,
  maximumMediaCount: 5,
  requiredAttributes: [],
  recommendedMediaKinds: ['photo'],
  ...overrides,
});

const draft = (overrides: Partial<ComplaintDraft> = {}): ComplaintDraft => ({
  id: '44444444-4444-4444-8444-444444444444',
  status: 'active',
  visibility: 'private',
  categoryId: routeCategoryId,
  assetId: null,
  description: null,
  customAttributes: buildComplaintTaxonomyAttributes(item()),
  location: null,
  media: [],
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
  expiresAt: '2026-08-23T00:00:00.000Z',
  ...overrides,
});

describe('complaint taxonomy selection', () => {
  it('groups primary categories and orders issue types by stable taxonomy code', () => {
    const road = item({
      id: '55555555-5555-4555-8555-555555555555',
      primaryCategoryId: '66666666-6666-4666-8666-666666666666',
      primaryCode: 'RDS',
      primaryName: 'Roads, Footpaths & Public Ways',
      subcategoryCode: 'RDS-002',
      subcategoryName: 'Road cave-in',
    });
    const secondWaste = item({
      id: '77777777-7777-4777-8777-777777777777',
      subcategoryCode: 'SWM-002',
      subcategoryName: 'Missed garbage collection',
    });

    assert.deepEqual(
      listComplaintTaxonomyPrimaryOptions([item(), secondWaste, road]).map((option) => option.code),
      ['RDS', 'SWM'],
    );
    assert.deepEqual(
      listComplaintTaxonomySubcategories([secondWaste, item(), road], 'SWM').map(
        (option) => option.subcategoryCode,
      ),
      ['SWM-001', 'SWM-002'],
    );
    assert.deepEqual(
      listComplaintTaxonomyPrimaryOptions([
        item(),
        secondWaste,
        {
          ...secondWaste,
          primaryCategoryId: '88888888-8888-4888-8888-888888888888',
        },
      ]),
      [],
    );
  });

  it('persists only taxonomy identifiers and never client-selected official routing targets', () => {
    const attributes = buildComplaintTaxonomyAttributes(item());

    assert.deepEqual(attributes, {
      taxonomy_primary_code: 'SWM',
      taxonomy_subcategory_code: 'SWM-001',
      taxonomy_workflow_type: 'PUBLIC_HEALTH',
    });
    assert.equal(JSON.stringify(attributes).includes('authority'), false);
    assert.equal(JSON.stringify(attributes).includes('department'), false);
    assert.equal(JSON.stringify(attributes).includes('officer'), false);
  });

  it('restores a selection only when taxonomy identifiers and routing profile agree', () => {
    const catalog = [item()];

    assert.equal(getSelectedComplaintTaxonomyItem(catalog, draft())?.subcategoryCode, 'SWM-001');
    assert.equal(
      getSelectedComplaintTaxonomyItem(
        catalog,
        draft({ categoryId: '88888888-8888-4888-8888-888888888888' }),
      ),
      null,
    );
    assert.equal(
      getSelectedComplaintTaxonomyItem(
        catalog,
        draft({
          customAttributes: {
            ...buildComplaintTaxonomyAttributes(item()),
            taxonomy_workflow_type: 'CIVIC_MAINTENANCE',
          },
        }),
      ),
      null,
    );
  });

  it('supports unmapped detailed drafts with a null operational category', () => {
    const unmapped = item({
      routingStatus: 'pending_verification',
      routingProfileCategoryId: null,
      routingProfileCode: null,
      routingProfileName: null,
      submissionAvailability: 'unavailable',
    });
    const pendingDraft = draft({
      categoryId: null,
      customAttributes: buildComplaintTaxonomyAttributes(unmapped),
    });

    assert.equal(
      getSelectedComplaintTaxonomyItem([unmapped], pendingDraft)?.routingStatus,
      'pending_verification',
    );
    assert.equal(formatComplaintWorkflowType('ANTI_CORRUPTION'), 'Anti Corruption');
  });
});
