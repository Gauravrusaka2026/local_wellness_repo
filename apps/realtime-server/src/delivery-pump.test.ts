import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RealtimeDeliveryPump } from './delivery-pump.js';
import { FakeRealtimeStore, MemoryRealtimeLogger, testIds } from './test-doubles.js';

const delivery = {
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
} as const;

describe('realtime delivery pump', () => {
  it('claims, emits, and completes a durable delivery', async () => {
    const store = new FakeRealtimeStore();
    const logger = new MemoryRealtimeLogger();
    store.pendingDeliveries.push(delivery);
    const pump = new RealtimeDeliveryPump(
      store,
      async (claimed) => {
        assert.equal(claimed.eventId, testIds.event);
        return 2;
      },
      { batchSize: 10, leaseSeconds: 30, pollIntervalMilliseconds: 60_000 },
      logger,
    );

    await pump.pollOnce();

    assert.equal(pump.isReady(), true);
    assert.deepEqual(store.completed, [{ deliveredSocketCount: 2, deliveryId: testIds.delivery }]);
    assert.deepEqual(store.failed, []);
    assert.equal(
      logger.entries.some(({ event }) => event === 'realtime_delivery_completed'),
      true,
    );
  });

  it('records a delivery failure without exposing its payload in logs', async () => {
    const store = new FakeRealtimeStore();
    const logger = new MemoryRealtimeLogger();
    store.pendingDeliveries.push(delivery);
    const pump = new RealtimeDeliveryPump(
      store,
      async () => {
        throw new Error('private message body');
      },
      { batchSize: 10, leaseSeconds: 30, pollIntervalMilliseconds: 60_000 },
      logger,
    );

    await pump.pollOnce();

    assert.deepEqual(store.failed, [testIds.delivery]);
    assert.deepEqual(store.failureCodes, ['DELIVERY_EMIT_FAILED']);
    assert.equal(JSON.stringify(logger.entries).includes('private message body'), false);
  });

  it('records a dependency failure when completion is unavailable after emit', async () => {
    const store = new FakeRealtimeStore();
    const logger = new MemoryRealtimeLogger();
    store.completionError = true;
    store.pendingDeliveries.push(delivery);
    const pump = new RealtimeDeliveryPump(
      store,
      async () => 1,
      { batchSize: 10, leaseSeconds: 30, pollIntervalMilliseconds: 60_000 },
      logger,
    );

    await pump.pollOnce();

    assert.deepEqual(store.failureCodes, ['DELIVERY_DEPENDENCY_UNAVAILABLE']);
  });

  it('reports not-ready while the claim dependency is unavailable', async () => {
    const store = new FakeRealtimeStore();
    const logger = new MemoryRealtimeLogger();
    store.claimError = true;
    const pump = new RealtimeDeliveryPump(
      store,
      async () => 0,
      { batchSize: 10, leaseSeconds: 30, pollIntervalMilliseconds: 60_000 },
      logger,
    );

    await pump.pollOnce();

    assert.equal(pump.isReady(), false);
    assert.equal(logger.entries.at(-1)?.event, 'realtime_delivery_claim_failed');
  });
});
