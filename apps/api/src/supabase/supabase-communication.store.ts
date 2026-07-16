import { Inject, Injectable } from '@nestjs/common';
import {
  complaintMessagePageSchema,
  complaintMessageSchema,
  messageReadReceiptSchema,
  notificationPageSchema,
  notificationReadReceiptSchema,
} from '@local-wellness/validation';
import { z } from 'zod';

import {
  CommunicationAccessDeniedError,
  CommunicationConflictError,
  CommunicationDataAccessError,
  CommunicationNotFoundError,
  CommunicationStore,
} from '../data/communication.store.js';
import { SupabaseClients } from './supabase-clients.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const createMessageResultSchema = z
  .object({ response_payload: complaintMessageSchema, replayed: z.boolean() })
  .strict();
const responsePayloadRowSchema = z.object({ response_payload: z.unknown() }).strict();

const errorMessage = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return '';
  }
  return typeof error.message === 'string' ? error.message : '';
};

const throwMappedError = (error: unknown, operation: string): never => {
  const message = errorMessage(error);
  if (message.includes('COMMUNICATION_ACCESS_DENIED')) {
    throw new CommunicationAccessDeniedError();
  }
  if (message.includes('COMPLAINT_NOT_FOUND')) {
    throw new CommunicationNotFoundError('complaint');
  }
  if (message.includes('MESSAGE_NOT_FOUND')) {
    throw new CommunicationNotFoundError('message');
  }
  if (message.includes('NOTIFICATION_NOT_FOUND')) {
    throw new CommunicationNotFoundError('notification');
  }
  for (const marker of [
    'MESSAGE_IDEMPOTENCY_CONFLICT',
    'MESSAGE_READ_POSITION_INVALID',
    'PUBLIC_COMMENTS_DISABLED',
  ]) {
    if (message.includes(marker)) {
      throw new CommunicationConflictError(marker);
    }
  }
  throw new CommunicationDataAccessError(operation);
};

const firstRow = (data: unknown): unknown => (Array.isArray(data) ? data[0] : data);

@Injectable()
export class SupabaseCommunicationStore extends CommunicationStore {
  private readonly rpc: ServiceRoleRpc;

  public constructor(@Inject(SupabaseClients) clients: SupabaseClients) {
    super();
    this.rpc = clients.serviceRoleClient.rpc.bind(
      clients.serviceRoleClient,
    ) as unknown as ServiceRoleRpc;
  }

  public async createMessage(
    actorUserId: string,
    complaintId: string,
    input: { body: string; clientMessageId: string },
  ) {
    const result = await this.rpc('create_complaint_message', {
      p_actor_user_id: actorUserId,
      p_body: input.body,
      p_client_message_id: input.clientMessageId,
      p_complaint_id: complaintId,
    });
    if (result.error) {
      throwMappedError(result.error, 'create message');
    }
    const row = createMessageResultSchema.safeParse(firstRow(result.data));
    if (!row.success) {
      throw new CommunicationDataAccessError('decode created message');
    }
    return row.data.response_payload;
  }

  public async listMessages(
    actorUserId: string,
    complaintId: string,
    query: {
      beforeCreatedAt?: string | undefined;
      beforeId?: string | undefined;
      limit: number;
    },
  ) {
    const result = await this.rpc('list_complaint_messages', {
      p_actor_user_id: actorUserId,
      p_before_created_at: query.beforeCreatedAt ?? null,
      p_before_id: query.beforeId ?? null,
      p_complaint_id: complaintId,
      p_limit: query.limit,
    });
    if (result.error) {
      throwMappedError(result.error, 'list messages');
    }
    const row = responsePayloadRowSchema.safeParse(firstRow(result.data));
    const decoded = row.success
      ? complaintMessagePageSchema.safeParse(row.data.response_payload)
      : row;
    if (!decoded.success) {
      throw new CommunicationDataAccessError('decode message page');
    }
    return decoded.data;
  }

  public async markMessagesRead(
    actorUserId: string,
    complaintId: string,
    input: { readThroughCreatedAt: string; readThroughMessageId: string },
  ) {
    const result = await this.rpc('mark_complaint_message_read', {
      p_actor_user_id: actorUserId,
      p_complaint_id: complaintId,
      p_read_through_created_at: input.readThroughCreatedAt,
      p_read_through_message_id: input.readThroughMessageId,
    });
    if (result.error) {
      throwMappedError(result.error, 'mark messages read');
    }
    const decoded = messageReadReceiptSchema.safeParse(firstRow(result.data));
    if (!decoded.success) {
      throw new CommunicationDataAccessError('decode message receipt');
    }
    return decoded.data;
  }

  public async listNotifications(
    actorUserId: string,
    query: {
      beforeCreatedAt?: string | undefined;
      beforeId?: string | undefined;
      limit: number;
    },
  ) {
    const result = await this.rpc('list_notifications', {
      p_actor_user_id: actorUserId,
      p_before_created_at: query.beforeCreatedAt ?? null,
      p_before_id: query.beforeId ?? null,
      p_limit: query.limit,
    });
    if (result.error) {
      throwMappedError(result.error, 'list notifications');
    }
    const row = responsePayloadRowSchema.safeParse(firstRow(result.data));
    const decoded = row.success ? notificationPageSchema.safeParse(row.data.response_payload) : row;
    if (!decoded.success) {
      throw new CommunicationDataAccessError('decode notification page');
    }
    return decoded.data;
  }

  public async markNotificationRead(actorUserId: string, notificationId: string) {
    const result = await this.rpc('mark_notification_read', {
      p_actor_user_id: actorUserId,
      p_notification_id: notificationId,
    });
    if (result.error) {
      throwMappedError(result.error, 'mark notification read');
    }
    const decoded = notificationReadReceiptSchema.safeParse(firstRow(result.data));
    if (!decoded.success) {
      throw new CommunicationDataAccessError('decode notification receipt');
    }
    return decoded.data;
  }
}
