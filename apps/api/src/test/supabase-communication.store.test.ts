import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CommunicationAccessDeniedError,
  CommunicationConflictError,
  CommunicationDataAccessError,
  CommunicationNotFoundError,
} from '../data/communication.store.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseCommunicationStore } from '../supabase/supabase-communication.store.js';

const identifiers = {
  actor: '10000000-0000-4000-8000-000000000001',
  clientMessage: '10000000-0000-4000-8000-000000000002',
  complaint: '10000000-0000-4000-8000-000000000003',
  event: '10000000-0000-4000-8000-000000000004',
  message: '10000000-0000-4000-8000-000000000005',
  notification: '10000000-0000-4000-8000-000000000006',
} as const;

const occurredAt = '2026-07-14T12:00:00.000Z';
const message = {
  id: identifiers.message,
  complaintId: identifiers.complaint,
  kind: 'private_message',
  authorType: 'citizen',
  authoredByMe: true,
  body: 'Please share an update.',
  createdAt: occurredAt,
} as const;

interface RpcCall {
  functionName: string;
  arguments_: Record<string, unknown>;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SupabaseCommunicationStore =>
  new SupabaseCommunicationStore({
    publicClient: {
      rpc: () => {
        throw new Error('The public client must not be used for private communications.');
      },
    },
    serviceRoleClient: { rpc },
  } as unknown as SupabaseClients);

describe('Supabase communication store', () => {
  it('creates a private message through the service-only RPC and decodes its safe payload', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      return { data: [{ response_payload: message, replayed: false }], error: null };
    });

    const result = await store.createMessage(identifiers.actor, identifiers.complaint, {
      body: message.body,
      clientMessageId: identifiers.clientMessage,
    });

    assert.deepEqual(result, message);
    assert.deepEqual(calls, [
      {
        functionName: 'create_complaint_message',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_body: message.body,
          p_client_message_id: identifiers.clientMessage,
          p_complaint_id: identifiers.complaint,
        },
      },
    ]);
  });

  it('passes paired keyset cursors to message and notification listing RPCs', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ functionName, arguments_ });
      const response_payload =
        functionName === 'list_complaint_messages'
          ? { items: [message], nextCursor: null }
          : {
              items: [
                {
                  id: identifiers.notification,
                  eventId: identifiers.event,
                  eventType: 'message',
                  payload: {
                    complaintId: identifiers.complaint,
                    messageId: identifiers.message,
                  },
                  occurredAt,
                  createdAt: occurredAt,
                  readAt: null,
                },
              ],
              nextCursor: null,
            };
      return { data: [{ response_payload }], error: null };
    });

    const cursor = { beforeCreatedAt: occurredAt, beforeId: identifiers.event, limit: 10 };
    const messages = await store.listMessages(identifiers.actor, identifiers.complaint, cursor);
    const notifications = await store.listNotifications(identifiers.actor, cursor);

    assert.equal(messages.items[0]?.id, identifiers.message);
    assert.equal(notifications.items[0]?.id, identifiers.notification);
    assert.deepEqual(calls, [
      {
        functionName: 'list_complaint_messages',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_before_created_at: occurredAt,
          p_before_id: identifiers.event,
          p_complaint_id: identifiers.complaint,
          p_limit: 10,
        },
      },
      {
        functionName: 'list_notifications',
        arguments_: {
          p_actor_user_id: identifiers.actor,
          p_before_created_at: occurredAt,
          p_before_id: identifiers.event,
          p_limit: 10,
        },
      },
    ]);
  });

  it('decodes idempotent message and notification read receipts', async () => {
    const store = createStore(async (functionName) => ({
      data:
        functionName === 'mark_complaint_message_read'
          ? {
              complaintId: identifiers.complaint,
              readThroughCreatedAt: occurredAt,
              readThroughMessageId: identifiers.message,
              updatedAt: occurredAt,
            }
          : { notificationId: identifiers.notification, readAt: occurredAt },
      error: null,
    }));

    const messageReceipt = await store.markMessagesRead(identifiers.actor, identifiers.complaint, {
      readThroughCreatedAt: occurredAt,
      readThroughMessageId: identifiers.message,
    });
    const notificationReceipt = await store.markNotificationRead(
      identifiers.actor,
      identifiers.notification,
    );

    assert.equal(messageReceipt.readThroughMessageId, identifiers.message);
    assert.equal(notificationReceipt.notificationId, identifiers.notification);
  });

  it('maps stable database markers without exposing raw database errors', async () => {
    const denied = createStore(async () => ({
      data: null,
      error: { message: 'COMMUNICATION_ACCESS_DENIED: hidden context' },
    }));
    const missing = createStore(async () => ({
      data: null,
      error: { message: 'NOTIFICATION_NOT_FOUND: hidden context' },
    }));
    const conflict = createStore(async () => ({
      data: null,
      error: { message: 'MESSAGE_IDEMPOTENCY_CONFLICT: hidden context' },
    }));

    await assert.rejects(
      denied.listMessages(identifiers.actor, identifiers.complaint, { limit: 25 }),
      CommunicationAccessDeniedError,
    );
    await assert.rejects(
      missing.markNotificationRead(identifiers.actor, identifiers.notification),
      CommunicationNotFoundError,
    );
    await assert.rejects(
      conflict.createMessage(identifiers.actor, identifiers.complaint, {
        body: message.body,
        clientMessageId: identifiers.clientMessage,
      }),
      CommunicationConflictError,
    );
  });

  it('fails closed when a service RPC returns a malformed private payload', async () => {
    const store = createStore(async () => ({
      data: [{ response_payload: { ...message, senderUserId: identifiers.actor } }],
      error: null,
    }));

    await assert.rejects(
      store.listMessages(identifiers.actor, identifiers.complaint, { limit: 25 }),
      CommunicationDataAccessError,
    );
  });
});
