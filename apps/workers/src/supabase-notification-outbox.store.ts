import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  NotificationOutboxDataError,
  type NotificationOutboxStore,
} from './notification-outbox.store.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const claimedEventSchema = z
  .object({
    lease_token: z.uuid(),
    outbox_id: z.uuid(),
  })
  .strict();

const materializedEventSchema = z
  .object({
    notification_count: z.number().int().nonnegative(),
    replayed: z.boolean(),
  })
  .strict();

const failedEventSchema = z
  .object({
    next_attempt_at: z.iso.datetime({ offset: true }).nullable(),
    status: z.enum(['dead', 'retry_scheduled']),
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NotificationOutboxDataError(`${operation} response`);
  }
  return result.data;
};

export class SupabaseNotificationOutboxStore implements NotificationOutboxStore {
  private readonly rpc: ServiceRoleRpc;

  public constructor(client: SupabaseClient<Database>) {
    this.rpc = client.rpc.bind(client) as unknown as ServiceRoleRpc;
  }

  public async claim(input: { batchSize: number; leaseSeconds: number; workerId: string }) {
    const result = await this.rpc('claim_notification_outbox', {
      p_lease_seconds: input.leaseSeconds,
      p_limit: input.batchSize,
      p_worker_id: input.workerId,
    });
    if (result.error) {
      throw new NotificationOutboxDataError('claim');
    }

    const rows = decode(z.array(claimedEventSchema), result.data ?? [], 'claim');
    return rows.map((row) => ({ leaseToken: row.lease_token, outboxId: row.outbox_id }));
  }

  public async fail(input: { errorCode: string; leaseToken: string; outboxId: string }) {
    const result = await this.rpc('fail_notification_outbox', {
      p_error_code: input.errorCode,
      p_lease_token: input.leaseToken,
      p_outbox_id: input.outboxId,
    });
    if (result.error) {
      throw new NotificationOutboxDataError('failure recording');
    }

    const row = decode(
      failedEventSchema,
      Array.isArray(result.data) ? result.data[0] : result.data,
      'failure recording',
    );
    return { nextAttemptAt: row.next_attempt_at, status: row.status };
  }

  public async materialize(input: { leaseToken: string; outboxId: string }) {
    const result = await this.rpc('materialize_notification_outbox', {
      p_lease_token: input.leaseToken,
      p_outbox_id: input.outboxId,
    });
    if (result.error) {
      throw new NotificationOutboxDataError('materialization');
    }

    const row = decode(
      materializedEventSchema,
      Array.isArray(result.data) ? result.data[0] : result.data,
      'materialization',
    );
    return { notificationCount: row.notification_count, replayed: row.replayed };
  }
}
