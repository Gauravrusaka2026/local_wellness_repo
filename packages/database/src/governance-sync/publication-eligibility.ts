import type {
  GovernanceChangeProposal,
  GovernancePublicationDisposition,
  GovernanceReviewDecision,
} from './contracts.js';
import type { GovernanceSyncRunState } from './lifecycle.js';

export const governancePublicationBlockReasons = [
  'RUN_NOT_APPROVED',
  'REVIEW_NOT_APPROVED',
  'REVIEW_PROPOSAL_MISMATCH',
  'MATCH_CANDIDATE_MISMATCH',
  'REVIEW_ATTRIBUTION_MISSING',
  'REVIEW_VERIFICATION_DECISION_MISMATCH',
  'REVIEW_ROUTING_DECISION_MISMATCH',
  'SNAPSHOT_PROVENANCE_MISSING',
  'VALIDATION_ERROR',
  'AMBIGUOUS_MATCH',
  'UNMATCHED_NORMALIZED_CHANGE',
  'PLACEHOLDER_MARKERS_MUST_AGREE',
  'PLACEHOLDER_MUST_BE_QUARANTINED',
  'PLACEHOLDER_MUST_USE_QUARANTINE_OPERATION',
  'PLACEHOLDER_CANNOT_BE_VERIFIED',
  'PLACEHOLDER_CANNOT_ROUTE',
  'AUTOMATIC_VERIFICATION_FORBIDDEN',
  'VERIFIED_PROVENANCE_INCOMPLETE',
  'ROUTING_REQUIRES_VERIFIED_RECORD',
  'ROUTING_REQUIRES_EXPLICIT_REVIEW',
  'ROUTING_REQUIRES_NORMALIZED_RECORD',
  'NO_CHANGE_TO_PUBLISH',
] as const;

export type GovernancePublicationBlockReason = (typeof governancePublicationBlockReasons)[number];

export interface GovernancePublicationEligibilityInput {
  runState: GovernanceSyncRunState;
  proposal: GovernanceChangeProposal;
  review: GovernanceReviewDecision | null;
  referenceSourceId: string | null;
  recordSpecificSourceUrl: string | null;
  lastVerifiedOn: string | null;
}

export interface GovernancePublicationEligibility {
  eligible: boolean;
  disposition: GovernancePublicationDisposition;
  reasons: GovernancePublicationBlockReason[];
}

const hasReviewAttribution = (review: GovernanceReviewDecision): boolean =>
  review.reviewerId.trim().length > 0 && review.reviewedAt.trim().length > 0;

const hasVerifiedProvenance = (input: GovernancePublicationEligibilityInput): boolean =>
  input.referenceSourceId !== null &&
  input.referenceSourceId.trim().length > 0 &&
  input.recordSpecificSourceUrl !== null &&
  input.recordSpecificSourceUrl.trim().length > 0 &&
  input.lastVerifiedOn !== null &&
  input.lastVerifiedOn.trim().length > 0;

const expectedVerificationDecision = (
  proposal: GovernanceChangeProposal,
): GovernanceReviewDecision['verificationDecision'] => {
  switch (proposal.requestedVerificationStatus) {
    case 'verified':
      return 'mark_verified';
    case 'partially_verified':
      return 'mark_partially_verified';
    case 'placeholder':
      return 'mark_placeholder';
    case 'unverified':
      return 'retain_unverified';
  }
};

const addPlaceholderReasons = (
  input: GovernancePublicationEligibilityInput,
  reasons: GovernancePublicationBlockReason[],
): void => {
  const { proposal, review } = input;
  const hasPlaceholderMarker =
    proposal.candidate.isPlaceholder ||
    proposal.requestedVerificationStatus === 'placeholder' ||
    review?.verificationDecision === 'mark_placeholder';

  if (!hasPlaceholderMarker) {
    return;
  }
  if (!proposal.candidate.isPlaceholder || proposal.requestedVerificationStatus !== 'placeholder') {
    reasons.push('PLACEHOLDER_MARKERS_MUST_AGREE');
  }
  if (proposal.disposition !== 'quarantined') {
    reasons.push('PLACEHOLDER_MUST_BE_QUARANTINED');
  }
  if (proposal.operation !== 'quarantine') {
    reasons.push('PLACEHOLDER_MUST_USE_QUARANTINE_OPERATION');
  }
  if (
    proposal.requestedVerificationStatus === 'verified' ||
    proposal.requestedVerificationStatus === 'partially_verified'
  ) {
    reasons.push('PLACEHOLDER_CANNOT_BE_VERIFIED');
  }
  if (proposal.requestedRoutingEligibility) {
    reasons.push('PLACEHOLDER_CANNOT_ROUTE');
  }
};

const addVerificationReasons = (
  input: GovernancePublicationEligibilityInput,
  reasons: GovernancePublicationBlockReason[],
): void => {
  const { proposal, review } = input;
  if (proposal.requestedVerificationStatus !== 'verified') {
    return;
  }
  if (review?.verificationDecision !== 'mark_verified') {
    reasons.push('AUTOMATIC_VERIFICATION_FORBIDDEN');
  }
  if (!hasVerifiedProvenance(input)) {
    reasons.push('VERIFIED_PROVENANCE_INCOMPLETE');
  }
};

const addRoutingReasons = (
  input: GovernancePublicationEligibilityInput,
  reasons: GovernancePublicationBlockReason[],
): void => {
  const { proposal, review } = input;
  if (!proposal.requestedRoutingEligibility) {
    return;
  }
  if (proposal.requestedVerificationStatus !== 'verified') {
    reasons.push('ROUTING_REQUIRES_VERIFIED_RECORD');
  }
  if (review?.routingEligibilityDecision !== 'enable') {
    reasons.push('ROUTING_REQUIRES_EXPLICIT_REVIEW');
  }
  if (proposal.disposition !== 'normalized') {
    reasons.push('ROUTING_REQUIRES_NORMALIZED_RECORD');
  }
};

export const evaluateGovernancePublicationEligibility = (
  input: GovernancePublicationEligibilityInput,
): GovernancePublicationEligibility => {
  const reasons: GovernancePublicationBlockReason[] = [];
  const { proposal, review } = input;

  if (input.runState !== 'approved') {
    reasons.push('RUN_NOT_APPROVED');
  }
  if (proposal.match.candidateId !== proposal.candidate.id) {
    reasons.push('MATCH_CANDIDATE_MISMATCH');
  }
  if (review?.status !== 'approved') {
    reasons.push('REVIEW_NOT_APPROVED');
  } else {
    if (review.changeProposalId !== proposal.id) {
      reasons.push('REVIEW_PROPOSAL_MISMATCH');
    }
    if (!hasReviewAttribution(review)) {
      reasons.push('REVIEW_ATTRIBUTION_MISSING');
    }
    if (review.verificationDecision !== expectedVerificationDecision(proposal)) {
      reasons.push('REVIEW_VERIFICATION_DECISION_MISMATCH');
    }
    const expectedRoutingDecision = proposal.requestedRoutingEligibility
      ? 'enable'
      : 'retain_disabled';
    if (review.routingEligibilityDecision !== expectedRoutingDecision) {
      reasons.push('REVIEW_ROUTING_DECISION_MISMATCH');
    }
  }
  if (
    proposal.candidate.snapshotId.trim().length === 0 ||
    proposal.candidate.sourceRecordLocator.trim().length === 0
  ) {
    reasons.push('SNAPSHOT_PROVENANCE_MISSING');
  }
  if (proposal.candidate.validationIssues.some(({ severity }) => severity === 'error')) {
    reasons.push('VALIDATION_ERROR');
  }
  if (proposal.match.status === 'ambiguous' && proposal.disposition !== 'quarantined') {
    reasons.push('AMBIGUOUS_MATCH');
  }
  if (proposal.match.status === 'unmatched' && proposal.disposition === 'normalized') {
    reasons.push('UNMATCHED_NORMALIZED_CHANGE');
  }
  if (proposal.operation === 'no_change') {
    reasons.push('NO_CHANGE_TO_PUBLISH');
  }

  addPlaceholderReasons(input, reasons);
  addVerificationReasons(input, reasons);
  addRoutingReasons(input, reasons);

  return {
    eligible: reasons.length === 0,
    disposition: proposal.disposition,
    reasons,
  };
};
