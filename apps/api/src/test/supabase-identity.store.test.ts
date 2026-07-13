import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Tables } from '@local-wellness/database';

import {
  DeviceBlockedError,
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

  it('maps blocked and revoked registration markers to safe domain errors', async () => {
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

    await assert.rejects(blockedStore.upsertDevice(userId, registration), DeviceBlockedError);
    await assert.rejects(revokedStore.upsertDevice(userId, registration), DeviceRevokedError);
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
