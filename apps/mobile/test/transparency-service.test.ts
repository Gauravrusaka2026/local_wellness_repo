import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ApiError } from '../src/api/client';
import {
  createNearbyViewport,
  NearbyLocationError,
  projectApproximatePoint,
  requiresNearbyLocationSettings,
} from '../src/transparency/nearby-viewport';
import { buildHotspotVisuals } from '../src/transparency/hotspot-visualization';
import {
  getPublicComplaint,
  listPublicComplaintHotspots,
  listPublicComplaints,
  mergePublicComplaintPages,
} from '../src/transparency/transparency-service';
import {
  createMobileHotspotQuery,
  createMobileTransparencyQuery,
  defaultMobileTransparencyFilters,
} from '../src/transparency/transparency-query';

const identifiers = {
  categoryCode: 'blocked_drain',
  localBodyCode: '251528',
  publicComplaint: '20000000-0000-4000-8000-000000000003',
  relatedPublicComplaint: '20000000-0000-4000-8000-000000000004',
} as const;

const publicItem = {
  category: { code: identifiers.categoryCode, name: 'Drainage' },
  localBody: { code: identifiers.localBodyCode, name: 'Reviewed local body' },
  location: { latitude: 19.08, longitude: 72.88, precisionMeters: 750 },
  publicId: identifiers.publicComplaint,
  publishedAt: '2026-07-16T10:05:00.000Z',
  status: 'in_progress',
  submittedAt: '2026-07-16T10:00:00.000Z',
  title: 'Drainage issue under review',
  updatedAt: '2026-07-16T10:05:00.000Z',
  ward: null,
} as const;

const originalApiUrl = process.env['EXPO_PUBLIC_API_URL'];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', 'http://127.0.0.1:3001');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
  else Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', originalApiUrl);
});

describe('mobile transparency service', () => {
  it('offers settings recovery only for permanent nearby-location denial', () => {
    assert.equal(
      requiresNearbyLocationSettings(
        new NearbyLocationError('Enable permission.', { requiresAppSettings: true }),
      ),
      true,
    );
    assert.equal(requiresNearbyLocationSettings(new NearbyLocationError('Try again.')), false);
    assert.equal(requiresNearbyLocationSettings(new Error('unrelated')), false);
  });

  it('uses an anonymous request and validates the shared list contract', async () => {
    let requestInit: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      requestInit = init;
      return new Response(
        JSON.stringify({ data: { hasMore: false, items: [publicItem], nextCursor: null } }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }) as typeof fetch;

    const result = await listPublicComplaints({
      east: 73,
      limit: 100,
      north: 20,
      south: 19,
      west: 72,
      zoom: 12,
    });

    assert.equal(result.items[0]?.publicId, identifiers.publicComplaint);
    assert.equal(requestInit?.method, 'GET');
    assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
  });

  it('loads only allowlisted aggregate hotspot cohorts without credentials', async () => {
    let requestedUrl = '';
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input);
      assert.deepEqual(init?.headers, { Accept: 'application/json' });
      return new Response(
        JSON.stringify({
          data: {
            items: [
              {
                categoryCount: 2,
                complaintCount: 4,
                from: '2026-07-01T00:00:00.000Z',
                id: 'hotspot:reviewed:1',
                location: { latitude: 19.08, longitude: 72.88, precisionMeters: 1_000 },
                radiusMeters: 1_200,
                to: '2026-07-16T00:00:00.000Z',
              },
            ],
          },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      );
    }) as typeof fetch;

    const result = await listPublicComplaintHotspots(
      createMobileHotspotQuery(
        { east: 73, north: 20, south: 19, west: 72 },
        defaultMobileTransparencyFilters,
      ),
    );
    assert.equal(result.items[0]?.complaintCount, 4);
    assert.match(requestedUrl, /\/api\/v1\/transparency\/hotspots\?/u);
    assert.match(requestedUrl, /statuses=reported/u);
    assert.match(requestedUrl, /statuses=in_progress/u);
    assert.doesNotMatch(requestedUrl, /Authorization/u);
  });

  it('fails closed when a public response contains an undeclared private field', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            hasMore: false,
            items: [{ ...publicItem, citizenUserId: 'private-user' }],
            nextCursor: null,
          },
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )) as typeof fetch;

    await assert.rejects(
      listPublicComplaints({ east: 73, limit: 10, north: 20, south: 19, west: 72, zoom: 12 }),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_RESPONSE',
    );
  });

  it('loads public detail without credentials or original media fields', async () => {
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      assert.deepEqual(init?.headers, { Accept: 'application/json' });
      return new Response(
        JSON.stringify({
          data: {
            ...publicItem,
            summary: 'A reviewed public summary.',
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
    assert.equal(detail.summary, 'A reviewed public summary.');
    assert.deepEqual(detail.duplicateGroup, {
      canonicalPublicId: identifiers.publicComplaint,
      relatedPublicIds: [identifiers.relatedPublicComplaint],
      totalCount: 2,
    });
    assert.equal('media' in detail, false);
  });

  it('fails closed when duplicate-group detail exposes an internal identifier', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            ...publicItem,
            summary: 'A reviewed public summary.',
            duplicateGroup: {
              canonicalPublicId: identifiers.publicComplaint,
              relatedPublicIds: [identifiers.relatedPublicComplaint],
              totalCount: 2,
              groupId: 'private-group-id',
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
      listPublicComplaints({ east: 75, limit: 10, north: 20, south: 19, west: 72, zoom: 12 }),
      (error: unknown) => error instanceof ApiError && error.code === 'INVALID_REQUEST',
    );
    await assert.rejects(
      getPublicComplaint('not-a-public-id'),
      (error: unknown) => error instanceof ApiError && error.status === 404,
    );
    assert.equal(fetchCalls, 0);
  });

  it('keeps applied filters on pagination and deduplicates overlapping pages', () => {
    const ongoingQuery = createMobileTransparencyQuery(
      { east: 73, north: 20, south: 19, west: 72 },
      defaultMobileTransparencyFilters,
    );
    assert.deepEqual(ongoingQuery.statuses, ['reported', 'in_progress']);

    const query = createMobileTransparencyQuery(
      { east: 73, north: 20, south: 19, west: 72 },
      {
        ...defaultMobileTransparencyFilters,
        categoryCode: identifiers.categoryCode,
        status: 'reported',
      },
      identifiers.publicComplaint,
    );
    assert.deepEqual(query.categoryCodes, [identifiers.categoryCode]);
    assert.deepEqual(query.statuses, ['reported']);
    assert.equal(query.cursor, identifiers.publicComplaint);

    const secondItem = { ...publicItem, publicId: '20000000-0000-4000-8000-000000000004' };
    const merged = mergePublicComplaintPages(
      { hasMore: true, items: [publicItem], nextCursor: identifiers.publicComplaint },
      { hasMore: false, items: [publicItem, secondItem], nextCursor: null },
    );
    assert.deepEqual(
      merged.items.map(({ publicId }) => publicId),
      [identifiers.publicComplaint, secondItem.publicId],
    );
  });

  it('rounds the device center before creating and plotting a bounded viewport', () => {
    const viewport = createNearbyViewport(19.076, 72.878);
    assert.deepEqual(viewport, { east: 73.03, north: 19.23, south: 18.93, west: 72.73 });
    assert.deepEqual(projectApproximatePoint({ latitude: 19.08, longitude: 72.88 }, viewport), {
      xPercent: 50,
      yPercent: 50,
    });
  });

  it('scales provider-neutral density visuals without exposing raw coordinate labels', () => {
    const viewport = { east: 73.03, north: 19.23, south: 18.93, west: 72.73 };
    const visuals = buildHotspotVisuals(
      [
        {
          categoryCount: 1,
          complaintCount: 4,
          from: '2026-07-01T00:00:00.000Z',
          id: 'hotspot:one',
          location: { latitude: 19.08, longitude: 72.88, precisionMeters: 1_000 },
          radiusMeters: 1_200,
          to: '2026-07-16T00:00:00.000Z',
        },
        {
          categoryCount: 2,
          complaintCount: 16,
          from: '2026-07-01T00:00:00.000Z',
          id: 'hotspot:two',
          location: { latitude: 19.1, longitude: 72.9, precisionMeters: 1_000 },
          radiusMeters: 1_500,
          to: '2026-07-16T00:00:00.000Z',
        },
      ],
      viewport,
    );
    assert.equal(visuals.length, 2);
    assert.ok((visuals[1]?.diameter ?? 0) > (visuals[0]?.diameter ?? 0));
    assert.ok((visuals[1]?.intensity ?? 0) > (visuals[0]?.intensity ?? 0));
    assert.deepEqual(
      { xPercent: visuals[0]?.xPercent, yPercent: visuals[0]?.yPercent },
      { xPercent: 50, yPercent: 50 },
    );
  });
});
