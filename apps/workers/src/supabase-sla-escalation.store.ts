import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { SlaEscalationDataError, type SlaEscalationStore } from './sla-escalation.store.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const claimedJobSchema = z
  .object({
    job_id: z.uuid(),
    lease_token: z.uuid(),
  })
  .strict();

const executedJobSchema = z
  .object({
    escalation_event_id: z.uuid().nullable(),
    outcome: z.enum(['cancelled', 'completed', 'escalated', 'recorded']),
    replayed: z.boolean(),
  })
  .strict();

const failedJobSchema = z
  .object({
    next_attempt_at: z.iso.datetime({ offset: true }).nullable(),
    status: z.enum(['dead', 'retry_scheduled']),
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new SlaEscalationDataError(`${operation} response`);
  }
  return result.data;
};

const decodeSingleRow = <Output>(
  schema: z.ZodType<Output>,
  value: unknown,
  operation: string,
): Output => {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new SlaEscalationDataError(`${operation} response`);
  }
  return decode(schema, value[0], operation);
};

export class SupabaseSlaEscalationStore implements SlaEscalationStore {
  private readonly rpc: ServiceRoleRpc;

  public constructor(client: SupabaseClient<Database>) {
    this.rpc = client.rpc.bind(client) as unknown as ServiceRoleRpc;
  }

  public async claim(input: { batchSize: number; leaseSeconds: number; workerId: string }) {
    const result = await this.rpc('claim_sla_escalation_jobs', {
      p_lease_seconds: input.leaseSeconds,
      p_limit: input.batchSize,
      p_worker_id: input.workerId,
    });
    if (result.error) {
      throw new SlaEscalationDataError('claim');
    }

    const rows = decode(z.array(claimedJobSchema), result.data, 'claim');
    return rows.map((row) => ({ jobId: row.job_id, leaseToken: row.lease_token }));
  }

  public async execute(input: { jobId: string; leaseToken: string }) {
    const result = await this.rpc('execute_sla_escalation_job', {
      p_job_id: input.jobId,
      p_lease_token: input.leaseToken,
    });
    if (result.error) {
      throw new SlaEscalationDataError('execution');
    }

    const row = decodeSingleRow(executedJobSchema, result.data, 'execution');
    return {
      escalationEventId: row.escalation_event_id,
      outcome: row.outcome,
      replayed: row.replayed,
    };
  }

  public async fail(input: { errorCode: string; jobId: string; leaseToken: string }) {
    const result = await this.rpc('fail_sla_escalation_job', {
      p_error_code: input.errorCode,
      p_job_id: input.jobId,
      p_lease_token: input.leaseToken,
    });
    if (result.error) {
      throw new SlaEscalationDataError('failure recording');
    }

    const row = decodeSingleRow(failedJobSchema, result.data, 'failure recording');
    return { nextAttemptAt: row.next_attempt_at, status: row.status };
  }
}
