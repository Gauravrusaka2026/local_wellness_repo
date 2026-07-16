import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigurationError } from '@local-wellness/config';

import { loadWorkerConfiguration } from './worker-configuration.js';

const validEnvironment = {
  NOTIFICATION_WORKER_ID: 'notification-worker:test',
  SUPABASE_SECRET_KEY: 'test-service-role-key',
  SUPABASE_URL: 'http://127.0.0.1:54321',
} satisfies NodeJS.ProcessEnv;

describe('notification worker configuration', () => {
  it('uses bounded delivery defaults and normalizes the Supabase URL', () => {
    assert.deepEqual(loadWorkerConfiguration(validEnvironment), {
      batchSize: 25,
      leaseSeconds: 60,
      pollIntervalMilliseconds: 1_000,
      supabaseServiceRoleKey: 'test-service-role-key',
      supabaseUrl: 'http://127.0.0.1:54321',
      workerId: 'notification-worker:test',
    });
  });

  it('accepts explicit bounded polling values and the legacy service-role alias', () => {
    const configuration = loadWorkerConfiguration({
      NOTIFICATION_BATCH_SIZE: '10',
      NOTIFICATION_LEASE_SECONDS: '30',
      NOTIFICATION_POLL_INTERVAL_MS: '2500',
      NOTIFICATION_WORKER_ID: 'notification-worker.2',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-service-role-key',
      SUPABASE_URL: 'https://example.supabase.co/',
    });

    assert.equal(configuration.batchSize, 10);
    assert.equal(configuration.leaseSeconds, 30);
    assert.equal(configuration.pollIntervalMilliseconds, 2_500);
    assert.equal(configuration.supabaseServiceRoleKey, 'legacy-service-role-key');
    assert.equal(configuration.supabaseUrl, 'https://example.supabase.co');
  });

  it('rejects missing secrets, embedded URL credentials, and unsafe worker identifiers', () => {
    assert.throws(
      () => loadWorkerConfiguration({ ...validEnvironment, SUPABASE_SECRET_KEY: '' }),
      ConfigurationError,
    );
    assert.throws(
      () =>
        loadWorkerConfiguration({
          ...validEnvironment,
          SUPABASE_URL: 'https://user:password@example.supabase.co',
        }),
      ConfigurationError,
    );
    assert.throws(
      () => loadWorkerConfiguration({ ...validEnvironment, NOTIFICATION_WORKER_ID: 'bad id' }),
      ConfigurationError,
    );
  });

  it('rejects out-of-range batch, lease, and polling values', () => {
    for (const environment of [
      { ...validEnvironment, NOTIFICATION_BATCH_SIZE: '0' },
      { ...validEnvironment, NOTIFICATION_LEASE_SECONDS: '10' },
      { ...validEnvironment, NOTIFICATION_POLL_INTERVAL_MS: '60001' },
    ]) {
      assert.throws(() => loadWorkerConfiguration(environment), ConfigurationError);
    }
  });
});
