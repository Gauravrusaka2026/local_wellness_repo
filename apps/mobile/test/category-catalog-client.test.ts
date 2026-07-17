import assert from 'node:assert/strict';
import test from 'node:test';

import { listRoutingCategoryCatalog } from '../src/complaints/complaint-service';

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
