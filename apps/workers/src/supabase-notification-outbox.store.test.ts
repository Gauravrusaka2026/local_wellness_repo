import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  NotificationOutboxDataError,
  type NotificationOutboxStore,
} from './notification-outbox.store.js';
import { SupabaseNotificationOutboxStore } from './supabase-notification-outbox.store.js';

const identifiers = {
  lease: '10000000-0000-4000-8000-000000000001',
  outbox: '10000000-0000-4000-8000-000000000002',
} as const;

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): NotificationOutboxStore =>
  new SupabaseNotificationOutboxStore({ rpc } as unknown as SupabaseClient<Database>);

describe('Supabase notification outbox store', () => {
  it('claims a bounded PostgreSQL lease batch with the configured worker identity', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return {
        data: [{ lease_token: identifiers.lease, outbox_id: identifiers.outbox }],
        error: null,
      };
    });

    const claimed = await store.claim({ batchSize: 10, leaseSeconds: 60, workerId: 'worker:test' });

    assert.deepEqual(claimed, [{ leaseToken: identifiers.lease, outboxId: identifiers.outbox }]);
    assert.deepEqual(calls, [
      {
        functionName: 'claim_notification_outbox',
        arguments_: { p_lease_seconds: 60, p_limit: 10, p_worker_id: 'worker:test' },
      },
    ]);
  });

  it('materializes and fails only with the opaque outbox lease identity', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      if (functionName === 'materialize_notification_outbox') {
        return { data: [{ notification_count: 2, replayed: false }], error: null };
      }
      return {
        data: [{ next_attempt_at: '2026-07-14T12:01:00.000Z', status: 'retry_scheduled' }],
        error: null,
      };
    });

    const materialized = await store.materialize({
      leaseToken: identifiers.lease,
      outboxId: identifiers.outbox,
    });
    const failed = await store.fail({
      errorCode: 'MATERIALIZATION_FAILED',
      leaseToken: identifiers.lease,
      outboxId: identifiers.outbox,
    });

    assert.deepEqual(materialized, { notificationCount: 2, replayed: false });
    assert.deepEqual(failed, {
      nextAttemptAt: '2026-07-14T12:01:00.000Z',
      status: 'retry_scheduled',
    });
    assert.deepEqual(calls, [
      {
        functionName: 'materialize_notification_outbox',
        arguments_: { p_lease_token: identifiers.lease, p_outbox_id: identifiers.outbox },
      },
      {
        functionName: 'fail_notification_outbox',
        arguments_: {
          p_error_code: 'MATERIALIZATION_FAILED',
          p_lease_token: identifiers.lease,
          p_outbox_id: identifiers.outbox,
        },
      },
    ]);
  });

  it('fails closed for database errors and malformed service responses', async () => {
    const unavailable = createStore(async () => ({
      data: null,
      error: { message: 'private database detail' },
    }));
    const malformed = createStore(async () => ({
      data: [{ lease_token: identifiers.lease, outbox_id: 'not-a-uuid' }],
      error: null,
    }));

    await assert.rejects(
      unavailable.claim({ batchSize: 1, leaseSeconds: 60, workerId: 'worker:test' }),
      NotificationOutboxDataError,
    );
    await assert.rejects(
      malformed.claim({ batchSize: 1, leaseSeconds: 60, workerId: 'worker:test' }),
      NotificationOutboxDataError,
    );
  });
});
