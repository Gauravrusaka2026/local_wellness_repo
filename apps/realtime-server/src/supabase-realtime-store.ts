import type { Database } from '@local-wellness/database';
import { complaintMessageSchema, inAppNotificationSchema } from '@local-wellness/validation';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import {
  realtimeDeliveryEventNames,
  RealtimeStore,
  type ClaimedRealtimeDelivery,
  type PersistedComplaintMessage,
  type PersistedMessageReceipt,
  type RealtimeRoomAuthorization,
  type RealtimeRoomTarget,
} from './realtime-store.js';

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

const uuidSchema = z.uuid();
const timestampSchema = z.iso.datetime({ offset: true });

const accountRowSchema = z
  .object({
    is_active: z.boolean(),
    user_id: uuidSchema,
  })
  .strict();

const authorizationRowSchema = z
  .object({
    actor_type: z.enum(['citizen', 'government']).nullable().optional(),
    authorized: z.boolean(),
  })
  .strict();

const messageRowSchema = z
  .object({
    replayed: z.boolean(),
    response_payload: z.unknown(),
  })
  .strict();

const messagePayloadSchema = z
  .object({
    authoredByMe: z.literal(true),
    authorType: z.enum(['citizen', 'government']),
    body: z.string().min(1).max(4_000),
    complaintId: uuidSchema,
    createdAt: timestampSchema,
    id: uuidSchema,
    kind: z.literal('private_message'),
  })
  .strict();

const receiptRowSchema = z
  .object({
    complaintId: uuidSchema,
    updatedAt: timestampSchema,
    readThroughCreatedAt: timestampSchema,
    readThroughMessageId: uuidSchema,
  })
  .strict();

const deliveryRowSchema = z
  .object({
    attempt_count: z.number().int().positive(),
    claim_token: uuidSchema,
    complaint_id: uuidSchema.nullable(),
    delivery_id: uuidSchema,
    event_id: uuidSchema,
    event_name: z.enum(realtimeDeliveryEventNames),
    payload: z.record(z.string(), z.unknown()),
    recipient_user_id: uuidSchema,
  })
  .strict();

const messageDeliveryPayloadSchema = z.object({ message: complaintMessageSchema }).strict();
const notificationDeliveryPayloadSchema = z
  .object({ notification: inAppNotificationSchema })
  .strict();

type RpcResult = PromiseLike<{
  data: unknown;
  error: Readonly<{ message: string }> | null;
}>;
type ServiceRoleRpc = (name: string, arguments_: Record<string, unknown>) => RpcResult;

export class RealtimeDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Realtime persistence operation failed: ${operation}.`);
    this.name = 'RealtimeDataAccessError';
  }
}

const firstRow = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const result = z.array(schema).min(1).max(1).safeParse(value);
  if (!result.success || !result.data[0]) throw new RealtimeDataAccessError(operation);
  return result.data[0];
};

export class SupabaseRealtimeStore extends RealtimeStore {
  private readonly client: SupabaseClient<Database>;

  public constructor(supabaseUrl: string, supabaseServiceRoleKey: string) {
    super();
    this.client = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: serverAuthOptions,
    });
  }

  public async isActiveAccount(userId: string): Promise<boolean> {
    const row = firstRow(
      accountRowSchema,
      await this.call('get active realtime account', 'get_realtime_account', {
        p_actor_user_id: userId,
      }),
      'get active realtime account',
    );
    return row.user_id === userId && row.is_active;
  }

  public async authorizeRoom(
    userId: string,
    target: RealtimeRoomTarget,
  ): Promise<RealtimeRoomAuthorization> {
    const row = firstRow(
      authorizationRowSchema,
      await this.call('authorize realtime room', 'authorize_realtime_room', {
        p_actor_user_id: userId,
        p_resource_id: target.resourceId,
        p_room_type: target.kind,
      }),
      'authorize realtime room',
    );
    return {
      authorType: row.actor_type ?? null,
      authorized: row.authorized,
    };
  }

  public async createComplaintMessage(input: {
    body: string;
    clientMessageId: string;
    complaintId: string;
    requestId: string;
    userId: string;
  }): Promise<PersistedComplaintMessage> {
    const row = firstRow(
      messageRowSchema,
      await this.call('create complaint message', 'create_complaint_message', {
        p_actor_user_id: input.userId,
        p_body: input.body,
        p_client_message_id: input.clientMessageId,
        p_complaint_id: input.complaintId,
        p_request_id: input.requestId,
      }),
      'create complaint message',
    );
    const payload = messagePayloadSchema.safeParse(row.response_payload);
    if (!payload.success) throw new RealtimeDataAccessError('decode complaint message');
    return {
      eventId: payload.data.id,
      message: payload.data,
      senderUserId: input.userId,
    };
  }

  public async markComplaintMessageRead(input: {
    complaintId: string;
    readThroughCreatedAt: string;
    readThroughMessageId: string;
    requestId: string;
    userId: string;
  }): Promise<PersistedMessageReceipt> {
    const value = await this.call('mark complaint message read', 'mark_complaint_message_read', {
      p_actor_user_id: input.userId,
      p_complaint_id: input.complaintId,
      p_read_through_created_at: input.readThroughCreatedAt,
      p_read_through_message_id: input.readThroughMessageId,
      p_request_id: input.requestId,
    });
    const parsed = receiptRowSchema.safeParse(value);
    if (!parsed.success) throw new RealtimeDataAccessError('decode message read receipt');
    const row = parsed.data;
    return {
      eventId: row.readThroughMessageId,
      receipt: row,
    };
  }

  public async claimRealtimeDeliveries(input: {
    batchSize: number;
    instanceId: string;
    leaseSeconds: number;
  }): Promise<ClaimedRealtimeDelivery[]> {
    const value = await this.call('claim realtime deliveries', 'claim_realtime_deliveries', {
      p_batch_size: input.batchSize,
      p_instance_id: input.instanceId,
      p_lease_seconds: input.leaseSeconds,
    });
    const result = z.array(deliveryRowSchema).max(input.batchSize).safeParse(value);
    if (!result.success) throw new RealtimeDataAccessError('decode claimed realtime deliveries');
    return result.data.map((row) => {
      const common = {
        attemptCount: row.attempt_count,
        claimToken: row.claim_token,
        complaintId: row.complaint_id,
        deliveryId: row.delivery_id,
        recipientUserId: row.recipient_user_id,
      };
      if (row.event_name === 'message:created') {
        const payload = messageDeliveryPayloadSchema.safeParse(row.payload);
        if (!payload.success) {
          throw new RealtimeDataAccessError('decode realtime message delivery');
        }
        return {
          ...common,
          eventId: payload.data.message.id,
          eventName: row.event_name,
          occurredAt: payload.data.message.createdAt,
          payload: payload.data.message,
        };
      }

      const payload = notificationDeliveryPayloadSchema.safeParse(row.payload);
      if (!payload.success || payload.data.notification.eventId !== row.event_id) {
        throw new RealtimeDataAccessError('decode realtime notification delivery');
      }
      return {
        ...common,
        eventId: row.event_id,
        eventName: row.event_name,
        occurredAt: payload.data.notification.occurredAt,
        payload: payload.data.notification,
      };
    });
  }

  public async completeNotificationDelivery(input: {
    claimToken: string;
    deliveredSocketCount: number;
    deliveryId: string;
    instanceId: string;
  }): Promise<void> {
    await this.call('complete notification delivery', 'complete_notification_delivery', {
      p_claim_token: input.claimToken,
      p_delivered_socket_count: input.deliveredSocketCount,
      p_delivery_id: input.deliveryId,
      p_instance_id: input.instanceId,
    });
  }

  public async failNotificationDelivery(input: {
    claimToken: string;
    deliveryId: string;
    failureCode: 'DELIVERY_DEPENDENCY_UNAVAILABLE' | 'DELIVERY_EMIT_FAILED';
    instanceId: string;
  }): Promise<void> {
    await this.call('fail notification delivery', 'fail_notification_delivery', {
      p_claim_token: input.claimToken,
      p_delivery_id: input.deliveryId,
      p_failure_code: input.failureCode,
      p_instance_id: input.instanceId,
    });
  }

  private async call(
    operation: string,
    functionName: string,
    arguments_: Record<string, unknown>,
  ): Promise<unknown> {
    const rpc = this.client.rpc.bind(this.client) as unknown as ServiceRoleRpc;
    const { data, error } = await rpc(functionName, arguments_);
    if (error) throw new RealtimeDataAccessError(operation);
    return data;
  }
}
