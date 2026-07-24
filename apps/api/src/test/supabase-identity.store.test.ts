import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Tables } from '@local-wellness/database';

import {
  DeviceBlockedError,
  DeviceLimitReachedError,
  DeviceRevokedError,
  IdentityDataAccessError,
} from '../data/identity.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseIdentityStore } from '../supabase/supabase-identity.store.js';

const userId = '7cd50865-9ebd-4a79-abaa-f059a1632985';
const deviceId = '7a6af88b-d00e-44dc-b21d-af5b778d1441';
const deviceIdentifierHash = '8cb3134f9945efd5727c816ef1226edcbb949b8af948fd8babe6487a3dfb23ec';
const registeredAt = '2026-07-13T11:00:00.000Z';

const deviceRow: Tables<'devices'> = {
  app_version: '1.0.0',
  created_at: registeredAt,
  device_identifier_hash: deviceIdentifierHash,
  id: deviceId,
  is_active: true,
  last_seen_at: registeredAt,
  platform: 'android',
  push_token: 'push-token',
  revoked_at: null,
  risk_status: 'unknown',
  updated_at: registeredAt,
  user_id: userId,
};

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<
  Readonly<{ data: typeof deviceRow | null; error: Readonly<{ message: string }> | null }>
>;

const createStore = (rpc: RpcHandler): SupabaseIdentityStore =>
  new SupabaseIdentityStore({
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

describe('Supabase identity store device lifecycle', () => {
  it('registers through the atomic RPC and preserves omitted push-token semantics', async () => {
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ arguments_, functionName });
      return { data: deviceRow, error: null };
    });

    const device = await store.upsertDevice(userId, {
      deviceIdentifierHash,
      lastSeenAt: registeredAt,
      platform: 'android',
    });

    assert.equal(device.id, deviceId);
    assert.deepEqual(calls, [
      {
        functionName: 'register_device',
        arguments_: {
          p_device_identifier_hash: deviceIdentifierHash,
          p_last_seen_at: registeredAt,
          p_platform: 'android',
          p_push_token_supplied: false,
          p_user_id: userId,
        },
      },
    ]);
    assert.equal('p_request_id' in (calls[0]?.arguments_ ?? {}), false);
    assert.equal('p_ip_address' in (calls[0]?.arguments_ ?? {}), false);
    assert.equal('p_user_agent' in (calls[0]?.arguments_ ?? {}), false);
  });

  it('passes an explicit null push token so the atomic RPC can clear it', async () => {
    let capturedArguments: Record<string, unknown> | undefined;
    const store = createStore(async (_functionName, arguments_) => {
      capturedArguments = arguments_;
      return { data: { ...deviceRow, push_token: null }, error: null };
    });

    const device = await store.upsertDevice(userId, {
      deviceIdentifierHash,
      lastSeenAt: registeredAt,
      platform: 'android',
      pushToken: null,
    });

    assert.equal(device.pushNotificationsEnabled, false);
    assert.equal(capturedArguments?.['p_push_token_supplied'], true);
    assert.equal(capturedArguments?.['p_push_token'], null);
  });

  it('maps blocked, revoked, and account-limit registration markers to safe domain errors', async () => {
    const registration = {
      deviceIdentifierHash,
      lastSeenAt: registeredAt,
      platform: 'android' as const,
    };
    const blockedStore = createStore(async () => ({
      data: null,
      error: { message: 'DEVICE_BLOCKED' },
    }));
    const revokedStore = createStore(async () => ({
      data: null,
      error: { message: 'DEVICE_REVOKED' },
    }));
    const limitedStore = createStore(async () => ({
      data: null,
      error: { message: 'DEVICE_LIMIT_REACHED' },
    }));

    await assert.rejects(blockedStore.upsertDevice(userId, registration), DeviceBlockedError);
    await assert.rejects(revokedStore.upsertDevice(userId, registration), DeviceRevokedError);
    await assert.rejects(limitedStore.upsertDevice(userId, registration), DeviceLimitReachedError);
  });

  it('maps missing device revocation to null without leaking database details', async () => {
    const store = createStore(async () => ({
      data: null,
      error: { message: 'DEVICE_NOT_FOUND' },
    }));

    assert.equal(await store.revokeDevice(userId, deviceId, registeredAt), null);
  });

  it('returns the existing revoked row on repeated idempotent revocation', async () => {
    const revokedAt = '2026-07-13T12:00:00.000Z';
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ arguments_, functionName });
      return {
        data: { ...deviceRow, is_active: false, push_token: null, revoked_at: revokedAt },
        error: null,
      };
    });

    const firstResult = await store.revokeDevice(userId, deviceId, revokedAt);
    const secondResult = await store.revokeDevice(userId, deviceId, '2026-07-13T13:00:00.000Z');

    assert.equal(firstResult?.revokedAt, revokedAt);
    assert.equal(secondResult?.revokedAt, revokedAt);
    assert.equal(calls.length, 2);
    assert.equal(
      calls.every((call) => call.functionName === 'revoke_device'),
      true,
    );
    assert.equal('p_request_id' in (calls[0]?.arguments_ ?? {}), false);
  });

  it('maps unknown RPC failures to the safe persistence boundary error', async () => {
    const store = createStore(async () => ({
      data: null,
      error: { message: 'internal database detail' },
    }));

    await assert.rejects(
      store.revokeDevice(userId, deviceId, registeredAt),
      IdentityDataAccessError,
    );
  });
});

describe('Supabase identity store effective access', () => {
  it('loads roles and memberships through the canonical governance RPC boundary', async () => {
    const authorityId = '984805ee-52b9-5be0-bed2-3951cc6cab2d';
    const roleId = '00000000-0000-4000-8000-000000000002';
    const at = '2026-07-13T12:00:00.000Z';
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const serviceRoleClient = {
      from: (table: string) => {
        assert.equal(table, 'roles');
        return {
          select: () => ({
            in: async (_column: string, values: string[]) => {
              assert.deepEqual(values, [roleId]);
              return {
                data: [
                  {
                    code: 'government_operator',
                    description: null,
                    id: roleId,
                    is_government: true,
                    is_privileged: false,
                    name: 'Government operator',
                  },
                ],
                error: null,
              };
            },
          }),
        };
      },
      rpc: async (functionName: string, arguments_: Record<string, unknown>) => {
        calls.push({ arguments_, functionName });

        if (functionName === 'get_active_user_roles') {
          return {
            data: [
              {
                authority_id: authorityId,
                effective_from: at,
                effective_until: null,
                id: '53a36014-c619-4034-a8d1-d6ec21e66dd9',
                role_id: roleId,
                scope_id: authorityId,
                scope_type: 'authority',
              },
            ],
            error: null,
          };
        }

        assert.equal(functionName, 'get_active_authority_memberships');
        return {
          data: [
            {
              authority_id: authorityId,
              effective_from: at,
              effective_until: null,
              id: '992572fd-1a4f-4e56-b6b6-72bfca9c3930',
              invitation_email: 'operator@example.test',
              status: 'active',
            },
          ],
          error: null,
        };
      },
    };
    const store = new SupabaseIdentityStore({ serviceRoleClient } as unknown as SupabaseClients);

    const access = await store.findActiveAccess(userId, at);

    assert.deepEqual(calls.map((call) => call.functionName).sort(), [
      'get_active_authority_memberships',
      'get_active_user_roles',
    ]);
    assert.equal(
      calls.every(
        (call) => call.arguments_['p_at'] === at && call.arguments_['p_user_id'] === userId,
      ),
      true,
    );
    assert.equal(access.roles[0]?.code, 'government_operator');
    assert.equal(access.authorities[0]?.authorityId, authorityId);
  });
});

describe('Supabase identity store government invitation options', () => {
  const authorityId = '984805ee-52b9-5be0-bed2-3951cc6cab2d';
  const departmentId = '7a6af88b-d00e-44dc-b21d-af5b778d1441';
  const wardId = 'a93fe312-6f26-4d4b-a9da-e1cd0ad68dc6';
  const validOptions = {
    authorities: [
      {
        authorityType: 'municipal_corporation',
        code: 'BMC',
        id: authorityId,
        name: 'Brihanmumbai Municipal Corporation',
      },
    ],
    departments: [
      {
        authorityId,
        code: 'HEALTH',
        id: departmentId,
        name: 'Public Health Department',
        type: 'department',
      },
    ],
    wards: [
      {
        authorityId,
        code: 'A',
        id: wardId,
        name: 'Ward A',
        type: 'ward',
      },
    ],
  } as const;

  it('uses only the bound service-role RPC and forwards an authority filter exactly', async () => {
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const serviceRoleClient = {
      rpc(this: unknown, functionName: string, arguments_: Record<string, unknown>) {
        assert.equal(this, serviceRoleClient);
        calls.push({ arguments_, functionName });
        return Promise.resolve({ data: validOptions, error: null });
      },
    };
    const store = new SupabaseIdentityStore({ serviceRoleClient } as unknown as SupabaseClients);

    const options = await store.listGovernmentInvitationOptions([authorityId]);

    assert.deepEqual(options, validOptions);
    assert.deepEqual(calls, [
      {
        arguments_: { p_authority_ids: [authorityId] },
        functionName: 'list_government_invitation_options',
      },
    ]);
  });

  it('omits the optional authority argument for platform-wide options', async () => {
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const store = new SupabaseIdentityStore({
      serviceRoleClient: {
        rpc: (functionName: string, arguments_: Record<string, unknown>) => {
          calls.push({ arguments_, functionName });
          return Promise.resolve({ data: validOptions, error: null });
        },
      },
    } as unknown as SupabaseClients);

    await store.listGovernmentInvitationOptions(null);

    assert.deepEqual(calls, [
      { arguments_: {}, functionName: 'list_government_invitation_options' },
    ]);
  });

  it('returns an empty contract without querying when no authority can be managed', async () => {
    let rpcCalled = false;
    const store = new SupabaseIdentityStore({
      serviceRoleClient: {
        rpc: () => {
          rpcCalled = true;
          return Promise.resolve({ data: validOptions, error: null });
        },
      },
    } as unknown as SupabaseClients);

    assert.deepEqual(await store.listGovernmentInvitationOptions([]), {
      authorities: [],
      departments: [],
      wards: [],
    });
    assert.equal(rpcCalled, false);
  });

  it('fails closed for malformed, duplicate, orphaned, or filter-broadening RPC output', async () => {
    const otherAuthorityId = '1579439f-6e87-46d4-8411-e6559f4ddf51';
    const invalidPayloads: unknown[] = [
      { ...validOptions, extra: true },
      {
        ...validOptions,
        departments: [{ ...validOptions.departments[0], type: 'ward' }],
      },
      {
        ...validOptions,
        wards: [{ ...validOptions.wards[0], id: departmentId }],
      },
      {
        ...validOptions,
        wards: [{ ...validOptions.wards[0], authorityId: otherAuthorityId }],
      },
      {
        ...validOptions,
        authorities: [{ ...validOptions.authorities[0], id: otherAuthorityId }],
        departments: [],
        wards: [],
      },
    ];

    for (const payload of invalidPayloads) {
      const store = new SupabaseIdentityStore({
        serviceRoleClient: {
          rpc: () => Promise.resolve({ data: payload, error: null }),
        },
      } as unknown as SupabaseClients);

      await assert.rejects(
        store.listGovernmentInvitationOptions([authorityId]),
        IdentityDataAccessError,
      );
    }
  });

  it('normalizes RPC failures to the identity data-access boundary', async () => {
    const store = new SupabaseIdentityStore({
      serviceRoleClient: {
        rpc: () => Promise.resolve({ data: validOptions, error: { message: 'private detail' } }),
      },
    } as unknown as SupabaseClients);

    await assert.rejects(store.listGovernmentInvitationOptions(null), IdentityDataAccessError);
  });
});

describe('Supabase identity store phone-verification state', () => {
  it('queries verified phone state through the service-only RPC', async () => {
    const calls: Array<Readonly<{ arguments_: Record<string, unknown>; functionName: string }>> =
      [];
    const store = new SupabaseIdentityStore({
      serviceRoleClient: {
        rpc: async (functionName: string, arguments_: Record<string, unknown>) => {
          calls.push({ arguments_, functionName });
          return { data: true, error: null };
        },
      },
    } as unknown as SupabaseClients);

    assert.equal(await store.userHasVerifiedPhone(userId), true);
    assert.deepEqual(calls, [
      {
        arguments_: { p_user_id: userId },
        functionName: 'user_has_verified_phone',
      },
    ]);
  });

  it('fails closed when verified phone state cannot be loaded', async () => {
    const store = new SupabaseIdentityStore({
      serviceRoleClient: {
        rpc: async () => ({ data: null, error: { message: 'internal detail' } }),
      },
    } as unknown as SupabaseClients);

    await assert.rejects(store.userHasVerifiedPhone(userId), IdentityDataAccessError);
  });
});
