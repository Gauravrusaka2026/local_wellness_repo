import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintDraft,
  ComplaintLocationCapture,
  CreateComplaintDraftInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { Clock } from '../common/clock.js';
import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { ComplaintStore } from '../data/complaint.store.js';

@Injectable()
export class ComplaintDraftsService {
  private readonly logger = new Logger(ComplaintDraftsService.name);

  public constructor(
    @Inject(ComplaintStore)
    private readonly complaintStore: ComplaintStore,
    @Inject(Clock)
    private readonly clock: Clock,
  ) {}

  public async createDraft(
    actor: AuthenticatedUser,
    input: CreateComplaintDraftInput,
    idempotencyKey: string,
  ): Promise<ComplaintDraft> {
    if (input.location) {
      this.validateLocationCapture(input.location);
    }
    const draft = await this.complaintStore.createDraft(
      actor.id,
      input,
      createComplaintMutationIdentity(idempotencyKey, 'create-complaint-draft', input),
    );

    this.logger.log({
      event: 'complaint_draft_created_or_replayed',
      actorUserId: actor.id,
      draftId: draft.id,
    });
    return draft;
  }

  public getDraft(actor: AuthenticatedUser, draftId: string): Promise<ComplaintDraft> {
    return this.complaintStore.getDraft(actor.id, draftId);
  }

  public async updateDraft(
    actor: AuthenticatedUser,
    draftId: string,
    input: UpdateComplaintDraftInput,
  ): Promise<ComplaintDraft> {
    if (input.location) {
      this.validateLocationCapture(input.location);
    }
    const { location, ...draftFields } = input;
    let draft =
      Object.keys(draftFields).length > 0
        ? await this.complaintStore.updateDraft(actor.id, draftId, draftFields)
        : await this.complaintStore.getDraft(actor.id, draftId);

    if (location) {
      draft = await this.complaintStore.appendLocation(actor.id, draftId, location);
    } else if (location === null) {
      draft = await this.complaintStore.updateDraft(actor.id, draftId, { location: null });
    }

    this.logger.log({
      event: 'complaint_draft_updated',
      actorUserId: actor.id,
      draftId,
    });
    return draft;
  }

  public async discardDraft(
    actor: AuthenticatedUser,
    draftId: string,
  ): Promise<{ discarded: true }> {
    await this.complaintStore.discardDraft(actor.id, draftId);
    this.logger.log({
      event: 'complaint_draft_discarded',
      actorUserId: actor.id,
      draftId,
    });
    return { discarded: true };
  }

  private validateLocationCapture(input: ComplaintLocationCapture): void {
    const now = this.clock.now().getTime();
    const capturedAt = Date.parse(input.capturedAt);
    const deviceRecordedAt = Date.parse(input.deviceRecordedAt);

    if (capturedAt > now + 120_000 || deviceRecordedAt > now + 120_000) {
      throw ApiException.badRequest(
        'LOCATION_CAPTURED_IN_FUTURE',
        'The location capture time is too far in the future.',
      );
    }

    if (Math.abs(capturedAt - deviceRecordedAt) > 300_000) {
      throw ApiException.badRequest(
        'LOCATION_TIMESTAMP_MISMATCH',
        'The location capture timestamps do not match.',
      );
    }
  }
}
