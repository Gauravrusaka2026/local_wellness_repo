import type {
  JurisdictionResolution,
  RoutingCandidate,
  RoutingCandidateEvaluation,
  RoutingConfidence,
  RoutingDecision,
  RoutingPolicy,
  RoutingResolutionInput,
  RoutingTarget,
} from '@local-wellness/types';

import { scoreRoutingCandidate } from './confidence.js';
import { RoutingConfigurationError } from './errors.js';
import { evaluateRoutingEligibility } from './eligibility.js';

const emptyConfidence = (): RoutingConfidence => ({
  score: 0,
  band: 'none',
  factors: [],
});

const targetsAreEqual = (left: RoutingTarget, right: RoutingTarget): boolean =>
  left.authorityId === right.authorityId &&
  left.localBodyId === right.localBodyId &&
  left.wardId === right.wardId &&
  left.departmentId === right.departmentId &&
  left.authorityDepartmentId === right.authorityDepartmentId &&
  left.officerRoleId === right.officerRoleId &&
  left.officerAssignmentId === right.officerAssignmentId &&
  left.assetTypeId === right.assetTypeId &&
  left.assetId === right.assetId &&
  left.assetVersionId === right.assetVersionId &&
  left.assetMatchDistanceMeters === right.assetMatchDistanceMeters &&
  left.assetOwnershipVersionId === right.assetOwnershipVersionId;

interface EvaluatedCandidate {
  candidate: RoutingCandidate;
  evaluation: RoutingCandidateEvaluation;
}

const candidateSpecificity = (candidate: RoutingCandidate): number => {
  if (candidate.target.assetId !== null || candidate.target.assetOwnershipVersionId !== null) {
    return 2;
  }
  if (candidate.target.wardId !== null) {
    return 1;
  }
  return 0;
};

const compareEvaluatedCandidates = (
  left: EvaluatedCandidate,
  right: EvaluatedCandidate,
): number => {
  if (left.evaluation.eligible !== right.evaluation.eligible) {
    return left.evaluation.eligible ? -1 : 1;
  }
  if (left.candidate.fallbackDepth !== right.candidate.fallbackDepth) {
    return left.candidate.fallbackDepth - right.candidate.fallbackDepth;
  }
  const specificityDifference =
    candidateSpecificity(right.candidate) - candidateSpecificity(left.candidate);
  if (specificityDifference !== 0) {
    return specificityDifference;
  }
  if (left.candidate.priority !== right.candidate.priority) {
    return left.candidate.priority - right.candidate.priority;
  }
  if (left.evaluation.confidence.score !== right.evaluation.confidence.score) {
    return right.evaluation.confidence.score - left.evaluation.confidence.score;
  }
  return left.candidate.candidateId.localeCompare(right.candidate.candidateId);
};

const unresolvedDecision = (
  status: RoutingDecision['status'],
  reason: string,
  input: RoutingResolutionInput,
  jurisdiction: JurisdictionResolution,
  policy: RoutingPolicy,
  evaluated: readonly EvaluatedCandidate[],
  selected: EvaluatedCandidate | null,
  ambiguousCandidateIds: readonly string[] = [],
): RoutingDecision => ({
  status,
  categoryId: input.categoryId,
  target: null,
  routingRuleId: null,
  routingRuleVersionId: null,
  confidence: selected?.evaluation.confidence ?? emptyConfidence(),
  explanation: {
    reason,
    policyId: policy.id,
    policyVersionId: policy.versionId,
    policyVersion: policy.version,
    jurisdiction,
    selectedCandidateId: selected?.candidate.candidateId ?? null,
    selectedRoutingRuleId: selected?.candidate.routingRuleId ?? null,
    selectedRoutingRuleVersionId: selected?.candidate.routingRuleVersionId ?? null,
    fallbackUsed: (selected?.candidate.fallbackDepth ?? 0) > 0,
    fallbackPath: selected?.candidate.fallbackPath ?? [],
    ambiguousCandidateIds: [...ambiguousCandidateIds],
    candidateEvaluations: evaluated.map(({ evaluation }) => evaluation),
  },
});

export const evaluateRoutingCandidates = (
  input: RoutingResolutionInput,
  jurisdiction: JurisdictionResolution,
  candidates: readonly RoutingCandidate[],
  policy: RoutingPolicy,
): RoutingDecision => {
  const candidateIds = new Set<string>();
  const evaluated = candidates.map((candidate): EvaluatedCandidate => {
    if (!candidate.candidateId || candidateIds.has(candidate.candidateId)) {
      throw new RoutingConfigurationError('Routing candidate identifiers must be unique.');
    }
    candidateIds.add(candidate.candidateId);

    const confidence = scoreRoutingCandidate(candidate, policy);
    const eligibility = evaluateRoutingEligibility(input, jurisdiction, candidate);
    const rejectionReasons = [...eligibility.rejectionReasons];

    if (!Number.isSafeInteger(candidate.priority) || candidate.priority < 0) {
      rejectionReasons.push('invalid_priority');
    }
    if (
      candidate.fallbackPath.includes(candidate.routingRuleId) ||
      new Set(candidate.fallbackPath).size !== candidate.fallbackPath.length
    ) {
      rejectionReasons.push('fallback_cycle');
    }

    for (const factor of confidence.factors) {
      if (factor.required && !factor.matched) {
        rejectionReasons.push(`required_confidence_signal_missing:${factor.code}`);
      }
    }

    const normalizedRejections = [...new Set(rejectionReasons)].sort();
    return {
      candidate,
      evaluation: {
        candidateId: candidate.candidateId,
        routingRuleId: candidate.routingRuleId,
        routingRuleVersionId: candidate.routingRuleVersionId,
        explanationCode: candidate.explanationCode,
        sourceReferenceId: candidate.sourceReferenceId,
        target: candidate.target,
        eligible: normalizedRejections.length === 0,
        rejectionReasons: normalizedRejections,
        fallbackDepth: candidate.fallbackDepth,
        confidence,
      },
    };
  });
  evaluated.sort(compareEvaluatedCandidates);

  const eligible = evaluated.filter(({ evaluation }) => evaluation.eligible);
  const selected = eligible[0] ?? null;

  if (!selected) {
    return unresolvedDecision(
      'mapping_required',
      'no_eligible_candidate',
      input,
      jurisdiction,
      policy,
      evaluated,
      null,
    );
  }

  if (selected.evaluation.confidence.score < policy.manualReviewThreshold) {
    return unresolvedDecision(
      'mapping_required',
      'confidence_below_manual_review_threshold',
      input,
      jurisdiction,
      policy,
      evaluated,
      selected,
    );
  }

  const competingTargets = eligible
    .slice(1)
    .filter(
      ({ candidate, evaluation }) =>
        candidate.fallbackDepth === selected.candidate.fallbackDepth &&
        candidateSpecificity(candidate) === candidateSpecificity(selected.candidate) &&
        candidate.priority === selected.candidate.priority &&
        !targetsAreEqual(selected.candidate.target, candidate.target) &&
        selected.evaluation.confidence.score - evaluation.confidence.score <= policy.ambiguityDelta,
    );

  if (competingTargets.length > 0) {
    return unresolvedDecision(
      'manual_review',
      'ambiguous_candidate_scores',
      input,
      jurisdiction,
      policy,
      evaluated,
      selected,
      [
        selected.candidate.candidateId,
        ...competingTargets.map(({ candidate }) => candidate.candidateId),
      ],
    );
  }

  if (selected.evaluation.confidence.score < policy.automaticThreshold) {
    return unresolvedDecision(
      'manual_review',
      'confidence_requires_manual_review',
      input,
      jurisdiction,
      policy,
      evaluated,
      selected,
    );
  }

  return {
    status: 'routed',
    categoryId: input.categoryId,
    target: selected.candidate.target,
    routingRuleId: selected.candidate.routingRuleId,
    routingRuleVersionId: selected.candidate.routingRuleVersionId,
    confidence: selected.evaluation.confidence,
    explanation: {
      reason: 'route_resolved',
      policyId: policy.id,
      policyVersionId: policy.versionId,
      policyVersion: policy.version,
      jurisdiction,
      selectedCandidateId: selected.candidate.candidateId,
      selectedRoutingRuleId: selected.candidate.routingRuleId,
      selectedRoutingRuleVersionId: selected.candidate.routingRuleVersionId,
      fallbackUsed: selected.candidate.fallbackDepth > 0,
      fallbackPath: selected.candidate.fallbackPath,
      ambiguousCandidateIds: [],
      candidateEvaluations: evaluated.map(({ evaluation }) => evaluation),
    },
  };
};
