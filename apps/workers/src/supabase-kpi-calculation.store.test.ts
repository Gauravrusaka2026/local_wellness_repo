import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';

import { KpiCalculationDataError, type KpiCalculationStore } from './kpi-calculation.store.js';
import { SupabaseKpiCalculationStore } from './supabase-kpi-calculation.store.js';

const identifiers = {
  lease: '40000000-0000-4000-8000-000000000001',
  run: '50000000-0000-4000-8000-000000000001',
} as const;

interface RpcCall {
  arguments_: Record<string, unknown>;
  functionName: string;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): KpiCalculationStore =>
  new SupabaseKpiCalculationStore({ rpc } as unknown as SupabaseClient<Database>);

describe('Supabase KPI calculation store', () => {
  it('uses only the narrow claim, materialize, and fail RPC contracts', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ arguments_, functionName });
      if (functionName === 'claim_kpi_calculation_runs') {
        return {
          data: [{ lease_token: identifiers.lease, run_id: identifiers.run }],
          error: null,
        };
      }
      if (functionName === 'materialize_kpi_calculation_run') {
        return { data: [{ replayed: true, snapshot_count: 24 }], error: null };
      }
      return {
        data: [{ next_attempt_at: '2026-07-16T12:01:00.000Z', status: 'retry_scheduled' }],
        error: null,
      };
    });

    const claimed = await store.claim({
      batchSize: 2,
      leaseSeconds: 90,
      workerId: 'worker:kpi',
    });
    const claimedRun = claimed[0];
    assert.ok(claimedRun);
    const materialized = await store.materialize(claimedRun);
    const failed = await store.fail({
      ...claimedRun,
      errorCode: 'KPI_CALCULATION_FAILED',
    });

    assert.deepEqual(claimed, [{ leaseToken: identifiers.lease, runId: identifiers.run }]);
    assert.deepEqual(materialized, { replayed: true, snapshotCount: 24 });
    assert.deepEqual(failed, {
      nextAttemptAt: '2026-07-16T12:01:00.000Z',
      status: 'retry_scheduled',
    });
    assert.deepEqual(calls, [
      {
        arguments_: { p_lease_seconds: 90, p_limit: 2, p_worker_id: 'worker:kpi' },
        functionName: 'claim_kpi_calculation_runs',
      },
      {
        arguments_: { p_lease_token: identifiers.lease, p_run_id: identifiers.run },
        functionName: 'materialize_kpi_calculation_run',
      },
      {
        arguments_: {
          p_error_code: 'KPI_CALCULATION_FAILED',
          p_lease_token: identifiers.lease,
          p_run_id: identifiers.run,
        },
        functionName: 'fail_kpi_calculation_run',
      },
    ]);
  });

  it('fails closed for RPC failures and malformed numeric output', async () => {
    const unavailable = createStore(async () => ({
      data: null,
      error: { message: 'private database detail' },
    }));
    const malformed = createStore(async () => ({
      data: [{ replayed: false, snapshot_count: -1 }],
      error: null,
    }));
    const nullClaim = createStore(async () => ({ data: null, error: null }));
    const duplicateMaterialization = createStore(async () => ({
      data: [
        { replayed: false, snapshot_count: 0 },
        { replayed: false, snapshot_count: 0 },
      ],
      error: null,
    }));

    await assert.rejects(
      unavailable.claim({ batchSize: 1, leaseSeconds: 60, workerId: 'worker:kpi' }),
      KpiCalculationDataError,
    );
    await assert.rejects(
      malformed.materialize({ leaseToken: identifiers.lease, runId: identifiers.run }),
      KpiCalculationDataError,
    );
    await assert.rejects(
      nullClaim.claim({ batchSize: 1, leaseSeconds: 120, workerId: 'worker:kpi' }),
      KpiCalculationDataError,
    );
    await assert.rejects(
      duplicateMaterialization.materialize({
        leaseToken: identifiers.lease,
        runId: identifiers.run,
      }),
      KpiCalculationDataError,
    );
  });
});
