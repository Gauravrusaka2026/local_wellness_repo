import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser, ComplaintDuplicateCheckResult } from '@local-wellness/types';
import { detectDuplicates } from '@local-wellness/routing-engine';

import { Clock } from '../common/clock.js';
import { ComplaintStore } from '../data/complaint.store.js';

@Injectable()
export class ComplaintDuplicatesService {
  private readonly logger = new Logger(ComplaintDuplicatesService.name);

  public constructor(
    @Inject(ComplaintStore)
    private readonly complaintStore: ComplaintStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async checkDuplicates(
    actor: AuthenticatedUser,
    draftId: string,
  ): Promise<ComplaintDuplicateCheckResult> {
    const checkedAt = this.clock.now().toISOString();
    const evidence = await this.complaintStore.loadDuplicateEvidence(actor.id, draftId, checkedAt);
    const result = detectDuplicates(evidence.input, evidence.candidates, evidence.policy);
    const recorded = await this.complaintStore.recordDuplicateCheck(
      actor.id,
      draftId,
      result,
      evidence,
      checkedAt,
    );

    this.logger.log({
      event: 'complaint_duplicate_check_recorded',
      actorUserId: actor.id,
      draftId,
      candidateCount: evidence.candidates.length,
      suggestionCount: recorded.suggestions.length,
      policyVersionId: recorded.policyVersionId,
    });
    return recorded;
  }
}
