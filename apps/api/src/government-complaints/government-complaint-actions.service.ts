import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GovernmentComplaintActionResult } from '@local-wellness/types';

import { createComplaintMutationIdentity } from '../common/idempotency.js';
import {
  GovernmentComplaintStore,
  type GovernmentComplaintAction,
} from '../data/government-complaint.store.js';

@Injectable()
export class GovernmentComplaintActionsService {
  private readonly logger = new Logger(GovernmentComplaintActionsService.name);

  public constructor(
    @Inject(GovernmentComplaintStore)
    private readonly store: GovernmentComplaintStore,
  ) {}

  public async performAction(
    actorUserId: string,
    complaintId: string,
    action: GovernmentComplaintAction,
    idempotencyKey: string,
    requestId: string,
  ): Promise<GovernmentComplaintActionResult> {
    const result = await this.store.performAction(
      actorUserId,
      complaintId,
      action,
      createComplaintMutationIdentity(idempotencyKey, `government-complaint:${action.kind}`, {
        action,
        complaintId,
      }),
      requestId,
    );

    this.logger.log({
      event: 'government_complaint_action_completed',
      actionType: action.kind,
      actorUserId,
      complaintId,
      status: result.status,
      workflowVersion: result.workflowVersion,
    });
    return result;
  }
}
