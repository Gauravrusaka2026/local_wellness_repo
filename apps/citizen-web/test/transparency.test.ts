import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ApiError } from '../lib/api/client';
import {
  createNearbyViewport,
  getPublicComplaint,
  listPublicComplaints,
  mergePublicComplaintPages,
  projectApproximatePoint,
} from '../lib/api/transparency';
import {
  createWebTransparencyQuery,
  defaultWebTransparencyFilters,
} from '../lib/api/transparency-filters';

const identifiers = {
  categoryCode: 'road_maintenance',
  localBodyCode: '251528',
  publicComplaint: '10000000-0000-4000-8000-000000000003',
  relatedPublicComplaint: '10000000-0000-4000-8000-000000000004',
  wardCode: 'PMC-WARD-5',
} as const;

const publicItem = {
  category: { code: identifiers.categoryCode, name: 'Road maintenance' },
  localBody: { code: identifiers.localBodyCode, name: 'Reviewed local body' },
  location: { latitude: 18.52, longitude: 73.86, precisionMeters: 500 },
  publicId: identifiers.publicComplaint,
  publishedAt: '2026-07-16T10:05:00.000Z',
  status: 'reported',
  submittedAt: '2026-07-16T10:00:00.000Z',
  title: 'Road surface needs attention',
  updatedAt: '2026-07-16T10:05:00.000Z',
  ward: { code: identifiers.wardCode, name: 'Reviewed ward', wardNumber: '5' },
} as const;

const originalApiUrl = process.env['NEXT_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', 'http://127.0.0.1:3001');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
  else Reflect.set(process.env, 'NEXT_PUBLIC_API_URL', originalApiUrl);
});

describe('citizen web transparency client', () => {
  it('loads generalized public reports anonymously with no-store caching', async () => {
    let request: Readonly<{ input: string; init: RequestInit }> | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      request = { input: String(input), init: init ?? {} };
      return new Response(
        JSON.stringify({ data: { hasMore: false, items: [publicItem], nextCursor: null } }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }) as typeof fetch;

    const result = await listPublicComplaints({
      east: 74,
      limit: 100,
      north: 19,
      south: 18,
      statuses: ['reported'],
      west: 73,
      zoom: 12,
    });

    assert.equal(result.items[0]?.publicId, identifiers.publicComplaint);
    assert.match(request?.input ?? '', /\/api\/v1\/transparency\/complaints\?/u);
    assert.match(request?.input ?? '', /statuses=reported/u);
    assert.equal(request?.init.cache, 'no-store');
    assert.deepEqual(request?.init.headers, { Accept: 'application/json' });
  });

  it('rejects private or unknown response fields instead of rendering them', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            hasMore: false,
            items: [{ ...publicItem, exactLocation: { latitude: 18.521, longitude: 73.861 } }],
            nextCursor: null,
          },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )) as typeof fetch;

    await assert.rejects(
      listPublicComplaints({ east: 74, limit: 10, north: 19, south: 18, west: 73, zoom: 12 }),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('loads only the reviewed public detail contract', async () => {
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      assert.equal(init?.cache, 'no-store');
      assert.deepEqual(init?.headers, { Accept: 'application/json' });
      return new Response(
        JSON.stringify({
          data: {
            ...publicItem,
            summary: 'Reviewed summary.',
            duplicateGroup: {
              canonicalPublicId: identifiers.publicComplaint,
              relatedPublicIds: [identifiers.relatedPublicComplaint],
              totalCount: 2,
            },
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }) as typeof fetch;

    const detail = await getPublicComplaint(identifiers.publicComplaint);
    assert.equal(detail.summary, 'Reviewed summary.');
    assert.deepEqual(detail.duplicateGroup, {
      canonicalPublicId: identifiers.publicComplaint,
      relatedPublicIds: [identifiers.relatedPublicComplaint],
      totalCount: 2,
    });
    assert.equal('complaintNumber' in detail, false);
  });

  it('uses the shared strict detail decoder and rejects nullable reviewed summaries', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ data: { ...publicItem, summary: null, duplicateGroup: null } }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      )) as typeof fetch;

    await assert.rejects(
      getPublicComplaint(identifiers.publicComplaint),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('rejects private or malformed duplicate-group detail fields', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            ...publicItem,
            summary: 'Reviewed summary.',
            duplicateGroup: {
              canonicalPublicId: identifiers.publicComplaint,
              relatedPublicIds: [identifiers.relatedPublicComplaint],
              totalCount: 2,
              complaintIds: ['private-complaint-id'],
            },
          },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )) as typeof fetch;

    await assert.rejects(
      getPublicComplaint(identifiers.publicComplaint),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('rejects malformed requests and detail identifiers before performing a fetch', async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('fetch should not be called');
    }) as typeof fetch;

    await assert.rejects(
      listPublicComplaints({ east: 76, limit: 10, north: 19, south: 18, west: 73, zoom: 12 }),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_REQUEST',
    );
    await assert.rejects(
      getPublicComplaint('not-a-public-id'),
      (error: unknown) => error instanceof ApiError && error.status === 404,
    );
    assert.equal(fetchCalls, 0);
  });

  it('keeps applied filters on pagination and deduplicates overlapping pages', () => {
    const query = createWebTransparencyQuery(
      { east: 74, north: 19, south: 18, west: 73 },
      {
        ...defaultWebTransparencyFilters,
        categoryCode: identifiers.categoryCode,
        status: 'reported',
      },
      identifiers.publicComplaint,
    );
    assert.deepEqual(query.categoryCodes, [identifiers.categoryCode]);
    assert.deepEqual(query.statuses, ['reported']);
    assert.equal(query.cursor, identifiers.publicComplaint);

    const secondItem = { ...publicItem, publicId: '10000000-0000-4000-8000-000000000005' };
    const merged = mergePublicComplaintPages(
      { hasMore: true, items: [publicItem], nextCursor: identifiers.publicComplaint },
      { hasMore: false, items: [publicItem, secondItem], nextCursor: null },
    );
    assert.deepEqual(
      merged.items.map(({ publicId }) => publicId),
      [identifiers.publicComplaint, secondItem.publicId],
    );
    assert.equal(merged.hasMore, false);
  });

  it('creates a bounded non-municipality viewport and projects approximate points', () => {
    const viewport = createNearbyViewport(18.524, 73.856);
    assert.deepEqual(viewport, { east: 74.01, north: 18.67, south: 18.37, west: 73.71 });
    assert.deepEqual(projectApproximatePoint({ latitude: 18.52, longitude: 73.86 }, viewport), {
      xPercent: 50,
      yPercent: 50,
    });
    assert.throws(() => createNearbyViewport(91, 0), RangeError);
  });
});
