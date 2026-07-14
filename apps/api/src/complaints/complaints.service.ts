import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AuthenticatedUser,
  ComplaintDetail,
  ComplaintListQuery,
  ComplaintListResult,
  ComplaintReceipt,
  ComplaintTimeline,
  SubmitComplaintInput,
} from '@local-wellness/types';

import { ApiException } from '../common/api-exception.js';
import { createComplaintMutationIdentity } from '../common/idempotency.js';
import { ComplaintStore } from '../data/complaint.store.js';
import { RoutingService } from '../routing/routing.service.js';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  public constructor(
    @Inject(ComplaintStore)
    private readonly complaintStore: ComplaintStore,
    @Inject(RoutingService)
    private readonly routingService: RoutingService,
  ) {}

  public async submit(
    actor: AuthenticatedUser,
    draftId: string,
    input: SubmitComplaintInput,
    idempotencyKey: string,
  ): Promise<ComplaintReceipt> {
    const identity = createComplaintMutationIdentity(idempotencyKey, 'submit-complaint', {
      draftId,
      input,
    });
    const claim = await this.complaintStore.claimSubmission(actor.id, draftId, identity);

    if (claim.state === 'completed') {
      if (!claim.response) {
        throw new Error('Completed complaint submission is missing its stored response.');
      }

      return claim.response;
    }

    const draft = await this.complaintStore.getDraft(actor.id, draftId);
    if (!draft.categoryId || !draft.location) {
      throw ApiException.conflict(
        'COMPLAINT_INCOMPLETE',
        'A category and verified location are required before submission.',
      );
    }

    const routing = await this.routingService.resolveStoredRouting({
      actor,
      idempotencyKey: claim.routingRequestId,
      input: {
        categoryId: draft.categoryId,
        ...(draft.assetId === null ? {} : { assetId: draft.assetId }),
        latitude: draft.location.latitude,
        longitude: draft.location.longitude,
        accuracyMeters: draft.location.accuracyMeters,
        capturedAt: draft.location.capturedAt,
      },
    });

    if (routing.result.status === 'unsupported_area') {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'COMPLAINT_UNSUPPORTED_AREA',
        'This location is outside the currently verified service area.',
      );
    }

    if (routing.result.status !== 'routed') {
      throw ApiException.dependencyUnavailable(
        'A verified complaint route is not currently available for this location and category.',
      );
    }

    const receipt = await this.complaintStore.completeSubmission({
      acknowledgedDuplicateSuggestionIds: input.acknowledgedDuplicateSuggestionIds ?? [],
      actorUserId: actor.id,
      categoryId: draft.categoryId,
      emergencyDisclaimerAcknowledged: input.emergencyDisclaimerAcknowledged === true,
      routing: routing.result,
      routingDecisionId: routing.decisionId,
      submissionRequestId: claim.submissionRequestId,
    });

    this.logger.log({
      event: 'complaint_submitted',
      actorUserId: actor.id,
      complaintId: receipt.id,
      complaintNumber: receipt.complaintNumber,
      categoryId: receipt.categoryId,
      routingStatus: receipt.routing.status,
    });
    return receipt;
  }

  public listComplaints(
    actor: AuthenticatedUser,
    query: ComplaintListQuery,
  ): Promise<ComplaintListResult> {
    return this.complaintStore.listComplaints(actor.id, query);
  }

  public getComplaint(actor: AuthenticatedUser, complaintId: string): Promise<ComplaintDetail> {
    return this.complaintStore.getComplaint(actor.id, complaintId);
  }

  public getTimeline(actor: AuthenticatedUser, complaintId: string): Promise<ComplaintTimeline> {
    return this.complaintStore.getTimeline(actor.id, complaintId);
  }
}
