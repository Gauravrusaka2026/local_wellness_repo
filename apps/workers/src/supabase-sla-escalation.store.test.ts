import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SlaEscalationDataError, type SlaEscalationStore } from './sla-escalation.store.js';
import { SupabaseSlaEscalationStore } from './supabase-sla-escalation.store.js';

const identifiers = {
  event: '10000000-0000-4000-8000-000000000001',
  job: '20000000-0000-4000-8000-000000000001',
  lease: '30000000-0000-4000-8000-000000000001',
} as const;

interface RpcCall {
  arguments_: Record<string, unknown>;
  functionName: string;
}

type RpcHandler = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => Promise<Readonly<{ data: unknown; error: unknown }>>;

const createStore = (rpc: RpcHandler): SlaEscalationStore =>
  new SupabaseSlaEscalationStore({ rpc } as unknown as SupabaseClient<Database>);

describe('Supabase SLA escalation store', () => {
  it('uses only the narrow claim, execute, and fail RPC contracts', async () => {
    const calls: RpcCall[] = [];
    const store = createStore(async (functionName, arguments_) => {
      calls.push({ arguments_, functionName });
      if (functionName === 'claim_sla_escalation_jobs') {
        return {
          data: [{ job_id: identifiers.job, lease_token: identifiers.lease }],
          error: null,
        };
      }
      if (functionName === 'execute_sla_escalation_job') {
        return {
          data: [
            {
              escalation_event_id: identifiers.event,
              outcome: 'completed',
              replayed: true,
            },
          ],
          error: null,
        };
      }
      return {
        data: [{ next_attempt_at: null, status: 'dead' }],
        error: null,
      };
    });

    const claimed = await store.claim({
      batchSize: 4,
      leaseSeconds: 45,
      workerId: 'worker:sla',
    });
    const claimedJob = claimed[0];
    assert.ok(claimedJob);
    const executed = await store.execute(claimedJob);
    const failed = await store.fail({
      ...claimedJob,
      errorCode: 'SLA_ESCALATION_EXECUTION_FAILED',
    });

    assert.deepEqual(claimed, [{ jobId: identifiers.job, leaseToken: identifiers.lease }]);
    assert.deepEqual(executed, {
      escalationEventId: identifiers.event,
      outcome: 'completed',
      replayed: true,
    });
    assert.deepEqual(failed, { nextAttemptAt: null, status: 'dead' });
    assert.deepEqual(calls, [
      {
        arguments_: { p_lease_seconds: 45, p_limit: 4, p_worker_id: 'worker:sla' },
        functionName: 'claim_sla_escalation_jobs',
      },
      {
        arguments_: { p_job_id: identifiers.job, p_lease_token: identifiers.lease },
        functionName: 'execute_sla_escalation_job',
      },
      {
        arguments_: {
          p_error_code: 'SLA_ESCALATION_EXECUTION_FAILED',
          p_job_id: identifiers.job,
          p_lease_token: identifiers.lease,
        },
        functionName: 'fail_sla_escalation_job',
      },
    ]);
  });

  it('fails closed for RPC failures and undeclared response fields', async () => {
    const unavailable = createStore(async () => ({
      data: null,
      error: { message: 'private database detail' },
    }));
    const malformed = createStore(async () => ({
      data: [
        {
          escalation_event_id: null,
          outcome: 'completed',
          private_complaint_data: 'must not pass',
          replayed: false,
        },
      ],
      error: null,
    }));
    const nullClaim = createStore(async () => ({ data: null, error: null }));
    const duplicateExecution = createStore(async () => ({
      data: [
        { escalation_event_id: null, outcome: 'completed', replayed: true },
        { escalation_event_id: null, outcome: 'completed', replayed: true },
      ],
      error: null,
    }));

    await assert.rejects(
      unavailable.claim({ batchSize: 1, leaseSeconds: 60, workerId: 'worker:sla' }),
      SlaEscalationDataError,
    );
    await assert.rejects(
      malformed.execute({ jobId: identifiers.job, leaseToken: identifiers.lease }),
      SlaEscalationDataError,
    );
    await assert.rejects(
      nullClaim.claim({ batchSize: 1, leaseSeconds: 60, workerId: 'worker:sla' }),
      SlaEscalationDataError,
    );
    await assert.rejects(
      duplicateExecution.execute({ jobId: identifiers.job, leaseToken: identifiers.lease }),
      SlaEscalationDataError,
    );
  });
});
