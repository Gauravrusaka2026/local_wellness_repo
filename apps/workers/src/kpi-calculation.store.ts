export interface ClaimedKpiCalculationRun {
  leaseToken: string;
  runId: string;
}

export interface MaterializedKpiCalculationRun {
  replayed: boolean;
  snapshotCount: number;
}

export interface FailedKpiCalculationRun {
  nextAttemptAt: string | null;
  status: 'dead' | 'retry_scheduled';
}

export interface KpiCalculationStore {
  claim(input: {
    batchSize: number;
    leaseSeconds: number;
    workerId: string;
  }): Promise<readonly ClaimedKpiCalculationRun[]>;

  fail(input: {
    errorCode: string;
    leaseToken: string;
    runId: string;
  }): Promise<FailedKpiCalculationRun>;

  materialize(input: { leaseToken: string; runId: string }): Promise<MaterializedKpiCalculationRun>;
}

export class KpiCalculationDataError extends Error {
  public constructor(operation: string) {
    super(`KPI calculation ${operation} failed.`);
    this.name = 'KpiCalculationDataError';
  }
}
