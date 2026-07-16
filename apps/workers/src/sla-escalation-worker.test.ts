import assert from 'node:assert/strict';
import test from 'node:test';

import type { SlaEscalationStore } from './sla-escalation.store.js';
import { SlaEscalationWorker } from './sla-escalation-worker.js';
import type { WorkerLogFields, WorkerLogger } from './worker-logger.js';

const jobs = [
  {
    jobId: '10000000-0000-4000-8000-000000000001',
    leaseToken: '20000000-0000-4000-8000-000000000001',
  },
  {
    jobId: '10000000-0000-4000-8000-000000000002',
    leaseToken: '20000000-0000-4000-8000-000000000002',
  },
] as const;

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

const createWorker = (store: SlaEscalationStore, logger = new RecordingLogger()) =>
  [
    new SlaEscalationWorker(store, logger, {
      batchSize: 10,
      leaseSeconds: 60,
      pollIntervalMilliseconds: 60_000,
      workerId: 'worker:sla',
    }),
    logger,
  ] as const;

test('executes each claimed SLA job and records outcome totals without logging lease tokens', async () => {
  const executedIds: string[] = [];
  const store: SlaEscalationStore = {
    claim: async () => jobs,
    execute: async (job) => {
      executedIds.push(job.jobId);
      return {
        escalationEventId:
          job.jobId === jobs[0].jobId ? '30000000-0000-4000-8000-000000000001' : null,
        outcome: job.jobId === jobs[0].jobId ? 'escalated' : 'cancelled',
        replayed: false,
      };
    },
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.deepEqual(
    executedIds,
    jobs.map((job) => job.jobId),
  );
  assert.deepEqual(result, {
    cancelled: 1,
    claimed: 2,
    completed: 0,
    dead: 0,
    escalated: 1,
    recorded: 0,
    retriesScheduled: 0,
  });
  const serializedLogs = JSON.stringify(logger.entries);
  for (const job of jobs) {
    assert.equal(serializedLogs.includes(job.leaseToken), false);
  }
});

test('accepts an idempotent completed SLA replay without scheduling a retry', async () => {
  const store: SlaEscalationStore = {
    claim: async () => [jobs[0]],
    execute: async () => ({
      escalationEventId: '30000000-0000-4000-8000-000000000001',
      outcome: 'completed',
      replayed: true,
    }),
    fail: async () => {
      throw new Error('a replay must not be failed');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.completed, 1);
  assert.equal(result.retriesScheduled, 0);
  assert.equal(logger.entries[0]?.fields?.['replayed'], true);
});

test('records bounded SLA retry and dead outcomes and sanitizes thrown errors', async () => {
  const failureCodes: string[] = [];
  const store: SlaEscalationStore = {
    claim: async () => jobs,
    execute: async () => {
      throw new Error('private complaint description and lease details');
    },
    fail: async (job) => {
      failureCodes.push(job.errorCode);
      return job.jobId === jobs[0].jobId
        ? { nextAttemptAt: '2026-07-16T12:01:00.000Z', status: 'retry_scheduled' }
        : { nextAttemptAt: null, status: 'dead' };
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.retriesScheduled, 1);
  assert.equal(result.dead, 1);
  assert.deepEqual(failureCodes, [
    'SLA_ESCALATION_EXECUTION_FAILED',
    'SLA_ESCALATION_EXECUTION_FAILED',
  ]);
  assert.equal(JSON.stringify(logger.entries).includes('private complaint description'), false);
});

test('sanitizes SLA execution and failure-recording exceptions', async () => {
  const store: SlaEscalationStore = {
    claim: async () => [jobs[0]],
    execute: async () => {
      throw new Error('private complaint and execution detail');
    },
    fail: async () => {
      throw new Error('private database and lease detail');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.claimed, 1);
  assert.equal(result.dead, 0);
  assert.equal(result.retriesScheduled, 0);
  const serializedLogs = JSON.stringify(logger.entries);
  assert.equal(serializedLogs.includes('private complaint'), false);
  assert.equal(serializedLogs.includes('private database'), false);
  assert.equal(serializedLogs.includes(jobs[0].leaseToken), false);
  assert.equal(logger.entries[0]?.event, 'sla_escalation_failure_recording_failed');
});

test('starts once and stops its scheduled SLA polling loop cleanly', async () => {
  let claims = 0;
  const store: SlaEscalationStore = {
    claim: async () => {
      claims += 1;
      return [];
    },
    execute: async () => ({ escalationEventId: null, outcome: 'completed', replayed: false }),
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
  };
  const [worker] = createWorker(store);

  await worker.start();
  await worker.start();
  await worker.stop();

  assert.equal(claims, 1);
});

test('waits for an in-flight SLA batch before completing shutdown', async () => {
  let releaseClaim!: () => void;
  let markClaimStarted!: () => void;
  const claimReleased = new Promise<void>((resolve) => {
    releaseClaim = resolve;
  });
  const claimStarted = new Promise<void>((resolve) => {
    markClaimStarted = resolve;
  });
  const store: SlaEscalationStore = {
    claim: async () => {
      markClaimStarted();
      await claimReleased;
      return [];
    },
    execute: async () => ({ escalationEventId: null, outcome: 'completed', replayed: false }),
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
  };
  const [worker] = createWorker(store);

  const start = worker.start();
  await claimStarted;
  let stopped = false;
  const stop = worker.stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  assert.equal(stopped, false);

  releaseClaim();
  await Promise.all([start, stop]);
  assert.equal(stopped, true);
});
