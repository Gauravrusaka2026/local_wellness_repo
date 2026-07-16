import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';

export class AccountabilityDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Accountability persistence operation failed: ${operation}.`);
    this.name = 'AccountabilityDataAccessError';
  }
}

export class AccountabilityAccessDeniedError extends AccountabilityDataAccessError {
  public constructor() {
    super('authorize government accountability access');
    this.name = 'AccountabilityAccessDeniedError';
  }
}

export class AccountabilityNotFoundError extends AccountabilityDataAccessError {
  public constructor() {
    super('find complaint accountability');
    this.name = 'AccountabilityNotFoundError';
  }
}

export abstract class AccountabilityStore {
  public abstract getComplaintSla(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintSlaSummary>;

  public abstract listKpiSnapshots(
    actorUserId: string,
    query: GovernmentKpiQuery,
  ): Promise<GovernmentKpiSnapshotResult>;
}
