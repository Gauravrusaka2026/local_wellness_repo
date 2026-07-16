import { Inject, Injectable } from '@nestjs/common';
import type {
  GovernmentComplaintSlaSummary,
  GovernmentKpiQuery,
  GovernmentKpiSnapshotResult,
} from '@local-wellness/types';
import {
  governmentComplaintSlaSummarySchema,
  governmentKpiSnapshotResultSchema,
} from '@local-wellness/validation';

import {
  AccountabilityDataAccessError,
  AccountabilityStore,
} from '../data/accountability.store.js';

@Injectable()
export class AccountabilityService {
  public constructor(@Inject(AccountabilityStore) private readonly store: AccountabilityStore) {}

  public async getComplaintSla(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintSlaSummary> {
    const result = governmentComplaintSlaSummarySchema.safeParse(
      await this.store.getComplaintSla(actorUserId, complaintId, scopeRoleAssignmentId),
    );
    if (!result.success) {
      throw new AccountabilityDataAccessError('validate complaint SLA response');
    }
    return result.data;
  }

  public async listKpiSnapshots(
    actorUserId: string,
    query: GovernmentKpiQuery,
  ): Promise<GovernmentKpiSnapshotResult> {
    const result = governmentKpiSnapshotResultSchema.safeParse(
      await this.store.listKpiSnapshots(actorUserId, query),
    );
    if (!result.success) {
      throw new AccountabilityDataAccessError('validate KPI snapshot response');
    }
    return result.data;
  }
}
