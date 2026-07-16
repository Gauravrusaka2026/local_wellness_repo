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
      kpiCalculation: {
        batchSize: 10,
        leaseSeconds: 120,
        pollIntervalMilliseconds: 1_000,
        workerId: 'notification-worker:test',
      },
      leaseSeconds: 60,
      pollIntervalMilliseconds: 1_000,
      slaEscalation: {
        batchSize: 25,
        leaseSeconds: 60,
        pollIntervalMilliseconds: 1_000,
        workerId: 'notification-worker:test',
      },
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

  it('accepts independent bounded SLA and KPI loop settings', () => {
    const configuration = loadWorkerConfiguration({
      ...validEnvironment,
      KPI_CALCULATION_BATCH_SIZE: '50',
      KPI_CALCULATION_LEASE_SECONDS: '600',
      KPI_CALCULATION_POLL_INTERVAL_MS: '5000',
      KPI_CALCULATION_WORKER_ID: 'worker:kpi',
      SLA_ESCALATION_BATCH_SIZE: '100',
      SLA_ESCALATION_LEASE_SECONDS: '300',
      SLA_ESCALATION_POLL_INTERVAL_MS: '750',
      SLA_ESCALATION_WORKER_ID: 'worker:sla',
    });

    assert.deepEqual(configuration.slaEscalation, {
      batchSize: 100,
      leaseSeconds: 300,
      pollIntervalMilliseconds: 750,
      workerId: 'worker:sla',
    });
    assert.deepEqual(configuration.kpiCalculation, {
      batchSize: 50,
      leaseSeconds: 600,
      pollIntervalMilliseconds: 5_000,
      workerId: 'worker:kpi',
    });
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
      { ...validEnvironment, SLA_ESCALATION_BATCH_SIZE: '101' },
      { ...validEnvironment, SLA_ESCALATION_LEASE_SECONDS: '301' },
      { ...validEnvironment, KPI_CALCULATION_BATCH_SIZE: '51' },
      { ...validEnvironment, KPI_CALCULATION_LEASE_SECONDS: '601' },
      { ...validEnvironment, KPI_CALCULATION_POLL_INTERVAL_MS: '249' },
      { ...validEnvironment, KPI_CALCULATION_WORKER_ID: 'bad id' },
    ]) {
      assert.throws(() => loadWorkerConfiguration(environment), ConfigurationError);
    }
  });
});
