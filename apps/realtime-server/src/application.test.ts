import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { SocketOperationAcknowledgement } from '@local-wellness/types';
import { io, type Socket as ClientSocket } from 'socket.io-client';

import { createRealtimeApplication, type RealtimeApplication } from './application.js';
import {
  FakeRealtimeAuthenticationGateway,
  FakeRealtimeStore,
  MemoryRealtimeLogger,
  testConfiguration,
  testIds,
} from './test-doubles.js';

const accessToken = 'test-access-token';
const otherAccessToken = 'other-test-access-token';
const applications: RealtimeApplication[] = [];
const clients: ClientSocket[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

const startApplication = async () => {
  const authentication = new FakeRealtimeAuthenticationGateway();
  const store = new FakeRealtimeStore();
  const logger = new MemoryRealtimeLogger();
  authentication.users.set(accessToken, {
    expiresAtMilliseconds: Date.now() + 60_000,
    userId: testIds.user,
  });
  store.activeUsers.add(testIds.user);
  const application = createRealtimeApplication({
    authenticationGateway: authentication,
    configuration: testConfiguration,
    logger,
    store,
  });
  applications.push(application);
  const address = await application.listen(0, '127.0.0.1');
  return {
    application,
    authentication,
    logger,
    store,
    url: `http://127.0.0.1:${address.port}`,
  };
};

const connect = async (url: string, token = accessToken): Promise<ClientSocket> => {
  const client = io(url, {
    auth: { accessToken: token },
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
  });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out.')), 2_000);
    client.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    client.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return client;
};

const emitWithAcknowledgement = <Input>(
  client: ClientSocket,
  event: string,
  input: Input,
): Promise<SocketOperationAcknowledgement> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out.`)), 2_000);
    client.emit(event, input, (acknowledgement: SocketOperationAcknowledgement) => {
      clearTimeout(timer);
      resolve(acknowledgement);
    });
  });

describe('realtime application', () => {
  it('exposes bounded health endpoints and rejects unauthenticated sockets', async () => {
    const { application, url } = await startApplication();
    await application.deliveryPump.pollOnce();

    const live = await fetch(`${url}/health/live`);
    const ready = await fetch(`${url}/health/ready`);
    const missing = await fetch(`${url}/not-found`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });
    assert.equal(ready.status, 200);
    assert.equal(missing.status, 404);

    const client = io(url, {
      auth: { accessToken: 'unknown-access-token' },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    clients.push(client);
    const error = await new Promise<Error>((resolve) => client.once('connect_error', resolve));
    assert.equal(error.message, 'AUTH_REQUIRED');

    const wrongOrigin = io(url, {
      auth: { accessToken },
      extraHeaders: { origin: 'https://untrusted.example' },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    clients.push(wrongOrigin);
    const originError = await new Promise<Error>((resolve) =>
      wrongOrigin.once('connect_error', resolve),
    );
    assert.equal(originError instanceof Error, true);
  });

  it('validates and authorizes every explicit room join', async () => {
    const { store, url } = await startApplication();
    const client = await connect(url);
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });

    const joined = await emitWithAcknowledgement(client, 'room:join', {
      roomId: testIds.complaint,
      roomType: 'complaint',
    });
    const denied = await emitWithAcknowledgement(client, 'room:join', {
      roomId: testIds.otherComplaint,
      roomType: 'complaint',
    });
    const malformed = await emitWithAcknowledgement(client, 'room:join', {
      roomId: testIds.complaint,
      roomType: 'user',
    });

    assert.equal(joined.ok, true);
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.error.code, 'ACCESS_DENIED');
    assert.equal(malformed.ok, false);
    if (!malformed.ok) assert.equal(malformed.error.code, 'VALIDATION_ERROR');

    for (const roomType of ['authority', 'ward', 'department'] as const) {
      store.authorize(testIds.user, { kind: roomType, resourceId: testIds.complaint });
      const scopeJoin = await emitWithAcknowledgement(client, 'room:join', {
        roomId: testIds.complaint,
        roomType,
      });
      assert.equal(scopeJoin.ok, true);
    }

    store.authorize(testIds.user, {
      kind: 'complaint',
      resourceId: testIds.otherComplaint,
    });
    const overCapacity = await emitWithAcknowledgement(client, 'room:join', {
      roomId: testIds.otherComplaint,
      roomType: 'complaint',
    });
    assert.equal(overCapacity.ok, false);
    if (!overCapacity.ok) assert.equal(overCapacity.error.code, 'ROOM_LIMIT_REACHED');

    const left = await emitWithAcknowledgement(client, 'room:leave', {
      roomId: testIds.complaint,
      roomType: 'complaint',
    });
    assert.equal(left.ok, true);
    const joinedAfterLeave = await emitWithAcknowledgement(client, 'room:join', {
      roomId: testIds.otherComplaint,
      roomType: 'complaint',
    });
    assert.equal(joinedAfterLeave.ok, true);
  });

  it('persists a private message before emitting it to reauthorized room members', async () => {
    const { authentication, store, url } = await startApplication();
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });
    authentication.users.set(otherAccessToken, {
      expiresAtMilliseconds: Date.now() + 60_000,
      userId: testIds.otherUser,
    });
    store.activeUsers.add(testIds.otherUser);
    store.authorize(testIds.otherUser, {
      kind: 'complaint',
      resourceId: testIds.complaint,
    });
    const sender = await connect(url);
    const recipient = await connect(url, otherAccessToken);
    for (const client of [sender, recipient]) {
      const result = await emitWithAcknowledgement(client, 'room:join', {
        roomId: testIds.complaint,
        roomType: 'complaint',
      });
      assert.equal(result.ok, true);
    }

    const created = new Promise<Record<string, unknown>>((resolve) => {
      recipient.once('message:created', (payload: Record<string, unknown>) => {
        assert.equal(store.messages.length, 1);
        resolve(payload);
      });
    });
    const acknowledgement = await emitWithAcknowledgement(sender, 'message:create', {
      body: '  Private status question.  ',
      clientMessageId: testIds.message,
      complaintId: testIds.complaint,
    });

    assert.equal(acknowledgement.ok, true);
    assert.equal(store.messages[0]?.message.body, 'Private status question.');
    const event = await created;
    assert.equal(event['eventId'], testIds.event);
    assert.equal((event['payload'] as Record<string, unknown>)['authoredByMe'], false);
  });

  it('persists and broadcasts a monotonic message read position', async () => {
    const { store, url } = await startApplication();
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });
    const reader = await connect(url);
    const observer = await connect(url);
    for (const client of [reader, observer]) {
      const result = await emitWithAcknowledgement(client, 'room:join', {
        roomId: testIds.complaint,
        roomType: 'complaint',
      });
      assert.equal(result.ok, true);
    }
    const received = new Promise<Record<string, unknown>>((resolve) => {
      observer.once('message:read', resolve);
    });

    const acknowledgement = await emitWithAcknowledgement(reader, 'message:read', {
      complaintId: testIds.complaint,
      readThroughCreatedAt: '2026-07-14T10:00:00.000Z',
      readThroughMessageId: testIds.message,
    });

    assert.equal(acknowledgement.ok, true);
    assert.equal(store.receipts[0]?.receipt.readThroughMessageId, testIds.message);
    assert.equal((await received)['eventId'], testIds.event);
  });

  it('emits bounded typing state without exposing a user identifier', async () => {
    const { store, url } = await startApplication();
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });
    const sender = await connect(url);
    const observer = await connect(url);
    for (const client of [sender, observer]) {
      const result = await emitWithAcknowledgement(client, 'room:join', {
        roomId: testIds.complaint,
        roomType: 'complaint',
      });
      assert.equal(result.ok, true);
    }
    const received = new Promise<Record<string, unknown>>((resolve) => {
      observer.once('typing:changed', resolve);
    });

    const acknowledgement = await emitWithAcknowledgement(sender, 'typing:start', {
      complaintId: testIds.complaint,
    });

    assert.equal(acknowledgement.ok, true);
    const event = await received;
    assert.equal(event['schemaVersion'], 1);
    assert.deepEqual(event['payload'], {
      active: true,
      authorType: 'citizen',
      complaintId: testIds.complaint,
    });
    assert.equal(JSON.stringify(event).includes(testIds.user), false);
  });

  it('rate limits validated operations within a socket session', async () => {
    const { url } = await startApplication();
    const client = await connect(url);

    for (let index = 0; index < testConfiguration.eventRateLimitPerMinute; index += 1) {
      const acknowledgement = await emitWithAcknowledgement(client, 'room:leave', {
        roomId: testIds.complaint,
        roomType: 'complaint',
      });
      assert.equal(acknowledgement.ok, true);
    }
    const rateLimited = await emitWithAcknowledgement(client, 'room:leave', {
      roomId: testIds.complaint,
      roomType: 'complaint',
    });

    assert.equal(rateLimited.ok, false);
    if (!rateLimited.ok) assert.equal(rateLimited.error.code, 'RATE_LIMITED');
  });

  it('delivers a claimed event only to an active, currently authorized user socket', async () => {
    const { application, store, url } = await startApplication();
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });
    const client = await connect(url);
    const received = new Promise<Record<string, unknown>>((resolve) => {
      client.once('complaint:status_changed', resolve);
    });
    store.pendingDeliveries.push({
      attemptCount: 1,
      claimToken: '10000000-0000-4000-8000-000000000010',
      complaintId: testIds.complaint,
      deliveryId: testIds.delivery,
      eventId: testIds.event,
      eventName: 'complaint:status_changed',
      occurredAt: '2026-07-14T10:00:00.000Z',
      payload: {
        createdAt: '2026-07-14T10:00:00.000Z',
        eventId: testIds.event,
        eventType: 'acknowledgement',
        id: '10000000-0000-4000-8000-000000000011',
        occurredAt: '2026-07-14T10:00:00.000Z',
        payload: { complaintId: testIds.complaint, status: 'acknowledged' },
        readAt: null,
      },
      recipientUserId: testIds.user,
    });

    await application.deliveryPump.pollOnce();

    const payload = await received;
    assert.equal(payload['eventId'], testIds.event);
    assert.deepEqual(store.completed.at(-1), {
      deliveredSocketCount: 1,
      deliveryId: testIds.delivery,
    });
  });

  it('removes stale room authorization before broadcasting', async () => {
    const { store, url } = await startApplication();
    store.authorize(testIds.user, { kind: 'complaint', resourceId: testIds.complaint });
    const sender = await connect(url);
    const result = await emitWithAcknowledgement(sender, 'room:join', {
      roomId: testIds.complaint,
      roomType: 'complaint',
    });
    assert.equal(result.ok, true);
    store.authorizedRooms.clear();

    const acknowledgement = await emitWithAcknowledgement(sender, 'message:create', {
      body: 'This must not persist.',
      clientMessageId: testIds.message,
      complaintId: testIds.complaint,
    });

    assert.equal(acknowledgement.ok, false);
    if (!acknowledgement.ok) assert.equal(acknowledgement.error.code, 'ACCESS_DENIED');
    assert.deepEqual(store.messages, []);
  });
});
