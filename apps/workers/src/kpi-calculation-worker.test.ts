import assert from 'node:assert/strict';
import test from 'node:test';

import type { KpiCalculationStore } from './kpi-calculation.store.js';
import { KpiCalculationWorker } from './kpi-calculation-worker.js';
import type { WorkerLogFields, WorkerLogger } from './worker-logger.js';

const runs = [
  {
    leaseToken: '40000000-0000-4000-8000-000000000001',
    runId: '50000000-0000-4000-8000-000000000001',
  },
  {
    leaseToken: '40000000-0000-4000-8000-000000000002',
    runId: '50000000-0000-4000-8000-000000000002',
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

const createWorker = (store: KpiCalculationStore, logger = new RecordingLogger()) =>
  [
    new KpiCalculationWorker(store, logger, {
      batchSize: 10,
      leaseSeconds: 60,
      pollIntervalMilliseconds: 60_000,
      workerId: 'worker:kpi',
    }),
    logger,
  ] as const;

test('materializes each claimed KPI run and reports snapshot totals without lease tokens', async () => {
  const materializedIds: string[] = [];
  const store: KpiCalculationStore = {
    claim: async () => runs,
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
    materialize: async (run) => {
      materializedIds.push(run.runId);
      return {
        replayed: run.runId === runs[1].runId,
        snapshotCount: run.runId === runs[0].runId ? 8 : 3,
      };
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.deepEqual(
    materializedIds,
    runs.map((run) => run.runId),
  );
  assert.deepEqual(result, {
    claimed: 2,
    dead: 0,
    materialized: 2,
    retriesScheduled: 0,
    snapshots: 11,
  });
  const serializedLogs = JSON.stringify(logger.entries);
  for (const run of runs) {
    assert.equal(serializedLogs.includes(run.leaseToken), false);
  }
  assert.equal(logger.entries[1]?.fields?.['replayed'], true);
});

test('records KPI retry/dead outcomes and never logs materialization errors', async () => {
  const failureCodes: string[] = [];
  const store: KpiCalculationStore = {
    claim: async () => runs,
    fail: async (run) => {
      failureCodes.push(run.errorCode);
      return run.runId === runs[0].runId
        ? { nextAttemptAt: '2026-07-16T12:01:00.000Z', status: 'retry_scheduled' }
        : { nextAttemptAt: null, status: 'dead' };
    },
    materialize: async () => {
      throw new Error('private KPI source details');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.retriesScheduled, 1);
  assert.equal(result.dead, 1);
  assert.deepEqual(failureCodes, ['KPI_CALCULATION_FAILED', 'KPI_CALCULATION_FAILED']);
  assert.equal(JSON.stringify(logger.entries).includes('private KPI source details'), false);
});

test('sanitizes KPI materialization and failure-recording exceptions', async () => {
  const store: KpiCalculationStore = {
    claim: async () => [runs[0]],
    fail: async () => {
      throw new Error('private database and lease detail');
    },
    materialize: async () => {
      throw new Error('private KPI source detail');
    },
  };
  const [worker, logger] = createWorker(store);

  const result = await worker.runBatch();

  assert.equal(result.claimed, 1);
  assert.equal(result.dead, 0);
  assert.equal(result.retriesScheduled, 0);
  const serializedLogs = JSON.stringify(logger.entries);
  assert.equal(serializedLogs.includes('private KPI'), false);
  assert.equal(serializedLogs.includes('private database'), false);
  assert.equal(serializedLogs.includes(runs[0].leaseToken), false);
  assert.equal(logger.entries[0]?.event, 'kpi_calculation_failure_recording_failed');
});

test('starts once and stops its scheduled KPI polling loop cleanly', async () => {
  let claims = 0;
  const store: KpiCalculationStore = {
    claim: async () => {
      claims += 1;
      return [];
    },
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
    materialize: async () => ({ replayed: false, snapshotCount: 0 }),
  };
  const [worker] = createWorker(store);

  await worker.start();
  await worker.start();
  await worker.stop();

  assert.equal(claims, 1);
});

test('waits for an in-flight KPI batch before completing shutdown', async () => {
  let releaseClaim!: () => void;
  let markClaimStarted!: () => void;
  const claimReleased = new Promise<void>((resolve) => {
    releaseClaim = resolve;
  });
  const claimStarted = new Promise<void>((resolve) => {
    markClaimStarted = resolve;
  });
  const store: KpiCalculationStore = {
    claim: async () => {
      markClaimStarted();
      await claimReleased;
      return [];
    },
    fail: async () => ({ nextAttemptAt: null, status: 'dead' }),
    materialize: async () => ({ replayed: false, snapshotCount: 0 }),
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
