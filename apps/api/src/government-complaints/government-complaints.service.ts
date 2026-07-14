import { Inject, Injectable } from '@nestjs/common';
import type {
  GovernmentComplaintAssignmentOptions,
  GovernmentComplaintDetail,
  GovernmentComplaintQueueQuery,
  GovernmentComplaintQueueResult,
} from '@local-wellness/types';

import { GovernmentComplaintStore } from '../data/government-complaint.store.js';

@Injectable()
export class GovernmentComplaintsService {
  public constructor(
    @Inject(GovernmentComplaintStore)
    private readonly store: GovernmentComplaintStore,
  ) {}

  public listComplaints(
    actorUserId: string,
    query: GovernmentComplaintQueueQuery,
  ): Promise<GovernmentComplaintQueueResult> {
    return this.store.listComplaints(actorUserId, query);
  }

  public getComplaint(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintDetail> {
    return this.store.getComplaint(actorUserId, complaintId, scopeRoleAssignmentId);
  }

  public listAssignmentOptions(
    actorUserId: string,
    complaintId: string,
    scopeRoleAssignmentId?: string,
  ): Promise<GovernmentComplaintAssignmentOptions> {
    return this.store.listAssignmentOptions(actorUserId, complaintId, scopeRoleAssignmentId);
  }
}
