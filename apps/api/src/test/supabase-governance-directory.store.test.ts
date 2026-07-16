import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GovernanceDirectoryDataAccessError } from '../data/governance-directory.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseGovernanceDirectoryStore } from '../supabase/supabase-governance-directory.store.js';

const ids = {
  state: '10000000-0000-4000-8000-000000000001',
  localBody: '20000000-0000-4000-8000-000000000002',
  ward: '30000000-0000-4000-8000-000000000003',
} as const;

const match = {
  state: {
    kind: 'state',
    name: 'Verified State',
    type: 'state',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-16',
    sourceUrl: 'https://state.gov.test',
  },
  district: null,
  taluka: null,
  authority: {
    kind: 'authority',
    name: 'Verified Authority',
    type: 'local_body',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-16',
    sourceUrl: 'https://municipality.gov.test/about',
  },
  localBody: {
    kind: 'local_body',
    name: 'Verified Municipal Corporation',
    type: 'municipal_corporation',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-16',
    sourceUrl: 'https://municipality.gov.test',
  },
  ward: {
    kind: 'ward',
    name: 'Ward One',
    type: 'ward',
    verificationStatus: 'verified',
    lastVerifiedOn: '2026-07-16',
    sourceUrl: 'https://municipality.gov.test/wards',
  },
} as const;

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseGovernanceDirectoryStore =>
  new SupabaseGovernanceDirectoryStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public Supabase client must not read governance projections.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

const query = {
  location: { latitude: 18.52, longitude: 73.86 },
  accuracyMeters: 20,
  resolvedAt: '2026-07-16T10:00:00.000Z',
};

const wrapper = {
  state_id: ids.state,
  district_id: null,
  taluka_id: null,
  local_body_id: ids.localBody,
  ward_id: ids.ward,
  match,
};

describe('SupabaseGovernanceDirectoryStore', () => {
  it('uses only the service-role projection RPC and strips internal identifiers', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [wrapper], error: null };
    });

    assert.deepEqual(await store.resolveVerifiedGoverningBodies(query), [match]);
    assert.deepEqual(calls, [
      {
        functionName: 'resolve_verified_governing_bodies',
        arguments_: {
          p_longitude: 73.86,
          p_latitude: 18.52,
          p_accuracy_meters: 20,
          p_resolved_at: '2026-07-16T10:00:00.000Z',
        },
      },
    ]);
  });

  it('fails closed for database errors, private fields, and unverified records', async () => {
    const databaseFailure = createStore(async () => ({
      data: null,
      error: { message: 'private database details' },
    }));
    await assert.rejects(
      databaseFailure.resolveVerifiedGoverningBodies(query),
      GovernanceDirectoryDataAccessError,
    );

    const privateField = createStore(async () => ({
      data: [{ ...wrapper, match: { ...match, phone: '+910000000000' } }],
      error: null,
    }));
    await assert.rejects(
      privateField.resolveVerifiedGoverningBodies(query),
      GovernanceDirectoryDataAccessError,
    );

    const unverified = createStore(async () => ({
      data: [
        {
          ...wrapper,
          match: {
            ...match,
            localBody: { ...match.localBody, verificationStatus: 'unverified' },
          },
        },
      ],
      error: null,
    }));
    await assert.rejects(
      unverified.resolveVerifiedGoverningBodies(query),
      GovernanceDirectoryDataAccessError,
    );
  });

  it('rejects duplicate internal jurisdiction matches', async () => {
    const store = createStore(async () => ({ data: [wrapper, wrapper], error: null }));
    await assert.rejects(
      store.resolveVerifiedGoverningBodies(query),
      GovernanceDirectoryDataAccessError,
    );
  });
});
