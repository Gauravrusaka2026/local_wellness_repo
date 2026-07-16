import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  publicComplaintDetailSchema,
  publicComplaintMapQuerySchema,
  publicWardBoundarySchema,
} from './transparency.schemas.js';

const categoryCode = 'pothole';
const publicIds = {
  canonical: '30000000-0000-4000-8000-000000000003',
  related: '30000000-0000-4000-8000-000000000004',
  secondRelated: '30000000-0000-4000-8000-000000000005',
} as const;

describe('public transparency validation', () => {
  it('coerces a bounded viewport and accepts repeated or comma-separated filters', () => {
    assert.deepEqual(
      publicComplaintMapQuerySchema.parse({
        west: '73.7',
        south: '18.4',
        east: '73.9',
        north: '18.7',
        categoryCodes: `${categoryCode},blocked_drain`,
        statuses: ['reported', 'in_progress'],
      }),
      {
        west: 73.7,
        south: 18.4,
        east: 73.9,
        north: 18.7,
        categoryCodes: [categoryCode, 'blocked_drain'],
        statuses: ['reported', 'in_progress'],
        zoom: 12,
        limit: 100,
      },
    );
  });

  it('rejects reversed, oversized, unknown, duplicate, and excessive-date filters', () => {
    const base = { west: 73, south: 18, east: 74, north: 19 };

    assert.throws(() => publicComplaintMapQuerySchema.parse({ ...base, east: 72 }));
    assert.throws(() => publicComplaintMapQuerySchema.parse({ ...base, east: 76 }));
    assert.throws(() => publicComplaintMapQuerySchema.parse({ ...base, unknown: 'value' }));
    assert.throws(() =>
      publicComplaintMapQuerySchema.parse({
        ...base,
        categoryCodes: `${categoryCode},${categoryCode}`,
      }),
    );
    assert.throws(() =>
      publicComplaintMapQuerySchema.parse({
        ...base,
        from: '2024-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      }),
    );
  });

  it('rejects private or exact fields in a public complaint projection', () => {
    const projection = {
      publicId: publicIds.canonical,
      title: 'Reviewed public title',
      category: { code: categoryCode, name: 'Pothole' },
      status: 'reported',
      location: { latitude: 18.5, longitude: 73.8, precisionMeters: 500 },
      localBody: {
        code: '251528',
        name: 'Test Municipal Corporation',
      },
      ward: null,
      submittedAt: '2026-07-16T08:00:00.000Z',
      updatedAt: '2026-07-16T08:01:00.000Z',
      publishedAt: '2026-07-16T08:02:00.000Z',
      summary: 'A reviewed public summary.',
      duplicateGroup: null,
    };

    assert.equal(publicComplaintDetailSchema.parse(projection).summary, projection.summary);
    assert.throws(() =>
      publicComplaintDetailSchema.parse({ ...projection, citizenUserId: 'private-user' }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        category: {
          id: '10000000-0000-4000-8000-000000000001',
          name: projection.category.name,
        },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        location: { ...projection.location, exact: true },
      }),
    );
  });

  it('accepts only a bounded, sorted, public-only duplicate-group detail', () => {
    const projection = {
      publicId: publicIds.related,
      title: 'Reviewed public title',
      category: { code: categoryCode, name: 'Pothole' },
      status: 'reported',
      location: { latitude: 18.5, longitude: 73.8, precisionMeters: 500 },
      localBody: { code: '251528', name: 'Test Municipal Corporation' },
      ward: null,
      submittedAt: '2026-07-16T08:00:00.000Z',
      updatedAt: '2026-07-16T08:01:00.000Z',
      publishedAt: '2026-07-16T08:02:00.000Z',
      summary: 'A reviewed public summary.',
      duplicateGroup: {
        canonicalPublicId: publicIds.canonical,
        relatedPublicIds: [publicIds.canonical, publicIds.secondRelated],
        totalCount: 3,
      },
    };

    assert.deepEqual(
      publicComplaintDetailSchema.parse(projection).duplicateGroup,
      projection.duplicateGroup,
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: { ...projection.duplicateGroup, groupId: publicIds.canonical },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: {
          ...projection.duplicateGroup,
          relatedPublicIds: [publicIds.secondRelated, publicIds.canonical],
        },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: {
          ...projection.duplicateGroup,
          relatedPublicIds: [publicIds.canonical, publicIds.canonical],
        },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: { ...projection.duplicateGroup, totalCount: 2 },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: {
          canonicalPublicId: publicIds.canonical,
          relatedPublicIds: [],
          totalCount: 1,
        },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: {
          ...projection.duplicateGroup,
          relatedPublicIds: [publicIds.related, publicIds.secondRelated],
        },
      }),
    );
    assert.throws(() =>
      publicComplaintDetailSchema.parse({
        ...projection,
        duplicateGroup: {
          canonicalPublicId: publicIds.canonical,
          relatedPublicIds: Array.from(
            { length: 100 },
            (_, index) => `40000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
          ),
          totalCount: 101,
        },
      }),
    );
  });

  it('accepts only bounded MultiPolygon ward geometry', () => {
    const ward = {
      code: 'PMC-WARD-1',
      name: 'Ward 1',
      wardNumber: '1',
      localBodyCode: '251528',
      localBodyName: 'Test Municipal Corporation',
      boundaryVersion: 1,
      boundary: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [73.8, 18.5],
              [73.9, 18.5],
              [73.9, 18.6],
              [73.8, 18.5],
            ],
          ],
        ],
      },
      complaintCount: 4,
    };

    assert.equal(publicWardBoundarySchema.parse(ward).boundary.type, 'MultiPolygon');
    assert.throws(() =>
      publicWardBoundarySchema.parse({
        ...ward,
        boundary: { type: 'Point', coordinates: [73.8, 18.5] },
      }),
    );
  });
});
