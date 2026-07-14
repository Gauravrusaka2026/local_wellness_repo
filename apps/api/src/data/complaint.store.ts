import type {
  ComplaintDetail,
  ComplaintDraft,
  ComplaintDuplicateCheckResult,
  ComplaintDuplicateSuggestion,
  ComplaintListQuery,
  ComplaintListResult,
  ComplaintLocationCapture,
  ComplaintMedia,
  ComplaintReceipt,
  ComplaintRoutingSummary,
  ComplaintTimeline,
  CreateComplaintDraftInput,
  CreateComplaintMediaUploadIntentInput,
  DuplicateCandidateEvidence,
  DuplicateDetectionInput,
  DuplicateDetectionPolicy,
  DuplicateDetectionResult,
  FinalizeComplaintMediaInput,
  UpdateComplaintDraftInput,
} from '@local-wellness/types';

export interface ComplaintMutationIdentity {
  idempotencyKeyHash: string;
  requestFingerprint: string;
}

export interface ReservedComplaintMedia {
  bucket: string;
  media: ComplaintMedia;
  objectPath: string;
  uploadExpiresAt: string;
}

export interface ComplaintMediaObjectLocator {
  bucket: string;
  objectPath: string;
}

export interface ComplaintDuplicateEvidence {
  candidates: DuplicateCandidateEvidence[];
  input: DuplicateDetectionInput;
  policy: DuplicateDetectionPolicy;
  suggestions: Omit<ComplaintDuplicateSuggestion, 'approximateDistanceMeters' | 'score'>[];
}

export interface ComplaintSubmissionClaim {
  complaintId: string | null;
  response: ComplaintReceipt | null;
  routingRequestId: string;
  state: 'claimed' | 'completed';
  submissionRequestId: string;
}

export interface CompleteComplaintSubmissionInput {
  acknowledgedDuplicateSuggestionIds: string[];
  actorUserId: string;
  categoryId: string;
  emergencyDisclaimerAcknowledged: boolean;
  routing: ComplaintRoutingSummary;
  routingDecisionId: string;
  submissionRequestId: string;
}

export class ComplaintDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Complaint persistence operation failed: ${operation}.`);
    this.name = 'ComplaintDataAccessError';
  }
}

export class ComplaintNotFoundError extends ComplaintDataAccessError {
  public constructor(public readonly resource: 'complaint' | 'draft' | 'media') {
    super(`find ${resource}`);
    this.name = 'ComplaintNotFoundError';
  }
}

export class ComplaintConflictError extends ComplaintDataAccessError {
  public constructor(public readonly marker: string) {
    super('validate complaint lifecycle');
    this.name = 'ComplaintConflictError';
  }
}

export abstract class ComplaintStore {
  public abstract createDraft(
    actorUserId: string,
    input: CreateComplaintDraftInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintDraft>;

  public abstract getDraft(actorUserId: string, draftId: string): Promise<ComplaintDraft>;

  public abstract updateDraft(
    actorUserId: string,
    draftId: string,
    input: UpdateComplaintDraftInput,
  ): Promise<ComplaintDraft>;

  public abstract discardDraft(actorUserId: string, draftId: string): Promise<void>;

  public abstract appendLocation(
    actorUserId: string,
    draftId: string,
    input: ComplaintLocationCapture,
  ): Promise<ComplaintDraft>;

  public abstract reserveMedia(
    actorUserId: string,
    input: CreateComplaintMediaUploadIntentInput,
    identity: ComplaintMutationIdentity,
  ): Promise<ReservedComplaintMedia>;

  public abstract getMedia(actorUserId: string, mediaId: string): Promise<ComplaintMedia>;

  public abstract getMediaObject(
    actorUserId: string,
    mediaId: string,
  ): Promise<ComplaintMediaObjectLocator>;

  public abstract finalizeMedia(
    actorUserId: string,
    mediaId: string,
    input: FinalizeComplaintMediaInput,
  ): Promise<ComplaintMedia>;

  public abstract loadDuplicateEvidence(
    actorUserId: string,
    draftId: string,
    checkedAt: string,
  ): Promise<ComplaintDuplicateEvidence>;

  public abstract recordDuplicateCheck(
    actorUserId: string,
    draftId: string,
    result: DuplicateDetectionResult,
    evidence: ComplaintDuplicateEvidence,
    checkedAt: string,
  ): Promise<ComplaintDuplicateCheckResult>;

  public abstract claimSubmission(
    actorUserId: string,
    draftId: string,
    identity: ComplaintMutationIdentity,
  ): Promise<ComplaintSubmissionClaim>;

  public abstract completeSubmission(
    input: CompleteComplaintSubmissionInput,
  ): Promise<ComplaintReceipt>;

  public abstract listComplaints(
    actorUserId: string,
    query: ComplaintListQuery,
  ): Promise<ComplaintListResult>;

  public abstract getComplaint(actorUserId: string, complaintId: string): Promise<ComplaintDetail>;

  public abstract getTimeline(actorUserId: string, complaintId: string): Promise<ComplaintTimeline>;
}
