import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiClientError } from '@local-wellness/api-client';

import {
  createComplaintMessage,
  listComplaintMessages,
  listNotifications,
  markNotificationRead,
} from '../src/complaints/complaint-service';
import { realtimeEventMatchesComplaint } from '../src/realtime/complaint-subscription';

const complaintId = '11111111-1111-4111-8111-111111111111';
const messageId = '22222222-2222-4222-8222-222222222222';
const notificationId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const clientMessageId = '55555555-5555-4555-8555-555555555555';
const requestId = 'phase6-client-test-request';
const occurredAt = '2026-07-14T05:00:00.000Z';

const message = {
  authoredByMe: true,
  authorType: 'citizen',
  body: 'Please share an update.',
  complaintId,
  createdAt: occurredAt,
  id: messageId,
  kind: 'private_message',
} as const;

const response = (data: unknown): Response =>
  new Response(JSON.stringify({ data, meta: { requestId } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });

const setPublicApiUrl = (value: string | undefined): void => {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_API_URL');
    return;
  }
  Reflect.set(process.env, 'EXPO_PUBLIC_API_URL', value);
};

test('uses authenticated durable REST endpoints for messages and notifications', async () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  const requests: Array<Readonly<{ body: string | undefined; method: string; url: string }>> = [];
  const responses = [
    response({ items: [message], nextCursor: null }),
    response(message),
    response({
      items: [
        {
          createdAt: occurredAt,
          eventId,
          eventType: 'message',
          id: notificationId,
          occurredAt,
          payload: { complaintId, messageId },
          readAt: null,
        },
      ],
      nextCursor: null,
    }),
    response({ notificationId, readAt: occurredAt }),
  ];

  setPublicApiUrl('http://127.0.0.1:3001');
  globalThis.fetch = async (input, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer citizen-token');
    requests.push({
      body: typeof init?.body === 'string' ? init.body : undefined,
      method: init?.method ?? 'GET',
      url: String(input),
    });
    const next = responses.shift();
    assert.ok(next);
    return next;
  };

  try {
    assert.deepEqual(await listComplaintMessages('citizen-token', complaintId), {
      items: [message],
      nextCursor: null,
    });
    assert.deepEqual(
      await createComplaintMessage('citizen-token', complaintId, {
        body: message.body,
        clientMessageId,
      }),
      message,
    );
    assert.equal((await listNotifications('citizen-token')).items[0]?.id, notificationId);
    assert.deepEqual(await markNotificationRead('citizen-token', notificationId), {
      notificationId,
      readAt: occurredAt,
    });
  } finally {
    globalThis.fetch = originalFetch;
    setPublicApiUrl(originalApiUrl);
  }

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ['GET', `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/messages?limit=100`],
      ['POST', `http://127.0.0.1:3001/api/v1/complaints/${complaintId}/messages`],
      ['GET', 'http://127.0.0.1:3001/api/v1/notifications?limit=100'],
      ['POST', `http://127.0.0.1:3001/api/v1/notifications/${notificationId}/read`],
    ],
  );
  assert.deepEqual(JSON.parse(requests[1]?.body ?? 'null'), {
    body: message.body,
    clientMessageId,
  });
  assert.equal(requests[3]?.body, undefined);
});

test('rejects private message responses that expose an unexpected sender identifier', async () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const originalFetch = globalThis.fetch;
  setPublicApiUrl('http://127.0.0.1:3001');
  globalThis.fetch = async () =>
    response({
      items: [{ ...message, senderUserId: '66666666-6666-4666-8666-666666666666' }],
      nextCursor: null,
    });

  try {
    await assert.rejects(
      listComplaintMessages('citizen-token', complaintId),
      (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE',
    );
  } finally {
    globalThis.fetch = originalFetch;
    setPublicApiUrl(originalApiUrl);
  }
});

test('accepts realtime events only when their durable complaint resource matches', () => {
  assert.equal(
    realtimeEventMatchesComplaint('message:created', { payload: { complaintId } }, complaintId),
    true,
  );
  assert.equal(
    realtimeEventMatchesComplaint(
      'notification:created',
      { payload: { payload: { complaintId } } },
      complaintId,
    ),
    true,
  );
  assert.equal(
    realtimeEventMatchesComplaint(
      'complaint:status_changed',
      { payload: { payload: { complaintId: eventId } } },
      complaintId,
    ),
    false,
  );
  assert.equal(realtimeEventMatchesComplaint('message:created', [], complaintId), false);
});
