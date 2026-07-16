export interface ClaimedSlaEscalationJob {
  jobId: string;
  leaseToken: string;
}

export interface ExecutedSlaEscalationJob {
  escalationEventId: string | null;
  outcome: 'cancelled' | 'completed' | 'escalated' | 'recorded';
  replayed: boolean;
}

export interface FailedSlaEscalationJob {
  nextAttemptAt: string | null;
  status: 'dead' | 'retry_scheduled';
}

export interface SlaEscalationStore {
  claim(input: {
    batchSize: number;
    leaseSeconds: number;
    workerId: string;
  }): Promise<readonly ClaimedSlaEscalationJob[]>;

  execute(input: { jobId: string; leaseToken: string }): Promise<ExecutedSlaEscalationJob>;

  fail(input: {
    errorCode: string;
    jobId: string;
    leaseToken: string;
  }): Promise<FailedSlaEscalationJob>;
}

export class SlaEscalationDataError extends Error {
  public constructor(operation: string) {
    super(`SLA escalation ${operation} failed.`);
    this.name = 'SlaEscalationDataError';
  }
}
