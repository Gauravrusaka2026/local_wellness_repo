import type { Database } from '@local-wellness/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { KpiCalculationDataError, type KpiCalculationStore } from './kpi-calculation.store.js';

interface RpcResult {
  data: unknown;
  error: unknown;
}

type ServiceRoleRpc = (
  functionName: string,
  arguments_: Record<string, unknown>,
) => PromiseLike<RpcResult>;

const claimedRunSchema = z
  .object({
    lease_token: z.uuid(),
    run_id: z.uuid(),
  })
  .strict();

const materializedRunSchema = z
  .object({
    replayed: z.boolean(),
    snapshot_count: z.number().int().nonnegative(),
  })
  .strict();

const failedRunSchema = z
  .object({
    next_attempt_at: z.iso.datetime({ offset: true }).nullable(),
    status: z.enum(['dead', 'retry_scheduled']),
  })
  .strict();

const decode = <Output>(schema: z.ZodType<Output>, value: unknown, operation: string): Output => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new KpiCalculationDataError(`${operation} response`);
  }
  return result.data;
};

const decodeSingleRow = <Output>(
  schema: z.ZodType<Output>,
  value: unknown,
  operation: string,
): Output => {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new KpiCalculationDataError(`${operation} response`);
  }
  return decode(schema, value[0], operation);
};

export class SupabaseKpiCalculationStore implements KpiCalculationStore {
  private readonly rpc: ServiceRoleRpc;

  public constructor(client: SupabaseClient<Database>) {
    this.rpc = client.rpc.bind(client) as unknown as ServiceRoleRpc;
  }

  public async claim(input: { batchSize: number; leaseSeconds: number; workerId: string }) {
    const result = await this.rpc('claim_kpi_calculation_runs', {
      p_lease_seconds: input.leaseSeconds,
      p_limit: input.batchSize,
      p_worker_id: input.workerId,
    });
    if (result.error) {
      throw new KpiCalculationDataError('claim');
    }

    const rows = decode(z.array(claimedRunSchema), result.data, 'claim');
    return rows.map((row) => ({ leaseToken: row.lease_token, runId: row.run_id }));
  }

  public async materialize(input: { leaseToken: string; runId: string }) {
    const result = await this.rpc('materialize_kpi_calculation_run', {
      p_lease_token: input.leaseToken,
      p_run_id: input.runId,
    });
    if (result.error) {
      throw new KpiCalculationDataError('materialization');
    }

    const row = decodeSingleRow(materializedRunSchema, result.data, 'materialization');
    return { replayed: row.replayed, snapshotCount: row.snapshot_count };
  }

  public async fail(input: { errorCode: string; leaseToken: string; runId: string }) {
    const result = await this.rpc('fail_kpi_calculation_run', {
      p_error_code: input.errorCode,
      p_lease_token: input.leaseToken,
      p_run_id: input.runId,
    });
    if (result.error) {
      throw new KpiCalculationDataError('failure recording');
    }

    const row = decodeSingleRow(failedRunSchema, result.data, 'failure recording');
    return { nextAttemptAt: row.next_attempt_at, status: row.status };
  }
}
