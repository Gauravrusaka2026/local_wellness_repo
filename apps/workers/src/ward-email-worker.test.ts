import assert from 'node:assert/strict';
import test from 'node:test';

import type { WorkerLogFields, WorkerLogger } from './worker-logger.js';
import { WardEmailWorker } from './ward-email-worker.js';

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

test('runs a bounded batch immediately when started', async () => {
  const limits: number[] = [];
  const worker = new WardEmailWorker(
    {
      runBatch: async (limit) => {
        limits.push(limit ?? 0);
        return 1;
      },
    },
    new RecordingLogger(),
    { batchSize: 7, pollIntervalMilliseconds: 60_000 },
  );

  await worker.start();
  await worker.stop();

  assert.deepEqual(limits, [7]);
});

test('records a claim failure and remains stoppable', async () => {
  const logger = new RecordingLogger();
  const worker = new WardEmailWorker(
    {
      runBatch: async () => {
        throw new Error('private provider or database detail');
      },
    },
    logger,
    { batchSize: 10, pollIntervalMilliseconds: 60_000 },
  );

  await worker.start();
  await worker.stop();

  assert.deepEqual(logger.entries, [{ event: 'ward_email_claim_failed', level: 'error' }]);
  assert.equal(JSON.stringify(logger.entries).includes('private provider'), false);
});
