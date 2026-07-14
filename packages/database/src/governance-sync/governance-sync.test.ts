import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GovernanceChangeProposal, GovernanceReviewDecision } from './contracts.js';
import {
  allowedGovernanceSyncRunTransitions,
  canTransitionGovernanceSyncRun,
  GovernanceSyncLifecycleError,
  isTerminalGovernanceSyncRunState,
  transitionGovernanceSyncRun,
} from './lifecycle.js';
import { evaluateGovernancePublicationEligibility } from './publication-eligibility.js';

const approvedReview = (
  overrides: Partial<GovernanceReviewDecision> = {},
): GovernanceReviewDecision => ({
  id: 'review-1',
  changeProposalId: 'proposal-1',
  status: 'approved',
  reviewerId: 'reviewer-1',
  reviewedAt: '2026-07-13T10:00:00.000Z',
  notes: 'Reviewed against the record-specific official source.',
  verificationDecision: 'mark_verified',
  routingEligibilityDecision: 'enable',
  ...overrides,
});

const proposal = (overrides: Partial<GovernanceChangeProposal> = {}): GovernanceChangeProposal => ({
  id: 'proposal-1',
  changeSetId: 'change-set-1',
  candidate: {
    id: 'candidate-1',
    runId: 'run-1',
    snapshotId: 'snapshot-1',
    sourceEntityKey: 'official-id:123',
    sourceRecordLocator: 'rows/123',
    entityType: 'local_body',
    normalizedPayload: { name: 'Example Municipal Corporation' },
    isPlaceholder: false,
    claimedVerificationStatus: 'Official',
    claimedLastVerifiedOn: '2026-07-13',
    validationIssues: [],
  },
  match: {
    candidateId: 'candidate-1',
    status: 'matched',
    method: 'official_identifier',
    targetRecordId: 'local-body-1',
    alternativeTargetRecordIds: [],
    confidence: 1,
    evidence: { officialIdentifier: '123' },
  },
  operation: 'update',
  disposition: 'normalized',
  currentRecord: { name: 'Example Municipal Council' },
  proposedRecord: { name: 'Example Municipal Corporation' },
  requestedVerificationStatus: 'verified',
  requestedRoutingEligibility: true,
  reviewRequired: true,
  ...overrides,
});

const eligibleInput = (changeProposal = proposal()) => ({
  runState: 'approved' as const,
  proposal: changeProposal,
  review: approvedReview(),
  referenceSourceId: 'reference-source-1',
  recordSpecificSourceUrl: 'https://example.gov.in/entities/123',
  lastVerifiedOn: '2026-07-13',
});

describe('governance synchronization lifecycle', () => {
  it('permits only the review-gated happy path', () => {
    const happyPath = [
      'queued',
      'retrieving',
      'snapshot_preserved',
      'normalizing',
      'matching',
      'detecting_changes',
      'awaiting_review',
      'approved',
      'publishing',
      'published',
    ] as const;

    for (let index = 1; index < happyPath.length; index += 1) {
      const current = happyPath[index - 1];
      const next = happyPath[index];
      assert.ok(current);
      assert.ok(next);
      assert.equal(canTransitionGovernanceSyncRun(current, next), true);
      assert.equal(transitionGovernanceSyncRun(current, next), next);
    }

    assert.equal(isTerminalGovernanceSyncRunState('published'), true);
    assert.deepEqual(allowedGovernanceSyncRunTransitions('published'), []);
  });

  it('rejects skipped snapshot and review stages', () => {
    assert.equal(canTransitionGovernanceSyncRun('retrieving', 'normalizing'), false);
    assert.equal(canTransitionGovernanceSyncRun('detecting_changes', 'publishing'), false);
    assert.throws(
      () => transitionGovernanceSyncRun('awaiting_review', 'publishing'),
      (error: unknown) =>
        error instanceof GovernanceSyncLifecycleError &&
        error.message ===
          'Governance sync run cannot transition from awaiting_review to publishing.',
    );
  });

  it('makes rejected and failed runs terminal so retries require a new run', () => {
    assert.equal(transitionGovernanceSyncRun('awaiting_review', 'rejected'), 'rejected');
    assert.equal(transitionGovernanceSyncRun('normalizing', 'failed'), 'failed');
    assert.equal(isTerminalGovernanceSyncRunState('rejected'), true);
    assert.equal(isTerminalGovernanceSyncRunState('failed'), true);
    assert.equal(canTransitionGovernanceSyncRun('failed', 'queued'), false);
  });
});

describe('governance publication eligibility', () => {
  it('allows a reviewed, record-specific, verified and routing-enabled change', () => {
    assert.deepEqual(evaluateGovernancePublicationEligibility(eligibleInput()), {
      eligible: true,
      disposition: 'normalized',
      reasons: [],
    });
  });

  it('allows placeholder evidence only when it remains quarantined and non-routable', () => {
    const placeholderProposal = proposal({
      candidate: {
        ...proposal().candidate,
        isPlaceholder: true,
        claimedVerificationStatus: 'Placeholder',
      },
      match: {
        ...proposal().match,
        status: 'unmatched',
        method: 'none',
        targetRecordId: null,
      },
      operation: 'quarantine',
      disposition: 'quarantined',
      requestedVerificationStatus: 'placeholder',
      requestedRoutingEligibility: false,
    });

    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(placeholderProposal),
      review: approvedReview({
        verificationDecision: 'mark_placeholder',
        routingEligibilityDecision: 'retain_disabled',
      }),
      referenceSourceId: null,
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    });

    assert.equal(result.eligible, true);
    assert.equal(result.disposition, 'quarantined');
    assert.deepEqual(result.reasons, []);
  });

  it('blocks every attempt to verify or route a placeholder normalized record', () => {
    const placeholderProposal = proposal({
      candidate: { ...proposal().candidate, isPlaceholder: true },
    });
    const result = evaluateGovernancePublicationEligibility(eligibleInput(placeholderProposal));

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'PLACEHOLDER_MARKERS_MUST_AGREE',
      'PLACEHOLDER_MUST_BE_QUARANTINED',
      'PLACEHOLDER_MUST_USE_QUARANTINE_OPERATION',
      'PLACEHOLDER_CANNOT_BE_VERIFIED',
      'PLACEHOLDER_CANNOT_ROUTE',
    ]);
  });

  it('requires placeholder candidates to retain placeholder status', () => {
    const placeholderProposal = proposal({
      candidate: { ...proposal().candidate, isPlaceholder: true },
      operation: 'quarantine',
      disposition: 'quarantined',
      requestedVerificationStatus: 'partially_verified',
      requestedRoutingEligibility: false,
    });
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(placeholderProposal),
      review: approvedReview({
        verificationDecision: 'mark_partially_verified',
        routingEligibilityDecision: 'retain_disabled',
      }),
      referenceSourceId: null,
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'PLACEHOLDER_MARKERS_MUST_AGREE',
      'PLACEHOLDER_CANNOT_BE_VERIFIED',
    ]);
  });

  it('does not allow placeholder status without a placeholder candidate marker', () => {
    const mismatchedProposal = proposal({
      operation: 'quarantine',
      disposition: 'quarantined',
      requestedVerificationStatus: 'placeholder',
      requestedRoutingEligibility: false,
    });
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(mismatchedProposal),
      review: approvedReview({
        verificationDecision: 'mark_placeholder',
        routingEligibilityDecision: 'retain_disabled',
      }),
      referenceSourceId: null,
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, ['PLACEHOLDER_MARKERS_MUST_AGREE']);
  });

  it('requires both quarantine disposition and quarantine operation for placeholders', () => {
    const placeholderProposal = proposal({
      candidate: { ...proposal().candidate, isPlaceholder: true },
      operation: 'quarantine',
      disposition: 'quarantined',
      requestedVerificationStatus: 'placeholder',
      requestedRoutingEligibility: false,
    });
    const eligibilityInput = {
      ...eligibleInput(placeholderProposal),
      review: approvedReview({
        verificationDecision: 'mark_placeholder' as const,
        routingEligibilityDecision: 'retain_disabled' as const,
      }),
      referenceSourceId: null,
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    };

    const normalizedResult = evaluateGovernancePublicationEligibility({
      ...eligibilityInput,
      proposal: { ...placeholderProposal, disposition: 'normalized' },
    });
    const updateResult = evaluateGovernancePublicationEligibility({
      ...eligibilityInput,
      proposal: { ...placeholderProposal, operation: 'update' },
    });

    assert.deepEqual(normalizedResult.reasons, ['PLACEHOLDER_MUST_BE_QUARANTINED']);
    assert.deepEqual(updateResult.reasons, ['PLACEHOLDER_MUST_USE_QUARANTINE_OPERATION']);
  });

  it('requires placeholder review decisions to preserve quarantine and disabled routing', () => {
    const placeholderProposal = proposal({
      candidate: {
        ...proposal().candidate,
        isPlaceholder: true,
        claimedVerificationStatus: 'Placeholder',
      },
      match: {
        ...proposal().match,
        status: 'unmatched',
        method: 'none',
        targetRecordId: null,
      },
      operation: 'quarantine',
      disposition: 'quarantined',
      requestedVerificationStatus: 'placeholder',
      requestedRoutingEligibility: false,
    });
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(placeholderProposal),
      review: approvedReview({
        verificationDecision: 'mark_partially_verified',
        routingEligibilityDecision: 'enable',
      }),
      referenceSourceId: null,
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'REVIEW_VERIFICATION_DECISION_MISMATCH',
      'REVIEW_ROUTING_DECISION_MISMATCH',
    ]);
  });

  it('blocks automatic verification and incomplete record-specific provenance', () => {
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(),
      review: approvedReview({ verificationDecision: 'retain_unverified' }),
      recordSpecificSourceUrl: null,
      lastVerifiedOn: null,
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'REVIEW_VERIFICATION_DECISION_MISMATCH',
      'AUTOMATIC_VERIFICATION_FORBIDDEN',
      'VERIFIED_PROVENANCE_INCOMPLETE',
    ]);
  });

  it('blocks invalid or ambiguous data from normalized publication', () => {
    const ambiguousProposal = proposal({
      candidate: {
        ...proposal().candidate,
        validationIssues: [
          {
            code: 'MALFORMED_IDENTIFIER',
            severity: 'error',
            message: 'Official identifier is malformed.',
            field: 'lgdCode',
          },
        ],
      },
      match: {
        ...proposal().match,
        status: 'ambiguous',
        alternativeTargetRecordIds: ['local-body-2'],
      },
    });
    const result = evaluateGovernancePublicationEligibility(eligibleInput(ambiguousProposal));

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, ['VALIDATION_ERROR', 'AMBIGUOUS_MATCH']);
  });

  it('requires approved lifecycle state, review attribution, and snapshot provenance', () => {
    const incompleteProposal = proposal({
      candidate: {
        ...proposal().candidate,
        snapshotId: '',
        sourceRecordLocator: '',
      },
      requestedVerificationStatus: 'unverified',
      requestedRoutingEligibility: false,
    });
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(incompleteProposal),
      runState: 'awaiting_review',
      review: approvedReview({
        reviewerId: '',
        reviewedAt: '',
        verificationDecision: 'retain_unverified',
        routingEligibilityDecision: 'retain_disabled',
      }),
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'RUN_NOT_APPROVED',
      'REVIEW_ATTRIBUTION_MISSING',
      'SNAPSHOT_PROVENANCE_MISSING',
    ]);
  });

  it('does not accept approval recorded for a different proposal', () => {
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(),
      review: approvedReview({ changeProposalId: 'proposal-2' }),
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, ['REVIEW_PROPOSAL_MISMATCH']);
  });

  it('does not accept matching evidence produced for a different candidate', () => {
    const mismatchedProposal = proposal({
      match: {
        ...proposal().match,
        candidateId: 'candidate-2',
      },
    });
    const result = evaluateGovernancePublicationEligibility(eligibleInput(mismatchedProposal));

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, ['MATCH_CANDIDATE_MISMATCH']);
  });

  it('requires review decisions to match the proposed verification and routing state', () => {
    const unverifiedProposal = proposal({
      requestedVerificationStatus: 'unverified',
      requestedRoutingEligibility: false,
    });
    const result = evaluateGovernancePublicationEligibility({
      ...eligibleInput(unverifiedProposal),
      review: approvedReview(),
    });

    assert.equal(result.eligible, false);
    assert.deepEqual(result.reasons, [
      'REVIEW_VERIFICATION_DECISION_MISMATCH',
      'REVIEW_ROUTING_DECISION_MISMATCH',
    ]);
  });
});
