import assert from 'node:assert/strict';
import test from 'node:test';

import {
  listComplaintTaxonomy,
  listRoutingCategoryCatalog,
} from '../src/complaints/complaint-service';

const category = {
  code: 'garbage_dump',
  description: 'Garbage requiring municipal attention.',
  id: '22222222-2222-4222-8222-222222222222',
  isEmergency: false,
  maximumMediaCount: 5,
  minimumMediaCount: 1,
  name: 'Garbage dump',
  parentCategoryId: null,
  requiresAsset: false,
  requiresLocation: true,
  requiredAttributes: [],
  recommendedMediaKinds: ['photo'],
  submissionAvailability: 'available',
} as const;

const taxonomyItem = {
  handoffActions: [],
  id: '33333333-3333-4333-8333-333333333333',
  primaryCategoryId: '44444444-4444-4444-8444-444444444444',
  primaryCode: 'SWM',
  primaryName: 'Solid Waste Management',
  subcategoryCode: 'SWM-001',
  subcategoryName: 'Garbage dump',
  subcategoryDescription: 'Garbage accumulated in a public place.',
  workflowType: 'PUBLIC_HEALTH',
  sensitivityClass: 'PUBLIC',
  routingStatus: 'mapped',
  routingProfileCategoryId: category.id,
  routingProfileCode: category.code,
  routingProfileName: category.name,
  submissionAvailability: 'available',
  requiresAsset: false,
  requiresLocation: true,
  isEmergency: false,
  minimumMediaCount: 1,
  maximumMediaCount: 5,
  requiredAttributes: [],
  recommendedMediaKinds: ['photo'],
} as const;

test('loads the protected category catalog instead of the verified-only category endpoint', async () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', 'https://api.example.test');

  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://api.example.test/api/v1/routing/categories/catalog');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer citizen-token');
      return new Response(
        JSON.stringify({ data: [category], meta: { requestId: 'category-catalog-test' } }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      );
    };

    assert.deepEqual(await listRoutingCategoryCatalog('citizen-token'), [category]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
    else Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', originalApiUrl);
  }
});

test('loads the protected detailed complaint taxonomy endpoint', async () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', 'https://api.example.test');

  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://api.example.test/api/v1/routing/categories/taxonomy');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer citizen-token');
      return new Response(
        JSON.stringify({ data: [taxonomyItem], meta: { requestId: 'taxonomy-catalog-test' } }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      );
    };

    assert.deepEqual(await listComplaintTaxonomy('citizen-token'), [taxonomyItem]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
    else Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', originalApiUrl);
  }
});
