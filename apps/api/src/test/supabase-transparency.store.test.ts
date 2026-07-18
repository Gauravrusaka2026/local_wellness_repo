import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  PublicComplaintHotspotQuery,
  PublicComplaintMapQuery,
  PublicWardBoundaryQuery,
} from '@local-wellness/types';

import { TransparencyDataAccessError } from '../data/transparency.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseTransparencyStore } from '../supabase/supabase-transparency.store.js';

const identifiers = {
  categoryCode: 'pothole',
  localBodyCode: '251528',
  publicComplaint: '30000000-0000-4000-8000-000000000003',
  secondPublicComplaint: '30000000-0000-4000-8000-000000000004',
  wardCode: 'PMC-WARD-1',
} as const;

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseTransparencyStore =>
  new SupabaseTransparencyStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public Supabase client must not read transparency projections.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

const projection = {
  publicId: identifiers.publicComplaint,
  title: 'Reviewed public title',
  category: { code: identifiers.categoryCode, name: 'Pothole' },
  status: 'reported',
  location: { latitude: 18.52, longitude: 73.86, precisionMeters: 500 },
  localBody: { code: identifiers.localBodyCode, name: 'Test Municipal Corporation' },
  ward: { code: identifiers.wardCode, name: 'Ward 1', wardNumber: '1' },
  submittedAt: '2026-07-16T08:00:00.000Z',
  updatedAt: '2026-07-16T09:00:00.000Z',
  publishedAt: '2026-07-16T08:05:00.000Z',
  supportCount: 7,
} as const;

const duplicateGroup = {
  canonicalPublicId: identifiers.publicComplaint,
  relatedPublicIds: [identifiers.secondPublicComplaint],
  totalCount: 2,
} as const;

const complaintQuery: PublicComplaintMapQuery = {
  west: 73.7,
  south: 18.4,
  east: 73.9,
  north: 18.7,
  categoryCodes: [identifiers.categoryCode],
  statuses: ['reported'],
  from: '2026-07-01T00:00:00.000Z',
  to: '2026-07-16T23:59:59.000Z',
  zoom: 13,
  limit: 1,
};

const hotspotQuery: PublicComplaintHotspotQuery = {
  ...complaintQuery,
  limit: 25,
};

const wardQuery: PublicWardBoundaryQuery = {
  west: complaintQuery.west,
  south: complaintQuery.south,
  east: complaintQuery.east,
  north: complaintQuery.north,
  limit: 25,
};

describe('SupabaseTransparencyStore', () => {
  it('uses only the service-role projection RPC and overfetches for bounded pagination', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [
          { projection },
          {
            projection: {
              ...projection,
              publicId: identifiers.secondPublicComplaint,
            },
          },
        ],
        error: null,
      };
    });

    const result = await store.listComplaints(complaintQuery);

    assert.deepEqual(result, {
      items: [projection],
      nextCursor: identifiers.publicComplaint,
      hasMore: true,
    });
    assert.deepEqual(calls, [
      {
        functionName: 'list_public_complaint_feed',
        arguments_: {
          p_west: 73.7,
          p_south: 18.4,
          p_east: 73.9,
          p_north: 18.7,
          p_category_codes: [identifiers.categoryCode],
          p_statuses: ['reported'],
          p_date_from: complaintQuery.from,
          p_date_to: complaintQuery.to,
          p_zoom: 13,
          p_limit: 2,
          p_cursor: null,
          p_sort: 'recent',
        },
      },
    ]);
  });

  it('strictly decodes hotspot, ward, and detail wrapper rows', async () => {
    const hotspot = {
      id: 'hotspot:test:1',
      location: { latitude: 18.52, longitude: 73.86, precisionMeters: 1_000 },
      radiusMeters: 1_000,
      complaintCount: 4,
      categoryCount: 2,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-16T23:59:59.000Z',
    } as const;
    const wardBoundary = {
      code: identifiers.wardCode,
      name: 'Ward 1',
      wardNumber: '1',
      localBodyCode: identifiers.localBodyCode,
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
    } as const;
    const store = createStore(async (functionName) => {
      if (functionName === 'list_public_complaint_hotspots') {
        return { data: [{ hotspot }], error: null };
      }
      if (functionName === 'list_public_ward_boundaries') {
        return { data: [{ ward_boundary: wardBoundary }], error: null };
      }
      return {
        data: [
          {
            projection: {
              ...projection,
              summary: 'Reviewed public summary.',
              duplicateGroup,
            },
          },
        ],
        error: null,
      };
    });

    assert.deepEqual(await store.listHotspots(hotspotQuery), { items: [hotspot] });
    assert.deepEqual(await store.listWards(wardQuery), { items: [wardBoundary] });
    const detail = await store.getComplaint(identifiers.publicComplaint);
    assert.equal(detail?.summary, 'Reviewed public summary.');
    assert.deepEqual(detail?.duplicateGroup, duplicateGroup);
  });

  it('returns null for an absent approved projection', async () => {
    const store = createStore(async () => ({ data: [], error: null }));
    assert.equal(await store.getComplaint(identifiers.publicComplaint), null);
  });

  it('reads and updates only allowlisted account engagement state', async () => {
    const calls: RpcCall[] = [];
    const engagement = {
      publicId: identifiers.publicComplaint,
      starred: true,
      supportCount: 8,
      supported: true,
    } as const;
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ arguments_, functionName });
      return { data: [{ engagement }], error: null };
    });

    assert.deepEqual(
      await store.listEngagements('10000000-0000-4000-8000-000000000001', [
        identifiers.publicComplaint,
      ]),
      [engagement],
    );
    assert.deepEqual(
      await store.setEngagement(
        '10000000-0000-4000-8000-000000000001',
        identifiers.publicComplaint,
        { starred: true, supported: true },
      ),
      engagement,
    );
    assert.deepEqual(calls, [
      {
        arguments_: {
          p_actor_user_id: '10000000-0000-4000-8000-000000000001',
          p_public_ids: [identifiers.publicComplaint],
        },
        functionName: 'list_public_complaint_engagements',
      },
      {
        arguments_: {
          p_actor_user_id: '10000000-0000-4000-8000-000000000001',
          p_public_id: identifiers.publicComplaint,
          p_starred: true,
          p_supported: true,
        },
        functionName: 'set_public_complaint_engagement',
      },
    ]);
  });

  it('fails closed for database errors and malformed or private projection fields', async () => {
    const databaseFailure = createStore(async () => ({
      data: null,
      error: { message: 'private' },
    }));
    await assert.rejects(
      databaseFailure.listComplaints(complaintQuery),
      TransparencyDataAccessError,
    );

    const privateField = createStore(async () => ({
      data: [{ projection: { ...projection, citizenUserId: identifiers.publicComplaint } }],
      error: null,
    }));
    await assert.rejects(privateField.listComplaints(complaintQuery), TransparencyDataAccessError);

    const unexpectedWrapper = createStore(async () => ({
      data: [{ projection, exact_location: { latitude: 18.52, longitude: 73.86 } }],
      error: null,
    }));
    await assert.rejects(
      unexpectedWrapper.listComplaints(complaintQuery),
      TransparencyDataAccessError,
    );

    const privateDuplicateGroupField = createStore(async () => ({
      data: [
        {
          projection: {
            ...projection,
            summary: 'Reviewed public summary.',
            duplicateGroup: { ...duplicateGroup, groupId: identifiers.publicComplaint },
          },
        },
      ],
      error: null,
    }));
    await assert.rejects(
      privateDuplicateGroupField.getComplaint(identifiers.publicComplaint),
      TransparencyDataAccessError,
    );
  });

  it('rejects duplicate public identifiers across a returned page', async () => {
    const duplicateComplaints = createStore(async () => ({
      data: [{ projection }, { projection }],
      error: null,
    }));

    await assert.rejects(
      duplicateComplaints.listComplaints({ ...complaintQuery, limit: 2 }),
      TransparencyDataAccessError,
    );
  });
});
