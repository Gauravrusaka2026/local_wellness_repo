import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ClaimedNotificationOutboxEvent,
  NotificationOutboxStore,
} from './notification-outbox.store.js';
import { NotificationOutboxWorker } from './notification-outbox-worker.js';
import type { WorkerLogFields, WorkerLogger } from './worker-logger.js';

const firstEvent = {
  leaseToken: '10000000-0000-4000-8000-000000000001',
  outboxId: '20000000-0000-4000-8000-000000000001',
} as const;
const secondEvent = {
  leaseToken: '10000000-0000-4000-8000-000000000002',
  outboxId: '20000000-0000-4000-8000-000000000002',
} as const;

class RecordingLogger implements WorkerLogger {
  public readonly entries: { event: string; fields?: WorkerLogFields; level: string }[] = [];
  public error(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'error' });
  }
  public info(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'info' });
  }
  public warn(event: string, fields?: WorkerLogFields): void {
    this.entries.push({ event, ...(fields === undefined ? {} : { fields }), level: 'warn' });
  }
}

const createWorker = (
  store: NotificationOutboxStore,
  logger = new RecordingLogger(),
): [NotificationOutboxWorker, RecordingLogger] => [
  new NotificationOutboxWorker(store, logger, {
    batchSize: 10,
    leaseSeconds: 60,
    pollIntervalMilliseconds: 1_000,
    workerId: 'test-worker',
  }),
  logger,
];

test('materializes every claimed event and reports notification totals', async () => {
  const materialized: ClaimedNotificationOutboxEvent[] = [];
  const store: NotificationOutboxStore = {
    claim: async () => [firstEvent, secondEvent],
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
    materialize: async (event) => {
      materialized.push(event);
      return { notificationCount: event.outboxId === firstEvent.outboxId ? 2 : 1, replayed: false };
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.deepEqual(materialized, [firstEvent, secondEvent]);
  assert.deepEqual(result, {
    claimed: 2,
    dead: 0,
    materialized: 2,
    notifications: 3,
    retriesScheduled: 0,
  });
  assert.equal(
    logger.entries.filter((entry) => entry.event === 'notification_outbox_materialized').length,
    2,
  );
});

test('records bounded retry or dead state without stopping the rest of the batch', async () => {
  const failedIds: string[] = [];
  const store: NotificationOutboxStore = {
    claim: async () => [firstEvent, secondEvent],
    fail: async (event) => {
      failedIds.push(event.outboxId);
      return {
        nextAttemptAt: event.outboxId === firstEvent.outboxId ? '2026-07-14T12:01:00.000Z' : null,
        status: event.outboxId === firstEvent.outboxId ? 'retry_scheduled' : 'dead',
      };
    },
    materialize: async () => {
      throw new Error('database unavailable');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.deepEqual(failedIds, [firstEvent.outboxId, secondEvent.outboxId]);
  assert.deepEqual(result, {
    claimed: 2,
    dead: 1,
    materialized: 0,
    notifications: 0,
    retriesScheduled: 1,
  });
  assert.equal(
    logger.entries.some((entry) => entry.event === 'notification_outbox_materialization_failed'),
    true,
  );
});

test('does not leak materialization exceptions when failure persistence also fails', async () => {
  const store: NotificationOutboxStore = {
    claim: async () => [firstEvent],
    fail: async () => {
      throw new Error('lease expired');
    },
    materialize: async () => {
      throw new Error('contains sensitive provider details');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.claimed, 1);
  assert.equal(
    logger.entries.some((entry) => entry.event === 'notification_outbox_failure_recording_failed'),
    true,
  );
  assert.equal(JSON.stringify(logger.entries).includes('sensitive provider details'), false);
});
